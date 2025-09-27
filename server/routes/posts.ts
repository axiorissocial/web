import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const viewCache = new Map<string, number>();

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

router.post('/posts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, title, isPrivate = false } = req.body;
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
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        username: 'asc',
      }
    });

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
      users,
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
    const { title, content } = req.body;

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

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title || null,
        content: content.trim(),
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

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
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

export default router;