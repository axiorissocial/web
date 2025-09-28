import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { createNotification, createMentionNotifications } from './notifications.js';

const viewCache = new Map<string, number>();

// Helper function to delete media files
const deleteMediaFiles = (mediaItems: any[]): void => {
  if (!Array.isArray(mediaItems)) return;
  
  mediaItems.forEach(mediaItem => {
    if (mediaItem && mediaItem.url) {
      try {
        const filePath = path.join(process.cwd(), 'public', mediaItem.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted media file: ${mediaItem.url}`);
        }
      } catch (error) {
        console.error(`Failed to delete media file ${mediaItem.url}:`, error);
      }
    }
  });
};

// Media upload configuration
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `media-${uniqueSuffix}${ext}`);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per post
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      // Additional checks for specific formats
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
      
      if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM, MOV, AVI videos are allowed.'));
      }
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

const processCommentsWithLikes = (comments: any[], userId?: string) => {
  return comments.map(comment => {
    const processedComment = {
      ...comment,
      isLiked: userId ? comment.likes.length > 0 : false,
      likesCount: comment._count.likes,
      likes: undefined,
      _count: undefined,
    };
    
    if (comment.replies && comment.replies.length > 0) {
      processedComment.replies = processCommentsWithLikes(comment.replies, userId);
    }
    
    return processedComment;
  });
};

const router = Router();

router.get('/posts', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const userId = req.query.userId as string;

    const skip = (page - 1) * limit;

    const where: any = {
      isPrivate: false,
    };

    if (search) {
      where.OR = [
        { content: { contains: search } },
        { title: { contains: search } },
        { user: { username: { contains: search } } },
      ];
    }

    if (userId) {
      where.userId = userId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        },
        likes: {
          select: {
            userId: true,
          }
        },
        _count: {
          select: {
            likes: true,
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit,
    });

    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: req.userId ? post.likes.some(like => like.userId === req.userId) : false,
      likes: undefined,
    }));

    const totalPosts = await prisma.post.count({ where });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: postsWithLikeStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/posts/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findFirst({
      where: {
        id,
        isPrivate: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        },
        likes: {
          select: {
            userId: true,
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          }
        }
      },
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userAgent = req.get('User-Agent') || '';
    const clientIP = req.ip || req.connection.remoteAddress || '';
    const sessionId = req.userId ? `user_${req.userId}` : `${clientIP}_${userAgent.slice(0, 50)}`;
    
    const viewKey = `${sessionId}_${id}`;
    const lastViewTime = viewCache.get(viewKey);
    const now = Date.now();
    
    if (!lastViewTime || (now - lastViewTime) > 30 * 60 * 1000) {
      await prisma.post.update({
        where: { id },
        data: { viewsCount: { increment: 1 } }
      });
      
      viewCache.set(viewKey, now);
      
      if (viewCache.size > 10000) {
        const entries = Array.from(viewCache.entries()) as [string, number][];
        entries.sort((a, b) => a[1] - b[1]);
        viewCache.clear();
        entries.slice(-5000).forEach(([key, time]) => {
          viewCache.set(key, time);
        });
      }
    }

    const postWithLikeStatus = {
      ...post,
      isLiked: req.userId ? post.likes.some(like => like.userId === req.userId) : false,
      likes: undefined,
    };

    res.json(postWithLikeStatus);

  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Media upload endpoint
router.post('/posts/media', requireAuth, mediaUpload.array('media', 5), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const mediaUrls = files.map(file => {
      const mediaUrl = `/uploads/media/${file.filename}`;
      return {
        url: mediaUrl,
        type: file.mimetype.startsWith('image/') ? 'image' : 'video',
        originalName: file.originalname,
        size: file.size
      };
    });

    res.json({
      success: true,
      media: mediaUrls
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media files' });
  }
});

router.post('/posts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, title, isPrivate = false, media } = req.body;
    const userId = req.userId!;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: 'Post content must be 1000 characters or less' });
    }

    let slug = null;
    if (title) {
      slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const existingPost = await prisma.post.findUnique({ where: { slug } });
      if (existingPost) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        title: title?.trim() || null,
        slug,
        isPrivate: Boolean(isPrivate),
        media: media || null, // Store media as JSON
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
          }
        }
      }
    });

    // Create mention notifications for any @mentions in the post
    await createMentionNotifications(content, userId, post.id);

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...post,
        isLiked: false,
      }
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/posts/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const post = await prisma.post.findFirst({
      where: {
        id,
        isPrivate: false,
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: id,
        }
      }
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({
          where: {
            userId_postId: {
              userId,
              postId: id,
            }
          }
        }),
        prisma.post.update({
          where: { id },
          data: { likesCount: { decrement: 1 } }
        })
      ]);

      res.json({ message: 'Post unliked', isLiked: false });
    } else {
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            postId: id,
          }
        }),
        prisma.post.update({
          where: { id },
          data: { likesCount: { increment: 1 } }
        })
      ]);

      // Create notification for post author (if not liking own post)
      if (post.userId !== userId) {
        await createNotification(
          'LIKE',
          userId,
          post.userId,
          id
        );
      }

      res.json({ message: 'Post liked', isLiked: true });
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/users/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const currentUserId = req.session?.userId;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { profile: { displayName: { contains: query } } },
        ]
      },
      select: {
        id: true,
        username: true,
        bio: true,
        isVerified: true,
        profile: {
          select: {
            displayName: true,
            avatar: true,
          }
        },
        _count: {
          select: {
            posts: true,
            followers: true,
          }
        },
        followers: currentUserId ? {
          where: {
            followerId: currentUserId
          },
          select: {
            id: true
          }
        } : false
      },
      skip,
      take: limit,
      orderBy: {
        username: 'asc',
      }
    });

    // Add isFollowing field to each user
    const usersWithFollowStatus = users.map(user => ({
      ...user,
      isFollowing: currentUserId ? user.followers.length > 0 : false,
      followers: undefined // Remove followers array from response
    }));

    const totalUsers = await prisma.user.count({
      where: {
        OR: [
          { username: { contains: query } },
          { profile: { displayName: { contains: query } } },
        ]
      }
    });

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users: usersWithFollowStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/posts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.session!.userId!;
    const { title, content, media } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ error: 'Content is too long (max 10,000 characters)' });
    }

    if (title && title.length > 200) {
      return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    // If media is being updated, handle deletion of old media files
    if (media !== undefined && existingPost.media) {
      try {
        const oldMedia = existingPost.media as any;
        deleteMediaFiles(oldMedia);
      } catch (error) {
        console.error('Error deleting old media files:', error);
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title || null,
        content: content.trim(),
        media: media !== undefined ? media : undefined,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        },
        likes: {
          select: { userId: true },
          where: { userId }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          }
        }
      }
    });

    const response = {
      ...updatedPost,
      isLiked: updatedPost.likes.length > 0,
      likesCount: updatedPost._count.likes,
    };

    res.json(response);

  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/posts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.session!.userId!;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete associated media files before deleting the post
    if (existingPost.media) {
      try {
        const mediaItems = existingPost.media as any;
        deleteMediaFiles(mediaItems);
      } catch (mediaError) {
        console.error('Error deleting media files:', mediaError);
        // Continue with post deletion even if media cleanup fails
      }
    }

    // Delete related data that might prevent post deletion
    // Note: Comments should cascade delete due to onDelete: Cascade in schema
    // But Likes don't have onDelete: Cascade, so we need to delete them manually
    await prisma.like.deleteMany({
      where: { postId }
    });

    // Delete the post (comments should cascade delete automatically)
    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return res.status(400).json({ 
          error: 'Cannot delete post: it has associated data that prevents deletion',
          details: 'Please try again or contact support if this issue persists'
        });
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Utility endpoint to clean up orphaned media files (admin use)
router.post('/posts/cleanup-media', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add admin role check here when user roles are implemented
    // For now, any authenticated user can clean up orphaned media
    
    const mediaDir = path.join(process.cwd(), 'public', 'uploads', 'media');
    
    if (!fs.existsSync(mediaDir)) {
      return res.json({ message: 'Media directory does not exist', deleted: 0 });
    }

    // Get all media files
    const files = fs.readdirSync(mediaDir);
    
    // Get all media URLs from database
    const posts = await prisma.post.findMany({
      select: { media: true }
    });
    
    const usedFiles = new Set<string>();
    posts.forEach(post => {
      if (post.media && Array.isArray(post.media)) {
        (post.media as any[]).forEach(mediaItem => {
          if (mediaItem.url) {
            const filename = path.basename(mediaItem.url);
            usedFiles.add(filename);
          }
        });
      }
    });
    
    // Delete unused files
    let deletedCount = 0;
    files.forEach(filename => {
      if (!usedFiles.has(filename) && filename.startsWith('media-')) {
        // Only delete files that start with 'media-' to avoid deleting other files
        const filePath = path.join(mediaDir, filename);
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Cleaned up orphaned media file: ${filename}`);
        } catch (error) {
          console.error(`Failed to delete orphaned media file ${filename}:`, error);
        }
      }
    });
    
    res.json({ 
      message: `Media cleanup completed`, 
      deleted: deletedCount,
      total: files.length,
      remaining: files.length - deletedCount
    });

  } catch (error) {
    console.error('Error during media cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/posts/:id/comments', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await prisma.comment.findMany({
      where: { 
        postId,
        parentId: null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        },
        likes: req.userId ? {
          where: { userId: req.userId }
        } : false,
        _count: {
          select: {
            likes: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatar: true,
                  }
                }
              }
            },
            likes: req.userId ? {
              where: { userId: req.userId }
            } : false,
            _count: {
              select: {
                likes: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    profile: {
                      select: {
                        displayName: true,
                        avatar: true,
                      }
                    }
                  }
                },
                likes: req.userId ? {
                  where: { userId: req.userId }
                } : false,
                _count: {
                  select: {
                    likes: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const totalComments = await prisma.comment.count({
      where: { 
        postId,
        parentId: null
      }
    });

    const totalPages = Math.ceil(totalComments / limit);

    const processedComments = processCommentsWithLikes(comments, req.userId);

    res.json({
      comments: processedComments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.session!.userId!;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1,000 characters)' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      if (parentComment.postId !== postId) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        userId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              }
            }
          }
        }
      }
    });

    // Create mention notifications for any @mentions in the comment
    await createMentionNotifications(content, userId, postId, comment.id);

    // Create notifications
    if (parentId) {
      // Reply notification - notify parent comment author
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true }
      });
      
      if (parentComment && parentComment.userId !== userId) {
        await createNotification(
          'REPLY',
          userId,
          parentComment.userId,
          postId,
          comment.id
        );
      }
    } else {
      // Comment notification - notify post author
      if (post.userId !== userId) {
        await createNotification(
          'COMMENT',
          userId,
          post.userId,
          postId,
          comment.id
        );
      }
    }

    res.status(201).json(comment);

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/posts/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.session!.userId;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.like.deleteMany({
      where: {
        postId,
        userId,
      }
    });

    const likesCount = await prisma.like.count({
      where: { postId }
    });

    res.json({ 
      message: 'Post unliked successfully',
      likesCount,
      isLiked: false
    });

  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/comments/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.session!.userId!;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      }
    });

    if (existingLike) {
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId
          }
        }
      });

      await prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } }
      });

      res.json({ 
        message: 'Comment unliked successfully',
        isLiked: false
      });
    } else {
      await prisma.commentLike.create({
        data: {
          userId,
          commentId
        }
      });

      await prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } }
      });

      // Create notification for comment author (if not liking own comment)
      if (comment.userId !== userId) {
        await createNotification(
          'COMMENT_LIKE',
          userId,
          comment.userId,
          comment.postId,
          commentId
        );
      }

      res.json({ 
        message: 'Comment liked successfully',
        isLiked: true
      });
    }

  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit a comment
router.put('/comments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long. Maximum 1000 characters allowed.' });
    }

    // First, check if the comment exists and belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, content: true }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Check if content actually changed
    if (existingComment.content === content.trim()) {
      return res.status(400).json({ error: 'No changes detected' });
    }

    // Update the comment with new content and editedAt timestamp
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        editedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        },
        likes: userId ? {
          where: { userId },
          take: 1
        } : false
      }
    });

    // Process mentions in the updated comment
    if (content.includes('@')) {
      await createMentionNotifications(content, userId, updatedComment.postId, updatedComment.id);
    }

    // Format the response
    const response = {
      ...updatedComment,
      isLiked: userId ? updatedComment.likes.length > 0 : false,
      likesCount: updatedComment._count.likes,
      repliesCount: updatedComment._count.replies
    };

    // Remove the _count and likes array from response  
    delete (response as any)._count;
    delete (response as any).likes;

    res.json(response);

  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a comment
router.delete('/comments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.id;

    // First, check if the comment exists and belongs to the user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete the comment (replies will cascade delete due to schema)
    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;