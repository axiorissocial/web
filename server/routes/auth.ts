import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { getRandomGradientId } from '@shared/profileGradients';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_SCOPE = 'read:user user:email';
const GITHUB_USER_AGENT = process.env.GITHUB_USER_AGENT || 'HubbleApp';

const buildGithubCallbackUrl = (req: Request): string => {
  // Prefer an explicit environment override (recommended for production)
  if (process.env.GITHUB_CALLBACK_URL) {
    return process.env.GITHUB_CALLBACK_URL;
  }

  // Next prefer the configured FRONTEND_URL so the callback is deterministic
  if (process.env.FRONTEND_URL) {
    return `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api/auth/github/callback`;
  }

  // Last resort: derive from the incoming request (useful for local dev)
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0];
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost';
  const derived = `${proto}://${host}/api/auth/github/callback`;
  console.warn('Derived GitHub callback URL from request:', derived, '— consider setting GITHUB_CALLBACK_URL or FRONTEND_URL in production');
  return derived;
};

const ensureGithubConfigured = () => Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const allowedReturnPath = (value?: string | null) => {
  if (!value) {
    return '/';
  }

  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const parsed = new URL(value);
      const frontendOrigin = new URL(FRONTEND_URL).origin;
      if (parsed.origin === frontendOrigin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
      }
      return '/';
    }

    if (value.startsWith('/')) {
      return value;
    }
  } catch (error) {
    console.warn('Invalid returnTo provided, defaulting to /:', error);
  }

  return '/';
};

const createFrontendRedirectUrl = (returnTo: string | null | undefined, params: Record<string, string | undefined>) => {
  const targetPath = allowedReturnPath(returnTo);
  const url = new URL(targetPath, FRONTEND_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const setSessionUser = (req: Request, user: { id: string; username: string; email: string; isAdmin?: boolean }) => {
  req.session.userId = user.id;
  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
  };
  (req.session.user as any).isAdmin = Boolean(user.isAdmin);
};

const generateUniqueUsername = async (base: string): Promise<string> => {
  const sanitizedBase = base.toLowerCase().replace(/[^a-z0-9.]/g, '') || 'githubuser';
  let candidate = sanitizedBase;
  let suffix = 0;

  while (suffix < 5000) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) {
      return candidate;
    }
    suffix += 1;
    candidate = `${sanitizedBase}${suffix}`;
  }

  return `${sanitizedBase}${randomToken(3)}`;
};

const createRandomPasswordHash = async () => {
  const secret = randomToken(32);
  return bcrypt.hash(secret, 12);
};

const provider = 'github' as const;

router.get('/auth/github', (req: Request, res: Response) => {
  if (!ensureGithubConfigured()) {
    return res.status(503).json({ message: 'GitHub OAuth is not configured' });
  }

  const mode = req.query.mode === 'link' ? 'link' : 'login';
  if (mode === 'link' && !req.session.userId) {
    return res.status(401).json({ message: 'You must be logged in to link accounts' });
  }

  const state = randomToken(16);
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : null;
  req.session.oauthState = {
    provider,
    state,
    mode,
    userId: req.session.userId ?? null,
    returnTo,
  };

  const redirectUri = buildGithubCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: GITHUB_SCOPE,
    state,
    allow_signup: 'true',
    redirect_uri: redirectUri,
  });

  req.session.save((err) => {
    if (err) {
      console.error('Failed to persist OAuth state:', err);
      return res.status(500).json({ message: 'Failed to initiate GitHub authentication' });
    }
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });
});

router.get('/auth/github/callback', async (req: Request, res: Response) => {
  const sessionState = req.session.oauthState;
  const stateParam = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';

  const redirectWithStatus = (status: 'success' | 'linked' | 'unlinked' | 'error' | 'username_conflict', message?: string) => {
    const redirectUrl = createFrontendRedirectUrl(sessionState?.returnTo, {
      authProvider: provider,
      authStatus: status,
      authMessage: message,
    });
    return res.redirect(redirectUrl);
  };

  if (!ensureGithubConfigured()) {
    return redirectWithStatus('error', 'github_not_configured');
  }

  if (!sessionState || sessionState.provider !== provider || !stateParam || sessionState.state !== stateParam) {
    return redirectWithStatus('error', 'invalid_oauth_state');
  }

  delete req.session.oauthState;

  if (!code) {
    return redirectWithStatus('error', 'missing_code');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: buildGithubCallbackUrl(req),
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed with status ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json() as { access_token?: string; scope?: string; token_type?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(`GitHub token exchange failed: ${tokenData.error ?? 'unknown_error'}`);
    }

    const accessToken = tokenData.access_token;
    const githubHeaders = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': GITHUB_USER_AGENT,
    } satisfies Record<string, string>;

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: githubHeaders,
    });

    if (!profileResponse.ok) {
      throw new Error(`GitHub profile request failed with status ${profileResponse.status}`);
    }

    const profile = await profileResponse.json() as {
      id: number;
      login?: string;
      name?: string;
      email?: string;
      avatar_url?: string;
      html_url?: string;
      bio?: string;
      blog?: string;
      company?: string;
    };

    if (!profile || typeof profile.id !== 'number') {
      throw new Error('Invalid GitHub profile response');
    }

    let emails: Array<{ email: string; verified: boolean; primary: boolean }> = [];
    try {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: githubHeaders,
      });
      if (emailsResponse.ok) {
        const json = await emailsResponse.json();
        if (Array.isArray(json)) {
          emails = json.filter((entry): entry is { email: string; verified: boolean; primary: boolean } => typeof entry?.email === 'string');
        }
      }
    } catch (error) {
      console.warn('Failed to fetch GitHub user emails:', error);
    }

    const primaryEmail = emails.find(item => item.primary && item.verified)
      ?? emails.find(item => item.primary)
      ?? emails.find(item => item.verified)
      ?? emails[0];

    let email = primaryEmail?.email ?? (typeof profile.email === 'string' ? profile.email : null);
    const emailVerified = Boolean(primaryEmail?.verified);
    if (!email) {
      email = `github_${profile.id}@users.noreply.github.com`;
    }

    const providerAccountId = String(profile.id);

  const existingAccount = await (prisma as any).oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isAdmin: true,
          },
        },
      },
    });

    const accountData = {
      provider,
      providerAccountId,
      username: profile.login ?? null,
      displayName: profile.name ?? null,
      profileUrl: profile.html_url ?? null,
      avatarUrl: profile.avatar_url ?? null,
      accessToken,
      scope: tokenData.scope ?? GITHUB_SCOPE,
      tokenExpiresAt: null as Date | null,
    };

    if (sessionState.mode === 'link') {
      if (!sessionState.userId) {
        return redirectWithStatus('error', 'missing_session_user');
      }

      if (existingAccount && existingAccount.userId !== sessionState.userId) {
        return redirectWithStatus('error', 'already_linked_elsewhere');
      }

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: sessionState.userId! }, select: { id: true } });
        if (!user) {
          throw new Error('User not found for linking');
        }

        await (tx as any).oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            }
          },
          update: {
            username: accountData.username,
            displayName: accountData.displayName,
            profileUrl: accountData.profileUrl,
            avatarUrl: accountData.avatarUrl,
            accessToken: accountData.accessToken,
            scope: accountData.scope,
            updatedAt: new Date(),
            userId: sessionState.userId!,
          },
          create: {
            provider,
            providerAccountId,
            username: accountData.username,
            displayName: accountData.displayName,
            profileUrl: accountData.profileUrl,
            avatarUrl: accountData.avatarUrl,
            accessToken: accountData.accessToken,
            scope: accountData.scope,
            userId: sessionState.userId!,
          }
        });
      });

      return redirectWithStatus('linked');
    }

    if (existingAccount?.user) {
      setSessionUser(req, existingAccount.user);
      await (prisma as any).oAuthAccount.update({
        where: { id: existingAccount.id },
        data: {
          username: accountData.username,
          displayName: accountData.displayName,
          profileUrl: accountData.profileUrl,
          avatarUrl: accountData.avatarUrl,
          accessToken: accountData.accessToken,
          scope: accountData.scope,
          updatedAt: new Date(),
        }
      });

      await prisma.user.update({
        where: { id: existingAccount.user.id },
        data: { lastLogin: new Date() }
      });

      await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve(null)));
      return redirectWithStatus('success');
    }

    let targetUser: { id: string; username: string; email: string; isAdmin: boolean } | null = null;
    if (email) {
      targetUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      });
    }

    if (!targetUser) {
      const baseUsername = profile.login ?? profile.name ?? `github${profile.id}`;
      
      const existingUserWithUsername = await prisma.user.findUnique({
        where: { username: baseUsername },
        select: { id: true }
      });

      if (existingUserWithUsername) {
        (req.session as any).githubSignupData = {
          profile,
          accountData,
          email,
          emailVerified,
          baseUsername,
          returnTo: sessionState.returnTo
        };
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve(null)));
        return redirectWithStatus('username_conflict', baseUsername);
      }

      const hashedPassword = await createRandomPasswordHash();
      const avatarGradient = getRandomGradientId();
      let bannerGradient = getRandomGradientId();
      if (bannerGradient === avatarGradient) {
        bannerGradient = getRandomGradientId();
      }

      targetUser = await prisma.user.create({
        data: {
          username: baseUsername,
          email,
          password: hashedPassword,
          isVerified: emailVerified,
          emailVerifiedAt: emailVerified ? new Date() : null,
          lastLogin: new Date(),
          profile: {
            create: {
              displayName: profile.name ?? baseUsername,
              avatarGradient,
              bannerGradient,
            }
          },
        } as any,
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          lastLogin: new Date(),
          emailVerifiedAt: emailVerified ? (targetUser as any).emailVerifiedAt ?? new Date() : (targetUser as any).emailVerifiedAt,
        } as any,
      });
    }

    await (prisma as any).oAuthAccount.create({
      data: {
        provider,
        providerAccountId,
        username: accountData.username,
        displayName: accountData.displayName,
        profileUrl: accountData.profileUrl,
        avatarUrl: accountData.avatarUrl,
        accessToken: accountData.accessToken,
        scope: accountData.scope,
        userId: targetUser!.id,
      }
    });

    setSessionUser(req, targetUser!);
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve(null)));
    return redirectWithStatus('success');

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return redirectWithStatus('error', 'github_oauth_failed');
  }
});

router.get('/auth/providers', requireAuth, async (req: Request, res: Response) => {
  try {
    const accounts = await (prisma as any).oAuthAccount.findMany({
      where: { userId: req.session.userId! },
      select: {
        provider: true,
        username: true,
        profileUrl: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    res.json({ providers: accounts });
  } catch (error) {
    console.error('Failed to load linked providers:', error);
    res.status(500).json({ message: 'Failed to load linked providers' });
  }
});

router.delete('/auth/providers/:provider', requireAuth, async (req: Request, res: Response) => {
  const providerParam = String(req.params.provider || '').toLowerCase();

  if (providerParam !== provider) {
    return res.status(400).json({ message: 'Unsupported provider' });
  }

  try {
    const linkedAccounts: Array<{ id: string; provider: string }> = await (prisma as any).oAuthAccount.findMany({
      where: { userId: req.session.userId! },
      select: { id: true, provider: true },
    });

    if (!linkedAccounts.some((account) => account.provider === provider)) {
      return res.status(404).json({ message: 'Provider not linked' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId! },
      select: { password: true },
    });

    const otherProviders = linkedAccounts.filter((account) => account.provider !== provider);
    if (!user?.password && otherProviders.length === 0) {
      return res.status(400).json({ message: 'Cannot unlink the only sign-in method' });
    }

    await (prisma as any).oAuthAccount.deleteMany({
      where: {
        userId: req.session.userId!,
        provider,
      }
    });

    res.json({ message: 'Provider unlinked successfully' });
  } catch (error) {
    console.error('Failed to unlink provider:', error);
    res.status(500).json({ message: 'Failed to unlink provider' });
  }
});

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      username: string;
      email: string;
    };
    viewedPosts?: Record<string, number>;
    oauthState?: {
      provider: 'github';
      state: string;
      mode: 'login' | 'link';
      userId?: string | null;
      returnTo?: string | null;
    };
  }
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const usernameRegex = /^[a-zA-Z0-9.]+$/;
    if (!usernameRegex.test(name)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, and periods' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: name }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const avatarGradient = getRandomGradientId();
    let bannerGradient = getRandomGradientId();
    while (bannerGradient === avatarGradient) {
      bannerGradient = getRandomGradientId();
    }

    const user = await prisma.user.create({
      data: {
        username: name,
        email,
        password: hashedPassword,
        profile: {
          create: {
            displayName: name,
            avatarGradient,
            bannerGradient
          } as any
        },
        settings: {
          create: {
            language: 'en',
            theme: 'dark'
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            displayName: true,
            avatarGradient: true,
            bannerGradient: true
          } as any
        }
      }
    });

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    (req.session.user as any).isAdmin = user.isAdmin ?? false;

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
        profile: (user as any).profile
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: email }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        password: true,
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    (req.session.user as any).isAdmin = user.isAdmin ?? false;

    if (remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        level: true,
        isVerified: true,
        isAdmin: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            avatar: true,
            location: true,
            website: true,
            banner: true,
            avatarGradient: true,
            bannerGradient: true
          } as any
        }
      }
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'User not found' });
    }

    if (req.session.user) {
      (req.session.user as any).isAdmin = user.isAdmin;
    }

    res.json({ user });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/check-username', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const usernameRegex = /^[a-zA-Z0-9.]+$/;
    if (!usernameRegex.test(username)) {
      return res.json({ available: false, reason: 'invalid_format' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

router.post('/complete-github-signup', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const githubData = (req.session as any).githubSignupData;

    if (!githubData) {
      return res.status(400).json({ error: 'No GitHub signup session found' });
    }

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const usernameRegex = /^[a-zA-Z0-9.]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and periods' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const { profile, accountData, email, emailVerified } = githubData;
    const hashedPassword = await createRandomPasswordHash();
    const avatarGradient = getRandomGradientId();
    let bannerGradient = getRandomGradientId();
    if (bannerGradient === avatarGradient) {
      bannerGradient = getRandomGradientId();
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          hasSetPassword: false,
          isVerified: false,
          emailVerifiedAt: null,
          lastLogin: new Date(),
          profile: {
            create: {
              displayName: profile.name ?? username,
              avatarGradient,
              bannerGradient,
            } as any
          },
          settings: {
            create: {
              language: 'en',
              theme: 'dark'
            }
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      });

      const providerAccountId = String(profile.id);
      await (tx as any).oAuthAccount.create({
        data: {
          provider: 'github',
          providerAccountId,
          userId: newUser.id,
          username: accountData.username,
          displayName: accountData.displayName,
          profileUrl: accountData.profileUrl,
          avatarUrl: accountData.avatarUrl,
          accessToken: accountData.accessToken,
          scope: accountData.scope,
        }
      });

      return newUser;
    });

    setSessionUser(req, result);
    
    delete (req.session as any).githubSignupData;
    
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve(null)));

    res.json({ 
      success: true, 
      user: result,
      returnTo: githubData.returnTo || '/'
    });

  } catch (error) {
    console.error('Complete GitHub signup error:', error);
    res.status(500).json({ error: 'Failed to complete GitHub signup' });
  }
});

router.post('/oauth/unlink', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { provider } = req.body;
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider
      }
    });

    if (!oauthAccount) {
      return res.status(404).json({ error: 'OAuth account not found' });
    }

    await prisma.oAuthAccount.delete({
      where: {
        id: oauthAccount.id
      }
    });

    res.json({ success: true, message: 'OAuth account unlinked successfully' });
  } catch (error) {
    console.error('OAuth unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink OAuth account' });
  }
});

export default router;