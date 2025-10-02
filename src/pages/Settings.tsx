import React, { useEffect, useState } from 'react';
import Sidebar from '../components/singles/Navbar';
import { Card, Form, Button, Tabs, Tab, Alert, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { Eye, EyeSlash, PersonCircle, Gear, Palette, Shield, Upload, Bell } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/settings.scss';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  birthDate: string;
  avatar?: string;
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
  
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });
  const [themeLoading, setThemeLoading] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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
  const [languageLoading, setLanguageLoading] = useState(false);
  const [languageSuccess, setLanguageSuccess] = useState('');
  const [languageError, setLanguageError] = useState('');
  
  const [activeTab, setActiveTab] = useState('account');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'dark');
    }
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (user) {
      loadUserData();
      loadUserSettings();
    }
  }, [user]);

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
          birthDate: userData.profile?.birthDate ? userData.profile.birthDate.split('T')[0] : ''
        });
        
        setAccountData(prev => ({
          ...prev,
          username: userData.username || '',
          email: userData.email || ''
        }));
        
        if (userData.profile?.avatar) {
          setAvatarPreview(userData.profile.avatar);
        }
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
          currentPassword: accountData.currentPassword,
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
        setAvatarFile(null);
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
            <Spinner animation="border" />
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
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Shield className="me-2" />{t('settings.account.sectionTitle')}</h5>
                </Card.Header>
                <Card.Body>
                  {accountError && <Alert variant="danger">{accountError}</Alert>}
                  {accountSuccess && <Alert variant="success">{accountSuccess}</Alert>}
                  
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
                          <Spinner size="sm" className="me-2" />
                          {t('common.statuses.saving')}
                        </>
                      ) : (
                        t('settings.account.actions.save')
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="profile" title={<><PersonCircle className="me-2" />{t('settings.tabs.profile')}</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><PersonCircle className="me-2" />{t('settings.profile.sectionTitle')}</h5>
                </Card.Header>
                <Card.Body>
                  {profileError && <Alert variant="danger">{profileError}</Alert>}
                  {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}
                  
                  <div className="avatar-section mb-4">
                    <h6 className="mb-3">{t('settings.profile.picture.title')}</h6>
                    <div className="d-flex align-items-center gap-3">
                      <div className="current-avatar">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt={t('settings.profile.picture.alt')} className="avatar-preview" />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="avatar-controls">
                        <Form.Control 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarFileChange}
                          className="mb-2"
                        />
                        {avatarFile && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleAvatarUpload}
                            disabled={avatarLoading}
                            className="me-2"
                          >
                            {avatarLoading ? (
                              <>
                                <Spinner size="sm" className="me-1" />
                                {t('settings.profile.statuses.uploading')}
                              </>
                            ) : (
                              <>
                                <Upload className="me-1" />
                                {t('settings.profile.picture.upload')}
                              </>
                            )}
                          </Button>
                        )}
                        {avatarPreview && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={avatarLoading}
                          >
                            {t('settings.profile.picture.remove')}
                          </Button>
                        )}
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
                          <Spinner size="sm" className="me-2" />
                          {t('common.statuses.saving')}
                        </>
                      ) : (
                        t('settings.profile.actions.save')
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="appearance" title={<><Palette className="me-2" />{t('settings.tabs.appearance')}</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Palette className="me-2" />{t('settings.appearance.sectionTitle')}</h5>
                </Card.Header>
                <Card.Body>
                  {languageError && <Alert variant="danger">{languageError}</Alert>}
                  {languageSuccess && <Alert variant="success">{languageSuccess}</Alert>}

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
                            <Spinner size="sm" className="me-2" />
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
                          <Spinner size="sm" className="me-2" />
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
                  {notificationError && <Alert variant="danger">{notificationError}</Alert>}
                  {notificationSuccess && <Alert variant="success">{notificationSuccess}</Alert>}
                  
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
          </Tabs>
          
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
              <Alert variant="danger" className="mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>{t('settings.danger.modal.warningTitle')}</strong> {t('settings.danger.modal.warningDescription')}
              </Alert>
              
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
      </main>
    </div>
  );
};

export default SettingsPage;
