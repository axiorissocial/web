import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
import { PrismaClient } from '../../src/generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session || !req.session.userId) {
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
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
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

router.get('/users/me/profile', requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: {
        profile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profile: user.profile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/account/update', requireAuth, async (req: any, res: any) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (username !== currentUser.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    if (email !== currentUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updateData: any = {
      username,
      email
    };

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        level: true,
        isVerified: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Account updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/profile', requireAuth, async (req: any, res: any) => {
  try {
    const { displayName, bio, location, website, birthDate } = req.body;
    const userId = req.session.userId;

    let parsedBirthDate = null;
    if (birthDate) {
      parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({ error: 'Invalid birth date' });
      }
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        displayName: displayName || null,
        bio: bio || null,
        location: location || null,
        website: website || null,
        birthDate: parsedBirthDate
      },
      create: {
        userId,
        displayName: displayName || null,
        bio: bio || null,
        location: location || null,
        website: website || null,
        birthDate: parsedBirthDate
      }
    });

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/profile/avatar', requireAuth, upload.single('avatar'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session.userId;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const currentProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (currentProfile?.avatar) {
      const oldAvatarPath = path.join(process.cwd(), 'public', currentProfile.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        avatar: avatarPath
      },
      create: {
        userId,
        avatar: avatarPath
      }
    });

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarPath
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    
    if (req.file) {
      const filePath = req.file.path;
      // Validate and restrict file deletion to AVATARS_DIR only
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.startsWith(AVATARS_DIR) && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/profile/avatar', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;

    const currentProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!currentProfile?.avatar) {
      return res.status(400).json({ error: 'No avatar to delete' });
    }

    const avatarPath = path.join(process.cwd(), 'public', currentProfile.avatar);
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    await prisma.profile.update({
      where: { userId },
      data: {
        avatar: null
      }
    });

    res.json({
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/account/delete', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    if (currentUser.profile?.avatar) {
      const avatarPath = path.join(process.cwd(), 'public', currentUser.profile.avatar);
      if (fs.existsSync(avatarPath)) {
        try {
          fs.unlinkSync(avatarPath);
        } catch (error) {
          console.warn('Failed to delete avatar file:', error);
        }
      }
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    req.session.destroy((err: any) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;