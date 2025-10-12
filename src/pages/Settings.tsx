import React, { useEffect, useState } from 'react';
import Sidebar from '../components/singles/Navbar';
import { Card, Form, Button, Tabs, Tab, Modal, InputGroup } from 'react-bootstrap';
import InlineSpinner from '../components/ui/InlineSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import LinkedAccountCard from '../components/ui/LinkedAccountCard';
import ConfirmModal from '../components/ui/ConfirmModal';
import SettingsCard from '../components/ui/SettingsCard';
import AvatarSelector from '../components/ui/AvatarSelector';
import { Eye, EyeSlash, PersonCircle, Gear, Palette, Shield, Upload, Bell, Image as ImageIcon } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOGMeta } from '../utils/ogMeta';
import '../css/settings.scss';
import { useTranslation } from 'react-i18next';
import { profileGradients, getProfileGradientCss, getProfileGradientTextColor } from '../utils/profileGradients';

interface ProfileData {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  birthDate: string;
  avatar?: string;
  banner?: string;
  avatarGradient?: string | null;
  bannerGradient?: string | null;
}

interface AccountData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    birthDate: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  const [accountData, setAccountData] = useState<AccountData>({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Determine initial theme: prefer localStorage, then document attribute (set by app),
  // then system preference. Avoid forcing 'dark' when none exists so visiting
  // Settings doesn't flip a previously set light theme.
  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
    } catch (e) {
      // ignore localStorage errors
    }
    // If the document already has a theme attribute (set elsewhere), use it
    const docTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
    if (docTheme) return docTheme;
    // Fall back to system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState<string>(getInitialTheme);
  const [themeLoading, setThemeLoading] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAvatarGradient, setSelectedAvatarGradient] = useState<string | null>(null);
  const [gradientLoading, setGradientLoading] = useState({ avatar: false, banner: false });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerLoading, setBannerLoading] = useState(false);
  const [showBannerDeleteConfirm, setShowBannerDeleteConfirm] = useState(false);
  const [selectedBannerGradient, setSelectedBannerGradient] = useState<string | null>(null);
  
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    replies: true,
    commentLikes: true
  });
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationSuccess, setNotificationSuccess] = useState('');

  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState(() => (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]);
  
  const [githubAccount, setGithubAccount] = useState<{
    id: string;
    username: string;
    displayName: string;
    profileUrl: string;
    avatarUrl: string;
  } | null>(null);
  const [googleAccount, setGoogleAccount] = useState<{
    id: string;
    username: string;
    displayName: string;
    profileUrl: string;
    avatarUrl: string;
  } | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [githubSuccess, setGithubSuccess] = useState('');
  const [languageLoading, setLanguageLoading] = useState(false);
  const [languageSuccess, setLanguageSuccess] = useState('');
  const [languageError, setLanguageError] = useState('');
  const [hasSetPassword, setHasSetPassword] = useState(true);
  
  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FAToken, setDisable2FAToken] = useState('');
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState(0);
  
  const [activeTab, setActiveTab] = useState('account');
  const usernameInitial = user?.username?.charAt(0)?.toUpperCase() ?? '?';

  useEffect(() => {
    // Ensure document reflects current theme and persist only if missing.
    try {
      if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', theme);
      }
    } catch (e) {
      // ignore localStorage write errors
    }
    document.documentElement.setAttribute('data-theme', theme);

    if (user) {
      loadUserData();
      loadUserSettings();
      loadGithubAccount();
      loadOauthAccounts();
    }
    // We intentionally don't call setTheme here — initial state already set.
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('authStatus');
    const authProvider = urlParams.get('authProvider');
    const authMessage = urlParams.get('authMessage');

    if (authProvider === 'github' && authStatus) {
      setGithubLoading(false);
      
      if (authStatus === 'linked') {
        setGithubSuccess(t('settings.linkedAccounts.github.linkSuccess'));
        loadGithubAccount();
      } else if (authStatus === 'error') {
        const errorKey = authMessage ? `settings.linkedAccounts.github.errors.${authMessage}` : 'settings.linkedAccounts.github.linkError';
        const translated = t(errorKey);
        setGithubError(translated === errorKey ? t('settings.linkedAccounts.github.linkError') : translated);
      }

      urlParams.delete('authStatus');
      urlParams.delete('authProvider');
      if (authMessage) {
        urlParams.delete('authMessage');
      }
      const newSearch = urlParams.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`);
    }
  }, [t]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch('/api/i18n/languages', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch languages');
        }

        const data = await response.json();
        if (Array.isArray(data.languages)) {
          const normalized = Array.from(
            new Set<string>(
              data.languages.filter((code: unknown): code is string => typeof code === 'string')
            )
          ).sort((a, b) => a.localeCompare(b));
          setAvailableLanguages(normalized);
        }
      } catch (error) {
        console.error('Error loading available languages:', error);
        setAvailableLanguages(prev => {
          if (prev.length > 0) {
            return prev;
          }
          return [(i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]];
        });
      }
    };

    fetchLanguages();
  }, []);

  useEffect(() => {
    document.title = t('settings.documentTitle', { app: t('app.name') });
  }, [t, i18n.language]);

  useOGMeta({
    title: t('settings.documentTitle', { app: t('app.name') }),
    description: t('settings.documentTitle', { app: t('app.name') }),
    type: 'website',
    url: window.location.href,
  });

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/users/me/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        setProfileData({
          displayName: userData.profile?.displayName || '',
          bio: userData.profile?.bio || userData.bio || '',
          location: userData.profile?.location || '',
          website: userData.profile?.website || '',
          birthDate: userData.profile?.birthDate ? userData.profile.birthDate.split('T')[0] : '',
          avatar: userData.profile?.avatar || undefined,
          banner: userData.profile?.banner || undefined,
          avatarGradient: userData.profile?.avatarGradient ?? null,
          bannerGradient: userData.profile?.bannerGradient ?? null
        });
        
        setAccountData(prev => ({
          ...prev,
          username: userData.username || '',
          email: userData.email || ''
        }));
        
        setHasSetPassword(userData.hasSetPassword ?? true);
        
        setAvatarPreview(userData.profile?.avatar || '');
        setSelectedAvatarGradient(userData.profile?.avatarGradient ?? null);
        setBannerPreview(userData.profile?.banner || '');
        setSelectedBannerGradient(userData.profile?.bannerGradient ?? null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const response = await fetch('/api/users/me/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          if (data.settings.notifications) {
            setNotificationSettings(data.settings.notifications);
          }

          if (data.settings.language) {
            setLanguage(data.settings.language);
          }

          if (data.settings.theme) {
            setTheme(data.settings.theme);
            localStorage.setItem('theme', data.settings.theme);
            document.documentElement.setAttribute('data-theme', data.settings.theme);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
    
    // Load 2FA status
    await load2FAStatus();
  };

  const loadGithubAccount = async () => {
    try {
      const response = await fetch('/api/users/me/oauth-accounts', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const github = data.accounts?.find((account: any) => account.provider === 'github');
        setGithubAccount(github || null);
      }
    } catch (error) {
      console.error('Error loading GitHub account:', error);
    }
  };

  const loadOauthAccounts = async () => {
    try {
      const response = await fetch('/api/users/me/oauth-accounts', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const google = data.accounts?.find((account: any) => account.provider === 'google');
        setGoogleAccount(google || null);
      }
    } catch (error) {
      console.error('Error loading OAuth accounts:', error);
    }
  };

  const handleGithubLink = () => {
    setGithubLoading(true);
    setGithubError('');
    setGithubSuccess('');
    
    const returnTo = '/settings?tab=account';
    const params = new URLSearchParams({ mode: 'link', returnTo });
    window.location.href = `/api/auth/github?${params.toString()}`;
  };

  const handleGoogleLink = () => {
    setGithubLoading(true);
    setGithubError('');
    setGithubSuccess('');
    const returnTo = '/settings?tab=account';
    const params = new URLSearchParams({ mode: 'link', returnTo });
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const handleGithubUnlink = async () => {
    if (!githubAccount) return;

    setGithubLoading(true);
    setGithubError('');
    setGithubSuccess('');

    try {
      const response = await fetch('/api/oauth/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ provider: 'github' }),
      });

      if (response.ok) {
        setGithubAccount(null);
        setGithubSuccess(t('settings.linkedAccounts.github.unlinkSuccess'));
      } else {
        const data = await response.json();
        setGithubError(data.error || t('settings.linkedAccounts.github.unlinkError'));
      }
    } catch (error) {
      console.error('Error unlinking GitHub:', error);
      setGithubError(t('settings.linkedAccounts.github.unlinkError'));
    } finally {
      setGithubLoading(false);
    }
  };

  const handleGoogleUnlink = async () => {
    if (!googleAccount) return;

    setGithubLoading(true);
    setGithubError('');
    setGithubSuccess('');

    try {
      const response = await fetch('/api/oauth/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ provider: 'google' }),
      });

      if (response.ok) {
        setGoogleAccount(null);
        setGithubSuccess(t('settings.linkedAccounts.google.unlinkSuccess'));
      } else {
        const data = await response.json();
        setGithubError(data.error || t('settings.linkedAccounts.google.unlinkError'));
      }
    } catch (error) {
      console.error('Error unlinking Google:', error);
      setGithubError(t('settings.linkedAccounts.google.unlinkError'));
    } finally {
      setGithubLoading(false);
    }
  };

  // 2FA handlers
  const load2FAStatus = async () => {
    try {
      const response = await fetch('/api/2fa/status', {
        credentials: 'include',
        headers: {
          'x-csrf-token': sessionStorage.getItem('csrfToken') || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorEnabled(data.enabled);
        setRecoveryCodesRemaining(data.recoveryCodesRemaining || 0);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    }
  };

  const handleGenerate2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const response = await fetch('/api/2fa/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': sessionStorage.getItem('csrfToken') || '',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate 2FA secret');
      }

      const data = await response.json();
      setTwoFactorSecret(data.secret);
      setTwoFactorQRCode(data.qrCode);
      setShowTwoFactorSetup(true);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to generate 2FA secret');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken || !twoFactorSecret) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const response = await fetch('/api/2fa/enable', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': sessionStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          token: twoFactorToken,
          secret: twoFactorSecret
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enable 2FA');
      }

      const data = await response.json();
      setTwoFactorRecoveryCodes(data.recoveryCodes);
      setTwoFactorSuccess('2FA enabled successfully! Save your recovery codes.');
      setTwoFactorEnabled(true);
      setShowTwoFactorSetup(false);
      setShowRecoveryCodes(true);
      setTwoFactorToken('');
      setTwoFactorSecret('');
      setTwoFactorQRCode('');
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to enable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FAPassword) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': sessionStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          password: disable2FAPassword,
          token: disable2FAToken || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      setTwoFactorSuccess('2FA has been disabled');
      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisable2FAPassword('');
      setDisable2FAToken('');
      setRecoveryCodesRemaining(0);
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const password = prompt('Enter your password to regenerate recovery codes:');
    if (!password) return;

    const token = prompt('Enter your current 2FA code:');
    if (!token) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const response = await fetch('/api/2fa/recovery-codes/regenerate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': sessionStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({ password, token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate recovery codes');
      }

      const data = await response.json();
      setTwoFactorRecoveryCodes(data.recoveryCodes);
      setShowRecoveryCodes(true);
      setRecoveryCodesRemaining(data.recoveryCodes.length);
      setTwoFactorSuccess('Recovery codes regenerated successfully');
    } catch (error: any) {
      setTwoFactorError(error.message || 'Failed to regenerate recovery codes');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!language) return;

    setLanguageLoading(true);
    setLanguageError('');
    setLanguageSuccess('');

    try {
      const response = await fetch('/api/users/me/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ language })
      });

      if (response.ok) {
        await i18n.changeLanguage(language);
        setLanguageSuccess(t('settings.appearance.feedback.languageSuccess'));
      } else {
        const error = await response.json();
        setLanguageError(error.error || t('settings.appearance.feedback.languageError'));
      }
    } catch (error) {
      setLanguageError(t('settings.appearance.feedback.languageError'));
    } finally {
      setLanguageLoading(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationLoading(true);
    setNotificationError('');
    setNotificationSuccess('');
    
    try {
      const response = await fetch('/api/users/me/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          notifications: notificationSettings
        })
      });
      
      if (response.ok) {
        setNotificationSuccess(t('settings.notifications.feedback.success'));
      } else {
        const error = await response.json();
        setNotificationError(error.error || t('settings.notifications.feedback.error'));
      }
    } catch (error) {
      setNotificationError(t('settings.notifications.feedback.error'));
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });
      
      if (response.ok) {
        setProfileSuccess(t('settings.profile.feedback.updateSuccess'));
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.updateError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.updateError'));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    setAccountError('');
    setAccountSuccess('');
    
    if (accountData.newPassword) {
      if (accountData.newPassword !== accountData.confirmPassword) {
        setAccountError(t('settings.account.validation.passwordMismatch'));
        setAccountLoading(false);
        return;
      }
      
      if (accountData.newPassword.length < 6) {
        setAccountError(t('settings.account.validation.passwordLength'));
        setAccountLoading(false);
        return;
      }
      
      const needsCurrentPassword = !githubAccount || hasSetPassword;
      if (needsCurrentPassword && !accountData.currentPassword) {
        setAccountError(t('settings.account.validation.currentPasswordRequired'));
        setAccountLoading(false);
        return;
      }
    }
    
    try {
      const response = await fetch('/api/account/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username: accountData.username,
          email: accountData.email,
          currentPassword: (githubAccount && !hasSetPassword) ? undefined : accountData.currentPassword,
          newPassword: accountData.newPassword || undefined
        })
      });
      
      if (response.ok) {
        setAccountSuccess(t('settings.account.feedback.success'));
        setAccountData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        
        loadUserData();
      } else {
        const error = await response.json();
        setAccountError(error.error || t('settings.account.feedback.error'));
      }
    } catch (error) {
      setAccountError(t('settings.account.feedback.error'));
    } finally {
      setAccountLoading(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setThemeLoading(true);
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    setTimeout(() => {
      setThemeLoading(false);
    }, 500);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setProfileError(t('settings.profile.errors.invalidImageType'));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setProfileError(t('settings.profile.errors.invalidImageSize'));
        return;
      }
      
      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setProfileError('');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    try {
      const response = await fetch('/api/users/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setAvatarPreview(result.avatar);
        setSelectedAvatarGradient(result.gradients?.avatarGradient ?? null);
        setAvatarFile(null);
        setProfileData(prev => ({
          ...prev,
          avatar: result.avatar,
          avatarGradient: result.gradients?.avatarGradient ?? null
        }));
        setProfileSuccess(t('settings.profile.feedback.avatarUploadSuccess'));
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.avatarUploadError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.avatarUploadError'));
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    
    try {
      const response = await fetch('/api/users/profile/avatar', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setAvatarPreview('');
        setAvatarFile(null);
        setProfileData(prev => ({
          ...prev,
          avatar: undefined
        }));
        setProfileSuccess(t('settings.profile.feedback.avatarRemoveSuccess'));
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.avatarRemoveError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.avatarRemoveError'));
    } finally {
      setAvatarLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setProfileError(t('settings.profile.errors.invalidImageType'));
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setProfileError(t('settings.profile.errors.invalidBannerSize'));
        return;
      }

      setBannerFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setProfileError('');
    }
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) return;

    setBannerLoading(true);
    const formData = new FormData();
    formData.append('banner', bannerFile);

    try {
      const response = await fetch('/api/users/profile/banner', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setBannerPreview(result.banner);
        setSelectedBannerGradient(result.gradients?.bannerGradient ?? null);
        setBannerFile(null);
        setProfileData(prev => ({
          ...prev,
          banner: result.banner,
          bannerGradient: result.gradients?.bannerGradient ?? null
        }));
        setProfileSuccess(t('settings.profile.feedback.bannerUploadSuccess'));
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.bannerUploadError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.bannerUploadError'));
    } finally {
      setBannerLoading(false);
    }
  };

  const handleBannerDelete = async () => {
    setBannerLoading(true);

    try {
      const response = await fetch('/api/users/profile/banner', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setBannerPreview('');
        setBannerFile(null);
        setProfileData(prev => ({
          ...prev,
          banner: undefined
        }));
        setProfileSuccess(t('settings.profile.feedback.bannerRemoveSuccess'));
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.bannerRemoveError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.bannerRemoveError'));
    } finally {
      setBannerLoading(false);
      setShowBannerDeleteConfirm(false);
    }
  };

  const handleAvatarGradientSelect = async (gradientId: string | null) => {
    setProfileError('');
    setProfileSuccess('');
    setGradientLoading(prev => ({ ...prev, avatar: true }));

    try {
      const response = await fetch('/api/users/profile/gradients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          avatarGradient: gradientId,
          clearAvatar: !!gradientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedGradient = result.gradients?.avatarGradient ?? null;
        const updatedAvatar = result.media?.avatar ?? null;
        setSelectedAvatarGradient(updatedGradient);
        setProfileData(prev => ({
          ...prev,
          avatarGradient: updatedGradient,
          avatar: updatedAvatar ?? undefined
        }));
        setAvatarPreview(typeof updatedAvatar === 'string' ? updatedAvatar : '');
        setAvatarFile(null);
        setProfileSuccess(
          gradientId
            ? t('settings.profile.feedback.avatarGradientApplied')
            : t('settings.profile.feedback.avatarGradientCleared')
        );
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.avatarGradientError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.avatarGradientError'));
    } finally {
      setGradientLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  const handleBannerGradientSelect = async (gradientId: string | null) => {
    setProfileError('');
    setProfileSuccess('');
    setGradientLoading(prev => ({ ...prev, banner: true }));

    try {
      const response = await fetch('/api/users/profile/gradients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          bannerGradient: gradientId,
          clearBanner: !!gradientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedGradient = result.gradients?.bannerGradient ?? null;
        const updatedBanner = result.media?.banner ?? null;
        setSelectedBannerGradient(updatedGradient);
        setProfileData(prev => ({
          ...prev,
          bannerGradient: updatedGradient,
          banner: updatedBanner ?? undefined
        }));
        setBannerPreview(typeof updatedBanner === 'string' ? updatedBanner : '');
        setBannerFile(null);
        setProfileSuccess(
          gradientId
            ? t('settings.profile.feedback.bannerGradientApplied')
            : t('settings.profile.feedback.bannerGradientCleared')
        );
      } else {
        const error = await response.json();
        setProfileError(error.error || t('settings.profile.feedback.bannerGradientError'));
      }
    } catch (error) {
      setProfileError(t('settings.profile.feedback.bannerGradientError'));
    } finally {
      setGradientLoading(prev => ({ ...prev, banner: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/account/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim() || deleteLoading) return;
    
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword })
      });
      
      if (response.ok) {
        navigate('/account/login');
      } else {
        const error = await response.json();
        setDeleteError(error.error || t('settings.danger.feedback.deleteError'));
      }
    } catch (error) {
      setDeleteError(t('settings.danger.feedback.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="app-container d-flex">
        <Sidebar activeId="settings" />
        <main className="settings-main flex-grow-1 p-4 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <InlineSpinner ariaLabel={t('common.loading')} />
            <div className="mt-2">{t('common.loading')}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container d-flex">
      <Sidebar activeId="settings" />
      <main className="settings-main flex-grow-1 p-4">
        <div className="settings-container">
          <h1 className="mb-4">{t('settings.title')}</h1>
          
          <Tabs 
            activeKey={activeTab} 
            onSelect={(tab) => setActiveTab(tab || 'account')}
            className="settings-tabs mb-4"
          >
            <Tab eventKey="account" title={<><Gear className="me-2" />{t('settings.tabs.account')}</>}>
              <div className="settings-main-column">
                <SettingsCard title={t('settings.account.sectionTitle')} icon={<Shield className="me-2" />}>
                  {accountError && <AlertMessage variant="danger">{accountError}</AlertMessage>}
                  {accountSuccess && <AlertMessage variant="success">{accountSuccess}</AlertMessage>}
                  
                  <Form onSubmit={handleAccountSubmit}>
                    <Form.Group className="mb-3" controlId="username">
                      <Form.Label>{t('settings.account.fields.username.label')}</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={accountData.username}
                        onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder={t('settings.account.fields.username.placeholder')}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>{t('settings.account.fields.email.label')}</Form.Label>
                      <Form.Control 
                        type="email" 
                        value={accountData.email}
                        onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t('settings.account.fields.email.placeholder')}
                        required
                      />
                    </Form.Group>
                    
                    <hr className="my-4" />
                    
                    <h6 className="mb-3">{t('settings.account.changePassword')}</h6>
                    
                    {githubAccount && !hasSetPassword && (
                      <AlertMessage variant="info" className="mb-3">
                        <small>
                          {t('settings.account.oauthFirstPasswordInfo')}
                        </small>
                      </AlertMessage>
                    )}
                    
                    {(!githubAccount || hasSetPassword) && (
                      <Form.Group className="mb-3" controlId="currentPassword">
                        <Form.Label>{t('settings.account.fields.currentPassword.label')}</Form.Label>
                        <InputGroup>
                          <Form.Control 
                            type={showPasswords.current ? "text" : "password"}
                            value={accountData.currentPassword}
                            onChange={(e) => setAccountData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder={t('settings.account.fields.currentPassword.placeholder')}
                          />
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          >
                            {showPasswords.current ? <EyeSlash /> : <Eye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    )}
                    
                    <Form.Group className="mb-3" controlId="newPassword">
                      <Form.Label>{t('settings.account.fields.newPassword.label')}</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          type={showPasswords.new ? "text" : "password"}
                          value={accountData.newPassword}
                          onChange={(e) => setAccountData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder={t('settings.account.fields.newPassword.placeholder')}
                        />
                        <Button 
                          variant="outline-secondary" 
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <EyeSlash /> : <Eye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                    
                    <Form.Group className="mb-4" controlId="confirmPassword">
                      <Form.Label>{t('settings.account.fields.confirmPassword.label')}</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          type={showPasswords.confirm ? "text" : "password"}
                          value={accountData.confirmPassword}
                          onChange={(e) => setAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder={t('settings.account.fields.confirmPassword.placeholder')}
                        />
                        <Button 
                          variant="outline-secondary" 
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeSlash /> : <Eye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                    
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={accountLoading || !accountData.currentPassword}
                    >
                      {accountLoading ? (
                        <>
                          <InlineSpinner size="sm" className="me-2" />
                          {t('common.statuses.saving')}
                        </>
                      ) : (
                        t('settings.account.actions.save')
                      )}
                    </Button>
                  </Form>
                  
                  <hr className="my-4" />
                  
                  <div className="linked-accounts-section">
                    <h6 className="mb-3">{t('settings.linkedAccounts.title')}</h6>
                    <p className="text-muted small mb-4">{t('settings.linkedAccounts.description')}</p>
                    
                    <LinkedAccountCard
                      providerName={t('settings.linkedAccounts.github.title')}
                      connected={!!githubAccount}
                      avatarUrl={githubAccount?.avatarUrl}
                      displayName={githubAccount?.displayName}
                      username={githubAccount?.username}
                      loading={githubLoading}
                      onLink={handleGithubLink}
                      onUnlink={handleGithubUnlink}
                    />
                    {githubError && <AlertMessage variant="danger">{githubError}</AlertMessage>}
                    {githubSuccess && <AlertMessage variant="success">{githubSuccess}</AlertMessage>}
                    
                      {/* <fieldset className="border rounded p-3 mb-3">
                        <legend className="fw-semibold h6 px-2">{t('settings.linkedAccounts.google.title')}</legend>
                        {githubError && <AlertMessage variant="danger">{githubError}</AlertMessage>}
                        {githubSuccess && <AlertMessage variant="success">{githubSuccess}</AlertMessage>}
                        {googleAccount ? (
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <img 
                                src={googleAccount.avatarUrl} 
                                alt={googleAccount.username}
                                className="rounded-circle me-3"
                                style={{ width: '40px', height: '40px' }}
                              />
                              <div>
                                <div className="fw-semibold">{googleAccount.displayName || googleAccount.username}</div>
                                <div className="text-muted small">@{googleAccount.username}</div>
                              </div>
                            </div>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={handleGoogleUnlink}
                              disabled={githubLoading}
                            >
                              {githubLoading ? (
                                <>
                                  <Spinner size="sm" className="me-2" />
                                  {t('settings.linkedAccounts.google.unlinking')}
                                </>
                              ) : (
                                t('settings.linkedAccounts.google.unlink')
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <div className="fw-semibold">{t('settings.linkedAccounts.google.notLinked')}</div>
                              <div className="text-muted small">{t('settings.linkedAccounts.google.linkDescription')}</div>
                            </div>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={handleGoogleLink}
                              disabled={githubLoading}
                            >
                              {githubLoading ? (
                                <>
                                  <Spinner size="sm" className="me-2" />
                                  {t('settings.linkedAccounts.google.linking')}
                                </>
                              ) : (
                                t('settings.linkedAccounts.google.link')
                              )}
                            </Button>
                          </div>
                        )}
                      </fieldset> */}
                    
                    {!githubAccount && (
                      <div className="text-muted small text-center py-3">
                        {t('settings.linkedAccounts.noAccountsLinked')}
                      </div>
                    )}
                  </div>
                  
                  <hr className="my-4" />
                  
                  {/* Two-Factor Authentication Section */}
                  <div className="two-factor-section">
                    <h6 className="mb-3">
                      <Shield className="me-2" />
                      {t('settings.twoFactor.title')}
                    </h6>
                    <p className="text-muted small mb-4">{t('settings.twoFactor.description')}</p>
                    
                    {twoFactorError && <AlertMessage variant="danger" dismissible onClose={() => setTwoFactorError('')}>{twoFactorError}</AlertMessage>}
                    {twoFactorSuccess && <AlertMessage variant="success" dismissible onClose={() => setTwoFactorSuccess('')}>{twoFactorSuccess}</AlertMessage>}
                    
                    {twoFactorEnabled ? (
                      <div className="border rounded p-3 mb-3 bg-success bg-opacity-10">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div>
                            <div className="fw-semibold text-success">
                              <Shield className="me-2" />
                              {t('settings.twoFactor.enabled')}
                            </div>
                            <div className="text-muted small mt-1">
                              {t('settings.twoFactor.recoveryCodesRemaining', { count: recoveryCodesRemaining })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="d-flex gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={handleRegenerateRecoveryCodes}
                            disabled={twoFactorLoading}
                          >
                            {t('settings.twoFactor.actions.regenerateCodes')}
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => setShowDisable2FA(true)}
                            disabled={twoFactorLoading}
                          >
                            {t('settings.twoFactor.actions.disable')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded p-3 mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-semibold">{t('settings.twoFactor.disabled')}</div>
                            <div className="text-muted small">{t('settings.twoFactor.disabledDescription')}</div>
                          </div>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={handleGenerate2FA}
                            disabled={twoFactorLoading}
                          >
                            {twoFactorLoading ? (
                              <>
                                <InlineSpinner size="sm" className="me-2" />
                                {t('common.statuses.loading')}
                              </>
                            ) : (
                              t('settings.twoFactor.actions.enable')
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </SettingsCard>
              </div>
            </Tab>
            
            <Tab eventKey="profile" title={<><PersonCircle className="me-2" />{t('settings.tabs.profile')}</>}>
              <SettingsCard title={t('settings.profile.sectionTitle')} icon={<PersonCircle className="me-2" />}>
                  {profileError && <AlertMessage variant="danger">{profileError}</AlertMessage>}
                  {profileSuccess && <AlertMessage variant="success">{profileSuccess}</AlertMessage>}
                  
                  <AvatarSelector
                    avatarPreview={avatarPreview}
                    selectedGradient={selectedAvatarGradient}
                    usernameInitial={usernameInitial}
                    gradients={profileGradients.map(g => ({ id: g.id, label: t(`settings.profile.gradients.options.${g.id}`, { defaultValue: g.label }) }))}
                    gradientLoading={gradientLoading}
                    avatarLoading={avatarLoading}
                    onFileChange={handleAvatarFileChange}
                    onUpload={handleAvatarUpload}
                    onRemove={() => setShowDeleteConfirm(true)}
                    onSelectGradient={handleAvatarGradientSelect}
                  />

                  <div className="banner-section mb-4">
                    <h6 className="mb-3">{t('settings.profile.banner.title')}</h6>
                    <div className="banner-preview-wrapper mb-3">
                      {bannerPreview ? (
                        <img src={bannerPreview} alt={t('settings.profile.banner.alt')} className="banner-preview" />
                      ) : selectedBannerGradient ? (
                        <div
                          className="banner-gradient-preview"
                          style={{ background: getProfileGradientCss(selectedBannerGradient) }}
                        />
                      ) : (
                        <div className="banner-placeholder">
                          <ImageIcon className="me-2" />
                          {t('settings.profile.banner.placeholder')}
                        </div>
                      )}
                    </div>
                    <div className="d-flex flex-column flex-md-row align-items-start gap-2 gap-md-3 mb-3">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileChange}
                        className="mb-2 mb-md-0"
                      />
                      <div className="d-flex flex-wrap gap-2">
                        {bannerFile && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBannerUpload}
                            disabled={bannerLoading}
                          >
                            {bannerLoading ? (
                              <>
                                <InlineSpinner size="sm" className="me-1" />
                                {t('settings.profile.statuses.uploading')}
                              </>
                            ) : (
                              <>
                                <Upload className="me-1" />
                                {t('settings.profile.banner.upload')}
                              </>
                            )}
                          </Button>
                        )}
                        {bannerPreview && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setShowBannerDeleteConfirm(true)}
                            disabled={bannerLoading}
                          >
                            {t('settings.profile.banner.remove')}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-muted mb-3">{t('settings.profile.banner.description')}</p>
                    <div className="gradient-selector">
                      <h6 className="mb-2">{t('settings.profile.banner.gradientTitle')}</h6>
                      <div className="gradient-grid">
                        <button
                          type="button"
                          className={`gradient-option ${!selectedBannerGradient ? 'selected' : ''}`}
                          onClick={() => handleBannerGradientSelect(null)}
                          disabled={gradientLoading.banner}
                          aria-pressed={!selectedBannerGradient}
                        >
                          <span className="gradient-swatch gradient-swatch-none">Ø</span>
                          <span className="gradient-label">{t('settings.profile.gradients.none')}</span>
                        </button>
                        {profileGradients.map((gradient) => {
                          const isSelected = selectedBannerGradient === gradient.id;
                          const gradientLabel = t(`settings.profile.gradients.options.${gradient.id}`, {
                            defaultValue: gradient.label
                          });
                          return (
                            <button
                              key={`banner-${gradient.id}`}
                              type="button"
                              className={`gradient-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleBannerGradientSelect(gradient.id)}
                              disabled={gradientLoading.banner}
                              aria-pressed={isSelected}
                            >
                              <span
                                className="gradient-swatch banner"
                                style={{ background: getProfileGradientCss(gradient.id) }}
                              />
                              <span className="gradient-label">{gradientLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <Form onSubmit={handleProfileSubmit}>
                    <Form.Group className="mb-3" controlId="displayName">
                      <Form.Label>{t('settings.profile.fields.displayName.label')}</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder={t('settings.profile.fields.displayName.placeholder')}
                        maxLength={50}
                      />
                      <Form.Text className="text-muted">
                        {t('settings.profile.fields.displayName.count', { count: profileData.displayName.length, limit: 50 })}
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="bio">
                      <Form.Label>{t('settings.profile.fields.bio.label')}</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={3} 
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder={t('settings.profile.fields.bio.placeholder')}
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        {t('settings.profile.fields.bio.count', { count: profileData.bio.length, limit: 500 })}
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="location">
                      <Form.Label>{t('settings.profile.fields.location.label')}</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={t('settings.profile.fields.location.placeholder')}
                        maxLength={100}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="website">
                      <Form.Label>{t('settings.profile.fields.website.label')}</Form.Label>
                      <Form.Control 
                        type="url" 
                        value={profileData.website}
                        onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder={t('settings.profile.fields.website.placeholder')}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4" controlId="birthDate">
                      <Form.Label>{t('settings.profile.fields.birthDate.label')}</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData(prev => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </Form.Group>
                    
                    <Button type="submit" variant="primary" disabled={profileLoading}>
                      {profileLoading ? (
                        <>
                          <InlineSpinner size="sm" className="me-2" />
                          {t('common.statuses.saving')}
                        </>
                      ) : (
                        t('settings.profile.actions.save')
                      )}
                    </Button>
                  </Form>
              </SettingsCard>
            </Tab>
            
            <Tab eventKey="appearance" title={<><Palette className="me-2" />{t('settings.tabs.appearance')}</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Palette className="me-2" />{t('settings.appearance.sectionTitle')}</h5>
                </Card.Header>
                <Card.Body>
                  {languageError && <AlertMessage variant="danger">{languageError}</AlertMessage>}
                  {languageSuccess && <AlertMessage variant="success">{languageSuccess}</AlertMessage>}

                  <Form onSubmit={handleLanguageSubmit} className="mb-4">
                    <Form.Group className="mb-3" controlId="language">
                      <Form.Label>{t('settings.languageLabel')}</Form.Label>
                      <Form.Select
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value);
                          setLanguageSuccess('');
                          setLanguageError('');
                        }}
                        disabled={availableLanguages.length === 0 || languageLoading}
                      >
                        {availableLanguages.map(code => (
                          <option key={code} value={code}>
                            {t(`common.languages.${code}`)}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        {t('settings.languageHelper')}
                      </Form.Text>
                    </Form.Group>
                    <div className="d-flex align-items-center gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={languageLoading || availableLanguages.length === 0}
                      >
                        {languageLoading ? (
                          <>
                            <InlineSpinner size="sm" className="me-2" />
                            {t('common.statuses.saving')}
                          </>
                        ) : (
                          t('settings.appearance.actions.saveLanguage')
                        )}
                      </Button>
                    </div>
                  </Form>

                  <Form>
                    <Form.Group className="mb-4" controlId="theme">
                      <Form.Label>{t('settings.appearance.fields.theme')}</Form.Label>
                      <div className="theme-options">
                        <div 
                          className={`theme-option ${theme === 'light' ? 'selected' : ''}`}
                          onClick={() => handleThemeChange('light')}
                        >
                          <div className="theme-preview light-preview">
                            <div className="preview-header"></div>
                            <div className="preview-content"></div>
                          </div>
                          <div className="theme-name">{t('settings.appearance.options.light')}</div>
                        </div>
                        
                        <div 
                          className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
                          onClick={() => handleThemeChange('dark')}
                        >
                          <div className="theme-preview dark-preview">
                            <div className="preview-header"></div>
                            <div className="preview-content"></div>
                          </div>
                          <div className="theme-name">{t('settings.appearance.options.dark')}</div>
                        </div>
                      </div>
                      
                      {themeLoading && (
                        <div className="text-center mt-3">
                          <InlineSpinner size="sm" className="me-2" />
                          {t('settings.appearance.status.applying')}
                        </div>
                      )}
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="notifications" title={<><Bell className="me-2" />{t('settings.tabs.notifications')}</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Bell className="me-2" />{t('settings.notifications.sectionTitle')}</h5>
                </Card.Header>
                <Card.Body>
                  {notificationError && <AlertMessage variant="danger">{notificationError}</AlertMessage>}
                  {notificationSuccess && <AlertMessage variant="success">{notificationSuccess}</AlertMessage>}
                  
                  <Form onSubmit={handleNotificationSubmit}>
                    <p className="text-muted mb-4">
                      {t('settings.notifications.intro')}
                    </p>
                    
                    <div className="notification-settings">
                      <Form.Check
                        type="switch"
                        id="notif-likes"
                        label={t('settings.notifications.toggles.likes.label')}
                        checked={notificationSettings.likes}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, likes: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        {t('settings.notifications.toggles.likes.description')}
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-comments"
                        label={t('settings.notifications.toggles.comments.label')}
                        checked={notificationSettings.comments}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, comments: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        {t('settings.notifications.toggles.comments.description')}
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-follows"
                        label={t('settings.notifications.toggles.follows.label')}
                        checked={notificationSettings.follows}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, follows: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        {t('settings.notifications.toggles.follows.description')}
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-mentions"
                        label={t('settings.notifications.toggles.mentions.label')}
                        checked={notificationSettings.mentions}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, mentions: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        {t('settings.notifications.toggles.mentions.description')}
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-replies"
                        label={t('settings.notifications.toggles.replies.label')}
                        checked={notificationSettings.replies}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, replies: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        {t('settings.notifications.toggles.replies.description')}
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-comment-likes"
                        label={t('settings.notifications.toggles.commentLikes.label')}
                        checked={notificationSettings.commentLikes}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, commentLikes: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-4">
                        {t('settings.notifications.toggles.commentLikes.description')}
                      </Form.Text>
                    </div>
                    
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={notificationLoading}
                    >
                      {notificationLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          {t('common.statuses.saving')}
                        </>
                      ) : (
                        t('settings.notifications.actions.save')
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="danger" tabClassName="danger-tab" title={<><i className="bi bi-exclamation-triangle-fill me-2 text-danger" />{t('settings.tabs.danger')}</>}>
              <Card className="settings-card danger-zone">
                <Card.Header>
                  <h5 className="mb-0 text-danger">{t('settings.danger.title')}</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="mb-1">{t('settings.danger.signOut.title')}</h6>
                      <p className="text-muted mb-0">{t('settings.danger.signOut.description')}</p>
                    </div>
                    <Button variant="danger" onClick={handleLogout}>
                      {t('settings.danger.signOut.cta')}
                    </Button>
                  </div>
                  
                  <hr className="my-3" />
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 text-danger">{t('settings.danger.delete.title')}</h6>
                      <p className="text-muted mb-0">
                        {t('settings.danger.delete.description')}
                      </p>
                    </div>
                    <Button 
                      variant="outline-danger" 
                      onClick={() => setShowDeleteAccount(true)}
                    >
                      {t('settings.danger.delete.cta')}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </div>
        
        <Modal 
          show={showDeleteAccount} 
          onHide={() => {
            setShowDeleteAccount(false);
            setDeletePassword('');
            setDeleteError('');
          }} 
          centered
        >
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="text-danger">{t('settings.danger.modal.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <AlertMessage variant="danger" className="mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>{t('settings.danger.modal.warningTitle')}</strong> {t('settings.danger.modal.warningDescription')}
              </AlertMessage>
              
              <p className="text-muted mb-3">
                {t('settings.danger.modal.prompt')}
              </p>
              
              <Form.Group>
                <Form.Label>{t('settings.danger.modal.passwordLabel')}</Form.Label>
                <Form.Control
                  type="password"
                  placeholder={t('settings.danger.modal.passwordPlaceholder')}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  isInvalid={!!deleteError}
                />
                <Form.Control.Feedback type="invalid">
                  {deleteError}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDeleteAccount(false);
                setDeletePassword('');
                setDeleteError('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount}
              disabled={!deletePassword.trim() || deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  {t('settings.danger.modal.status.deleting')}
                </>
              ) : (
                t('settings.danger.modal.confirm')
              )}
            </Button>
          </Modal.Footer>
        </Modal>
        
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('settings.profile.picture.removeModal.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {t('settings.profile.picture.removeModal.description')}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleAvatarDelete} disabled={avatarLoading}>
              {avatarLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('settings.profile.statuses.removing')}
                </>
              ) : (
                t('settings.profile.picture.removeModal.cta')
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 2FA Setup Modal */}
        <Modal show={showTwoFactorSetup} onHide={() => setShowTwoFactorSetup(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{t('settings.twoFactor.setup.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">{t('settings.twoFactor.setup.instructions')}</p>
            
            <div className="text-center mb-4">
              {twoFactorQRCode && (
                <img src={twoFactorQRCode} alt="2FA QR Code" className="img-fluid" style={{ maxWidth: '250px' }} />
              )}
            </div>
            
            <div className="bg-light p-3 rounded mb-3">
              <small className="text-muted d-block mb-2">{t('settings.twoFactor.setup.manualEntry')}</small>
              <code className="user-select-all d-block text-center" style={{ fontSize: '0.9rem' }}>
                {twoFactorSecret}
              </code>
            </div>
            
            <Form onSubmit={handleEnable2FA}>
              <Form.Group className="mb-3">
                <Form.Label>{t('settings.twoFactor.setup.verifyCode')}</Form.Label>
                <Form.Control
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
                <Form.Text className="text-muted">
                  {t('settings.twoFactor.setup.verifyInstructions')}
                </Form.Text>
              </Form.Group>
              
              <div className="d-flex gap-2 justify-content-end">
                <Button variant="secondary" onClick={() => {
                  setShowTwoFactorSetup(false);
                  setTwoFactorToken('');
                  setTwoFactorSecret('');
                  setTwoFactorQRCode('');
                }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={twoFactorLoading || twoFactorToken.length !== 6}>
                  {twoFactorLoading ? (
                    <>
                      <InlineSpinner size="sm" className="me-2" />
                      {t('common.statuses.saving')}
                    </>
                  ) : (
                    t('settings.twoFactor.setup.enable')
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Recovery Codes Modal */}
        <Modal show={showRecoveryCodes} onHide={() => setShowRecoveryCodes(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('settings.twoFactor.recoveryCodes.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AlertMessage variant="warning" className="mb-3">
              <small>{t('settings.twoFactor.recoveryCodes.warning')}</small>
            </AlertMessage>
            
            <div className="bg-light p-3 rounded mb-3">
              <div className="row g-2">
                {twoFactorRecoveryCodes.map((code, index) => (
                  <div key={index} className="col-6">
                    <code className="d-block text-center p-2 bg-white rounded" style={{ fontSize: '0.85rem' }}>
                      {code}
                    </code>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-muted small mb-0">
              {t('settings.twoFactor.recoveryCodes.description')}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => {
              // Copy codes to clipboard
              const codesText = twoFactorRecoveryCodes.join('\n');
              navigator.clipboard.writeText(codesText);
              setTwoFactorSuccess(t('settings.twoFactor.recoveryCodes.copied'));
            }}>
              {t('settings.twoFactor.recoveryCodes.copy')}
            </Button>
            <Button variant="secondary" onClick={() => setShowRecoveryCodes(false)}>
              {t('common.close')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Disable 2FA Modal */}
        <Modal show={showDisable2FA} onHide={() => setShowDisable2FA(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('settings.twoFactor.disable.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AlertMessage variant="warning" className="mb-3">
              <small>{t('settings.twoFactor.disable.warning')}</small>
            </AlertMessage>
            
            <Form onSubmit={handleDisable2FA}>
              <Form.Group className="mb-3">
                <Form.Label>{t('settings.account.fields.currentPassword.label')}</Form.Label>
                <Form.Control
                  type="password"
                  value={disable2FAPassword}
                  onChange={(e) => setDisable2FAPassword(e.target.value)}
                  placeholder={t('settings.account.fields.currentPassword.placeholder')}
                  required
                  autoFocus
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>{t('settings.twoFactor.disable.code')}</Form.Label>
                <Form.Control
                  type="text"
                  value={disable2FAToken}
                  onChange={(e) => setDisable2FAToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                />
                <Form.Text className="text-muted">
                  {t('settings.twoFactor.disable.codeOptional')}
                </Form.Text>
              </Form.Group>
              
              <div className="d-flex gap-2 justify-content-end">
                <Button variant="secondary" onClick={() => {
                  setShowDisable2FA(false);
                  setDisable2FAPassword('');
                  setDisable2FAToken('');
                }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="danger" disabled={twoFactorLoading || !disable2FAPassword}>
                  {twoFactorLoading ? (
                    <>
                      <InlineSpinner size="sm" className="me-2" />
                      {t('common.statuses.processing')}
                    </>
                  ) : (
                    t('settings.twoFactor.actions.disable')
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        <Modal show={showBannerDeleteConfirm} onHide={() => setShowBannerDeleteConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('settings.profile.banner.removeModal.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {t('settings.profile.banner.removeModal.description')}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBannerDeleteConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleBannerDelete} disabled={bannerLoading}>
              {bannerLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('settings.profile.statuses.removing')}
                </>
              ) : (
                t('settings.profile.banner.removeModal.cta')
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </main>
    </div>
  );
};

export default SettingsPage;
