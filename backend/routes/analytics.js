const express = require('express');
const { auth, requireAdmin } = require('./auth');
const Analytics = require('../models/Analytics');
const Article = require('../models/Article');
const Subscriber = require('../models/Subscriber');
const Comment = require('../models/Comment');
const Contact = require('../models/Contact');

const router = express.Router();

// Get analytics overview
router.get('/overview', auth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Analytics overview requested');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // FIXED: Correct date calculations
    const startOfToday = new Date(today);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    console.log('📅 Date ranges:', {
      today: startOfToday,
      week: startOfWeek, 
      month: startOfMonth
    });

    // Get or create today's analytics
    let todayAnalytics = await Analytics.findOne({ date: startOfToday });
    if (!todayAnalytics) {
      todayAnalytics = new Analytics({ 
        date: startOfToday,
        totalViews: 0,
        articleViews: new Map(),
        categoryViews: new Map()
      });
      await todayAnalytics.save();
      console.log('✅ Created today analytics record');
    }

    // FIXED: Better aggregation with error handling
    const weekAnalytics = await Analytics.aggregate([
      { 
        $match: { 
          date: { 
            $gte: startOfWeek,
            $lte: today
          } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalViews: { $sum: '$totalViews' },
          days: { $push: { date: '$date', views: '$totalViews' } }
        }
      }
    ]);

    const monthAnalytics = await Analytics.aggregate([
      { 
        $match: { 
          date: { 
            $gte: startOfMonth,
            $lte: today
          } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalViews: { $sum: '$totalViews' },
          days: { $push: { date: '$date', views: '$totalViews' } }
        }
      }
    ]);

    // Get top articles by views
    const topArticles = await Article.find({ published: true })
      .sort({ views: -1 })
      .limit(10)
      .select('title views category createdAt featured');
    console.log('📝 Top articles:', topArticles.length);

    // Get category distribution - FIXED: Handle empty results
    let categoryStats = [];
    try {
      categoryStats = await Article.aggregate([
        { $match: { published: true } },
        { $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }},
        { $sort: { totalViews: -1 } }
      ]);
    } catch (aggError) {
      console.warn('Category aggregation failed:', aggError);
      categoryStats = [];
    }

    // Get last 30 days view data for chart
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    last30Days.setHours(0, 0, 0, 0);
    
    const dailyViews = await Analytics.find({ 
      date: { $gte: last30Days } 
    }).sort({ date: 1 }).select('date totalViews -_id');

    // Format daily views for chart
    const formattedDailyViews = dailyViews.map(day => ({
      date: day.date.toISOString().split('T')[0],
      views: day.totalViews || 0
    }));

    // Get total counts for other sections
    const totalArticles = await Article.countDocuments({ published: true });
    const totalSubscribers = await Subscriber.countDocuments({ active: true });
    const totalComments = await Comment.countDocuments();
    const totalContacts = await Contact.countDocuments();

    console.log('📊 Total counts:', {
      articles: totalArticles,
      subscribers: totalSubscribers,
      comments: totalComments,
      contacts: totalContacts
    });

    // FIXED: Ensure all data has fallback values
    const responseData = {
      success: true,
      analytics: {
        today: {
          views: todayAnalytics.totalViews || 0,
          articles: todayAnalytics.articleViews ? todayAnalytics.articleViews.size : 0
        },
        week: {
          views: weekAnalytics.length > 0 ? (weekAnalytics[0].totalViews || 0) : 0,
          days: weekAnalytics.length > 0 ? (weekAnalytics[0].days || []) : []
        },
        month: {
          views: monthAnalytics.length > 0 ? (monthAnalytics[0].totalViews || 0) : 0,
          days: monthAnalytics.length > 0 ? (monthAnalytics[0].days || []) : []
        },
        topArticles: topArticles || [],
        categoryStats: categoryStats || [],
        dailyViews: formattedDailyViews || [],
        totals: {
          articles: totalArticles || 0,
          subscribers: totalSubscribers || 0,
          comments: totalComments || 0,
          contacts: totalContacts || 0
        }
      }
    };

    console.log('✅ Analytics response ready');
    res.json(responseData);

  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message 
    });
  }
});

// Create test data for fresh installation
router.post('/create-test-data', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🎯 Creating test analytics data...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create data for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      // Create or update analytics for this date
      await Analytics.findOneAndUpdate(
        { date: date },
        { 
          totalViews: Math.floor(Math.random() * 100) + 50,
          articleViews: new Map([['sample_article', Math.floor(Math.random() * 20) + 10]]),
          categoryViews: new Map([['football', Math.floor(Math.random() * 30) + 15]])
        },
        { upsert: true, new: true }
      );
    }
    
    console.log('✅ Test analytics data created for 30 days');
    res.json({ 
      success: true, 
      message: 'Test analytics data created successfully' 
    });
    
  } catch (error) {
    console.error('❌ Create test data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create test data',
      error: error.message 
    });
  }
});

// Get detailed view analytics for a specific period
router.get('/views/:period', auth, requireAdmin, async (req, res) => {
  try {
    const { period } = req.params;
    let startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);

    const analytics = await Analytics.find({ date: { $gte: startDate } })
      .sort({ date: 1 })
      .select('date totalViews');

    res.json({
      success: true,
      period,
      data: analytics
    });

  } catch (error) {
    console.error('Get view analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch view analytics' 
    });
  }
});

// Get article performance analytics
router.get('/articles/performance', auth, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, period = 'all' } = req.query;
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = null;
    }

    const query = { published: true };
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startDate };
    }

    const articles = await Article.find(query)
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .select('title category views createdAt featured');

    res.json({
      success: true,
      articles
    });

  } catch (error) {
    console.error('Get article performance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch article performance' 
    });
  }
});

module.exports = router;