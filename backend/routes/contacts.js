const express = require('express');
const { auth, requireAdmin } = require('./auth');
const Contact = require('../models/Contact');
const emailService = require('../utils/emailService');

const router = express.Router();

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and message are required' 
      });
    }

    const contact = new Contact({
      name,
      email,
      subject: subject || 'No subject',
      message,
      ipAddress: req.ip
    });

    await contact.save();

    // Send email notification to admin
    try {
      await emailService.sendContactFormNotification(contact);
    } catch (emailError) {
      console.error('Contact form notification email failed:', emailError);
    }

    res.status(201).json({ 
      success: true,
      message: 'Message sent successfully. We will get back to you soon!'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to send message' 
    });
  }
});

// Get all contact messages (admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, read, replied } = req.query;
    
    const query = {};
    if (read !== undefined) {
      query.read = read === 'true';
    }
    if (replied !== undefined) {
      query.replied = replied === 'true';
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Contact.countDocuments(query);
    const unreadCount = await Contact.countDocuments({ read: false });

    res.json({
      success: true,
      contacts,
      statistics: {
        total,
        unread: unreadCount
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalContacts: total
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch contacts' 
    });
  }
});

// Mark contact as read (admin only)
router.patch('/:id/read', auth, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact message not found' 
      });
    }

    res.json({
      success: true,
      contact,
      message: 'Contact marked as read'
    });

  } catch (error) {
    console.error('Mark contact as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update contact' 
    });
  }
});

// Mark contact as replied (admin only)
router.patch('/:id/replied', auth, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { replied: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact message not found' 
      });
    }

    res.json({
      success: true,
      contact,
      message: 'Contact marked as replied'
    });

  } catch (error) {
    console.error('Mark contact as replied error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update contact' 
    });
  }
});

// Delete contact message (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact message not found' 
      });
    }

    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete contact message' 
    });
  }
});

module.exports = router;