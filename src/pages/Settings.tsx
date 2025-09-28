import React, { useEffect, useState } from 'react';
import Sidebar from '../components/singles/Navbar';
import { Card, Form, Button, Tabs, Tab, Alert, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { Eye, EyeSlash, PersonCircle, Gear, Palette, Shield, Upload, Bell } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/settings.scss';

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
  
  const [activeTab, setActiveTab] = useState('account');

  useEffect(() => {
    document.title = 'Settings - Axioris';
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'dark');
    }
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (user) {
      loadUserData();
      loadNotificationSettings();
    }
  }, [user]);

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

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/users/me/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.settings && data.settings.notifications) {
          setNotificationSettings(data.settings.notifications);
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
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
        setNotificationSuccess('Notification settings updated successfully!');
      } else {
        const error = await response.json();
        setNotificationError(error.error || 'Failed to update notification settings');
      }
    } catch (error) {
      setNotificationError('Failed to update notification settings');
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
        setProfileSuccess('Profile updated successfully!');
      } else {
        const error = await response.json();
        setProfileError(error.error || 'Failed to update profile');
      }
    } catch (error) {
      setProfileError('Failed to update profile');
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
        setAccountError('New passwords do not match');
        setAccountLoading(false);
        return;
      }
      
      if (accountData.newPassword.length < 6) {
        setAccountError('New password must be at least 6 characters');
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
        setAccountSuccess('Account updated successfully!');
        setAccountData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const error = await response.json();
        setAccountError(error.error || 'Failed to update account');
      }
    } catch (error) {
      setAccountError('Failed to update account');
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
        setProfileError('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Image must be smaller than 5MB');
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
        setProfileSuccess('Profile picture updated successfully!');
      } else {
        const error = await response.json();
        setProfileError(error.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      setProfileError('Failed to upload profile picture');
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
        setProfileSuccess('Profile picture removed successfully!');
      } else {
        const error = await response.json();
        setProfileError(error.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      setProfileError('Failed to remove profile picture');
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
        setDeleteError(error.error || 'Failed to delete account');
      }
    } catch (error) {
      setDeleteError('Failed to delete account');
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
            <div className="mt-2">Loading...</div>
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
          <h1 className="mb-4">Settings</h1>
          
          <Tabs 
            activeKey={activeTab} 
            onSelect={(tab) => setActiveTab(tab || 'account')}
            className="settings-tabs mb-4"
          >
            <Tab eventKey="account" title={<><Gear className="me-2" />Account</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Shield className="me-2" />Account Settings</h5>
                </Card.Header>
                <Card.Body>
                  {accountError && <Alert variant="danger">{accountError}</Alert>}
                  {accountSuccess && <Alert variant="success">{accountSuccess}</Alert>}
                  
                  <Form onSubmit={handleAccountSubmit}>
                    <Form.Group className="mb-3" controlId="username">
                      <Form.Label>Username</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={accountData.username}
                        onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your username"
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control 
                        type="email" 
                        value={accountData.email}
                        onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        required
                      />
                    </Form.Group>
                    
                    <hr className="my-4" />
                    
                    <h6 className="mb-3">Change Password</h6>
                    
                    <Form.Group className="mb-3" controlId="currentPassword">
                      <Form.Label>Current Password</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          type={showPasswords.current ? "text" : "password"}
                          value={accountData.currentPassword}
                          onChange={(e) => setAccountData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password to make changes"
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
                      <Form.Label>New Password (optional)</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          type={showPasswords.new ? "text" : "password"}
                          value={accountData.newPassword}
                          onChange={(e) => setAccountData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
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
                      <Form.Label>Confirm New Password</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          type={showPasswords.confirm ? "text" : "password"}
                          value={accountData.confirmPassword}
                          onChange={(e) => setAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
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
                          Saving...
                        </>
                      ) : (
                        'Save Account Changes'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="profile" title={<><PersonCircle className="me-2" />Profile</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><PersonCircle className="me-2" />Profile Settings</h5>
                </Card.Header>
                <Card.Body>
                  {profileError && <Alert variant="danger">{profileError}</Alert>}
                  {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}
                  
                  <div className="avatar-section mb-4">
                    <h6 className="mb-3">Profile Picture</h6>
                    <div className="d-flex align-items-center gap-3">
                      <div className="current-avatar">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Profile" className="avatar-preview" />
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
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="me-1" />
                                Upload
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
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Form onSubmit={handleProfileSubmit}>
                    <Form.Group className="mb-3" controlId="displayName">
                      <Form.Label>Display Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Enter your display name"
                        maxLength={50}
                      />
                      <Form.Text className="text-muted">
                        {profileData.displayName.length}/50 characters
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="bio">
                      <Form.Label>Bio</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={3} 
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Write something about yourself..."
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        {profileData.bio.length}/500 characters
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="location">
                      <Form.Label>Location</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter your location"
                        maxLength={100}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3" controlId="website">
                      <Form.Label>Website</Form.Label>
                      <Form.Control 
                        type="url" 
                        value={profileData.website}
                        onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4" controlId="birthDate">
                      <Form.Label>Birth Date</Form.Label>
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
                          Saving...
                        </>
                      ) : (
                        'Save Profile Changes'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="appearance" title={<><Palette className="me-2" />Appearance</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Palette className="me-2" />Appearance</h5>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-4" controlId="theme">
                      <Form.Label>Theme</Form.Label>
                      <div className="theme-options">
                        <div 
                          className={`theme-option ${theme === 'light' ? 'selected' : ''}`}
                          onClick={() => handleThemeChange('light')}
                        >
                          <div className="theme-preview light-preview">
                            <div className="preview-header"></div>
                            <div className="preview-content"></div>
                          </div>
                          <div className="theme-name">Light</div>
                        </div>
                        
                        <div 
                          className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
                          onClick={() => handleThemeChange('dark')}
                        >
                          <div className="theme-preview dark-preview">
                            <div className="preview-header"></div>
                            <div className="preview-content"></div>
                          </div>
                          <div className="theme-name">Dark</div>
                        </div>
                      </div>
                      
                      {themeLoading && (
                        <div className="text-center mt-3">
                          <Spinner size="sm" className="me-2" />
                          Applying theme...
                        </div>
                      )}
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="notifications" title={<><Bell className="me-2" />Notifications</>}>
              <Card className="settings-card">
                <Card.Header>
                  <h5 className="mb-0"><Bell className="me-2" />Notification Settings</h5>
                </Card.Header>
                <Card.Body>
                  {notificationError && <Alert variant="danger">{notificationError}</Alert>}
                  {notificationSuccess && <Alert variant="success">{notificationSuccess}</Alert>}
                  
                  <Form onSubmit={handleNotificationSubmit}>
                    <p className="text-muted mb-4">
                      Choose which notifications you'd like to receive when other users interact with your content.
                    </p>
                    
                    <div className="notification-settings">
                      <Form.Check
                        type="switch"
                        id="notif-likes"
                        label="Post Likes"
                        checked={notificationSettings.likes}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, likes: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        Get notified when someone likes your posts
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-comments"
                        label="Comments"
                        checked={notificationSettings.comments}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, comments: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        Get notified when someone comments on your posts
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-follows"
                        label="New Followers"
                        checked={notificationSettings.follows}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, follows: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        Get notified when someone follows you
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-mentions"
                        label="Mentions"
                        checked={notificationSettings.mentions}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, mentions: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        Get notified when someone mentions you with @username
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-replies"
                        label="Comment Replies"
                        checked={notificationSettings.replies}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, replies: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-3">
                        Get notified when someone replies to your comments
                      </Form.Text>
                      
                      <Form.Check
                        type="switch"
                        id="notif-comment-likes"
                        label="Comment Likes"
                        checked={notificationSettings.commentLikes}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, commentLikes: e.target.checked }))}
                        className="mb-3"
                      />
                      <Form.Text className="text-muted d-block mb-4">
                        Get notified when someone likes your comments
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
                          Saving...
                        </>
                      ) : (
                        'Save Notification Settings'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
          
          <Card className="settings-card danger-zone">
            <Card.Header>
              <h5 className="mb-0 text-danger">Danger Zone</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="mb-1">Sign Out</h6>
                  <p className="text-muted mb-0">Sign out of your account on this device.</p>
                </div>
                <Button variant="danger" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
              
              <hr className="my-3" />
              
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1 text-danger">Delete Account</h6>
                  <p className="text-muted mb-0">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="outline-danger" 
                  onClick={() => setShowDeleteAccount(true)}
                >
                  Delete Account
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
            <Modal.Title className="text-danger">Delete Account</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <Alert variant="danger" className="mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account and all associated data.
              </Alert>
              
              <p className="text-muted mb-3">
                Please enter your password to confirm account deletion.
              </p>
              
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
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
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount}
              disabled={!deletePassword.trim() || deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Deleting Account...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
        
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Remove Profile Picture</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to remove your profile picture? This action cannot be undone.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleAvatarDelete} disabled={avatarLoading}>
              {avatarLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Removing...
                </>
              ) : (
                'Remove Picture'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </main>
    </div>
  );
};

export default SettingsPage;
