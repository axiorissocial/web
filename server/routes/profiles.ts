import { Router, Request, Response } from 'express';
import { PrismaClient } from '../../src/generated/prisma/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createNotification } from './notifications.js';
import { getAvailableLanguages } from '../i18n.js';

const router = Router();
const prisma = new PrismaClient();

const requireAuth = (req: any, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.session.userId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.get('/:username/profile', async (req: Request, res: Response) => {
  try {
    const { username: rawUsername } = req.params;
    const currentUserId = (req.session as any)?.userId;
    
    const username = decodeURIComponent(rawUsername).trim();

    console.log(`Fetching profile for username: "${username}" (raw: "${rawUsername}"), currentUserId: ${currentUserId}`);

    if (!username || username.length === 0) {
      console.log('Empty username provided');
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        _count: {
          select: {
            posts: true,
            following: true,
            followers: true,
          }
        }
      }
    });

    if (!user) {
      console.log(`User not found: "${username}"`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`User found: ${user.username} (${user.id})`);

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      });
      isFollowing = !!followRelation;
      console.log(`Follow status: ${isFollowing}`);
    }

    const { password, email, ...safeUser } = user;
    const profileData = {
      ...safeUser,
      email: currentUserId === user.id ? email : undefined,
      isFollowing,
      isOwn: currentUserId === user.id
    };

    console.log(`Returning profile data for ${username}:`, { 
      username: profileData.username, 
      hasProfile: !!profileData.profile,
      isOwn: profileData.isOwn,
      isFollowing 
    });
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/:userId/follow', requireAuth, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId;

    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    await prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: userId
      }
    });

    await createNotification(
      'FOLLOW',
      currentUserId,
      userId
    );

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

router.post('/:userId/unfollow', requireAuth, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId;

    const deletedFollow = await prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: userId
      }
    });

    if (deletedFollow.count === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

router.delete('/:userId/follow', requireAuth, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId;

    const deletedFollow = await prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: userId
      }
    });

    if (deletedFollow.count === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

router.put('/profile', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const {
      displayName,
      bio,
      location,
      website,
      birthDate
    } = req.body;

    if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      return res.status(400).json({ error: 'Website must be a valid URL starting with http:// or https://' });
    }

    if (displayName && displayName.length > 50) {
      return res.status(400).json({ error: 'Display name must be 50 characters or less' });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or less' });
    }

    if (location && location.length > 100) {
      return res.status(400).json({ error: 'Location must be 100 characters or less' });
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName || undefined,
        bio: bio || undefined,
        location: location || undefined,
        website: website || undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined
      },
      update: {
        displayName: displayName || undefined,
        bio: bio || undefined,
        location: location || undefined,
        website: website || undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
            level: true,
            createdAt: true
          }
        }
      }
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/me/profile', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            posts: true,
            following: true,
            followers: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...safeUser } = user;
    
    res.json({
      ...safeUser,
      isOwn: true
    });
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/me/settings', requireAuth, async (req: any, res: Response) => {
  try {
    const currentUserId = req.session.userId;
    const availableLanguages = getAvailableLanguages();
    const defaultLanguage = 'en';
    
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: currentUserId }
    });
    
    if (userSettings) {
      res.json({
        settings: {
          theme: userSettings.theme,
          language: userSettings.language || defaultLanguage,
          notifications: userSettings.notifications || {
            likes: true,
            comments: true,
            follows: true,
            mentions: true,
            replies: true,
            commentLikes: true
          }
        }
      });
    } else {
      res.json({
        settings: {
          theme: 'dark',
          language: defaultLanguage,
          notifications: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true,
            replies: true,
            commentLikes: true
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/me/settings', requireAuth, async (req: any, res: Response) => {
  try {
    const currentUserId = req.session.userId;
    const { notifications, theme, language } = req.body;
    
    const updateData: any = {};
    if (notifications) {
      updateData.notifications = notifications;
    }
    if (theme) {
      updateData.theme = theme;
    }
    if (language) {
      const availableLanguages = getAvailableLanguages();
      if (!availableLanguages.includes(language)) {
        return res.status(400).json({ error: 'Unsupported language selection' });
      }
      updateData.language = language;
    }
    
    const userSettings = await prisma.userSettings.upsert({
      where: { userId: currentUserId },
      update: updateData,
      create: {
        userId: currentUserId,
        ...updateData
      }
    });
    
    res.json({
      message: 'Settings updated successfully',
      settings: userSettings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;