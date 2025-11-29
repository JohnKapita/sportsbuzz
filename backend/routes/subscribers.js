const express = require('express');
const Subscriber = require('../models/Subscriber');
const { auth, requireAdmin } = require('./auth');
const emailService = require('../utils/emailService'); // FIXED: Correct import

const router = express.Router();

// Get all subscribers (admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const subscribers = await Subscriber.find()
      .sort({ createdAt: -1 })
      .select('email active createdAt');
    
    res.json({
      success: true,
      subscribers,
      total: subscribers.length
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscribers' 
    });
  }
});

// Subscribe to newsletter
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already subscribed' 
      });
    }

    const subscriber = new Subscriber({
      email,
      ipAddress: req.ip
    });

    await subscriber.save();

    // Send welcome email - FIXED: Use emailService
    try {
      await emailService.sendWelcomeEmail(email);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail subscription if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email address' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to subscribe' 
    });
  }
});

// Unsubscribe from newsletter
router.delete('/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      { active: false },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ 
        success: false,
        message: 'Subscriber not found' 
      });
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to unsubscribe' 
    });
  }
});

module.exports = router;