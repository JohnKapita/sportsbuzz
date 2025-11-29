const express = require('express');
const { auth, requireAdmin } = require('./auth');
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const emailService = require('../utils/emailService');

const router = express.Router();

// Get comments for article
router.get('/article/:articleId', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      article: req.params.articleId,
      approved: true 
    })
    .sort({ createdAt: -1 })
    .populate('article', 'title');

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch comments' 
    });
  }
});

// Create comment
router.post('/', async (req, res) => {
  try {
    const { article, user, email, text } = req.body;

    // Validation
    if (!article || !user || !email || !text) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    const comment = new Comment({
      article,
      user,
      email,
      text,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await comment.save();

    // Send email notification to admin
    try {
      const articleDoc = await Article.findById(article);
      if (articleDoc) {
        await emailService.sendNewCommentNotification(comment, articleDoc);
      }
    } catch (emailError) {
      console.error('Comment notification email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      comment,
      message: 'Comment submitted for review'
    });

  } catch (error) {
    console.error('Create comment error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to create comment' 
    });
  }
});

// Get all comments (admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, approved } = req.query;
    
    const query = {};
    if (approved !== undefined) {
      query.approved = approved === 'true';
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('article', 'title');

    const total = await Comment.countDocuments(query);

    res.json({
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch comments' 
    });
  }
});

// Approve comment (admin only)
router.patch('/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    ).populate('article', 'title');

    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    res.json({
      success: true,
      comment,
      message: 'Comment approved successfully'
    });

  } catch (error) {
    console.error('Approve comment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to approve comment' 
    });
  }
});

// Delete comment (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);

    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete comment' 
    });
  }
});

module.exports = router;