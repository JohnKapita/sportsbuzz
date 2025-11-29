const express = require('express');
const { auth, requireAdmin } = require('./auth');
const Article = require('../models/Article');
const Subscriber = require('../models/Subscriber');
const Analytics = require('../models/Analytics');
const Comment = require('../models/Comment');
const emailService = require('../utils/emailService'); // FIXED: Correct import

const router = express.Router();

// Get all published articles with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      category = 'all', 
      page = 1, 
      limit = 12, 
      featured,
      search 
    } = req.query;

    // Build query
    const query = { published: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-__v'
    };

    // Execute query with pagination
    const articles = await Article.find(query)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .select(options.select);

    const total = await Article.countDocuments(query);
    const totalPages = Math.ceil(total / options.limit);

    res.json({
      success: true,
      articles,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalArticles: total,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });

  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch articles' 
    });
  }
});

// Get featured articles
router.get('/featured', async (req, res) => {
  try {
    const featuredArticles = await Article.find({ 
      published: true, 
      featured: true 
    })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('title image category createdAt views');

    res.json({
      success: true,
      articles: featuredArticles
    });
  } catch (error) {
    console.error('Get featured articles error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch featured articles' 
    });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article || !article.published) {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }

    // Record view in article and analytics
    await article.recordView();
    
    // Record in daily analytics
    const analytics = await Analytics.getTodayAnalytics();
    await analytics.recordView(article._id, article.category);

    res.json({
      success: true,
      article
    });

  } catch (error) {
    console.error('Get article error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch article' 
    });
  }
});

// Get articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const { category } = req.params;

    const articles = await Article.find({ 
      category, 
      published: true 
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Article.countDocuments({ 
      category, 
      published: true 
    });

    res.json({
      success: true,
      articles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total
      }
    });

  } catch (error) {
    console.error('Get articles by category error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch articles' 
    });
  }
});

// Create article (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { title, content, category, image, author, featured, tags } = req.body;

    // Validation
    if (!title || !content || !category) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, content, and category are required' 
      });
    }

    const articleData = {
      title,
      content,
      category,
      image: image || '',
      author: author || 'Admin',
      featured: featured || false,
      tags: tags || []
    };

    const article = new Article(articleData);
    await article.save();

    // Send email notifications to subscribers - FIXED: Use emailService
    try {
      const subscribers = await Subscriber.find({ active: true });
      if (subscribers.length > 0) {
        await emailService.sendNewArticleNotification(article, subscribers);
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the article creation if email fails
    }

    res.status(201).json({
      success: true,
      article,
      message: 'Article published successfully'
    });

  } catch (error) {
    console.error('Create article error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to create article' 
    });
  }
});

// Update article (admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }

    res.json({
      success: true,
      article,
      message: 'Article updated successfully'
    });

  } catch (error) {
    console.error('Update article error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to update article' 
    });
  }
});

// Delete article (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete article' 
    });
  }
});

// Get all articles for admin with views
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('title category views createdAt published featured');

    const total = await Article.countDocuments(query);

    res.json({
      success: true,
      articles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total
      }
    });

  } catch (error) {
    console.error('Get admin articles error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch articles' 
    });
  }
});

// Get comments for specific article
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      article: req.params.id,
      approved: true 
    })
    .sort({ createdAt: -1 })
    .select('user text createdAt');

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Get article comments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch comments' 
    });
  }
});

module.exports = router;