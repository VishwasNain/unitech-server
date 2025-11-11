const express = require('express');
const { body, validationResult } = require('express-validator');
const Newsletter = require('../models/Newsletter');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  }
  next();
};

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, name } = req.body;

      // Check if already subscribed
      let subscriber = await Newsletter.findOne({ email });

      if (subscriber) {
        if (subscriber.isActive) {
          return res.status(400).json({ message: 'This email is already subscribed' });
        }
        // Reactivate unsubscribed user
        subscriber.isActive = true;
        subscriber.unsubscribedAt = undefined;
        subscriber.name = name || subscriber.name;
        await subscriber.save();
      } else {
        // Create new subscriber
        subscriber = new Newsletter({
          email,
          name,
          subscriptionSource: req.headers.referer || 'other'
        });
        await subscriber.save();
      }

      // Send welcome email
      const welcomeEmail = {
        subject: 'Welcome to Unitech Computers Newsletter',
        content: `
          <h2>Thank you for subscribing to Unitech Computers!</h2>
          <p>You'll now receive our latest updates, offers, and more.</p>
          <p>If you change your mind, you can <a href="{{unsubscribe_url}}">unsubscribe</a> anytime.</p>
        `,
        previewText: 'Welcome to Unitech Computers! Thank you for subscribing to our newsletter.'
      };

      await emailService.sendNewsletter({
        subscribers: [subscriber],
        ...welcomeEmail
      });

      res.status(201).json({
        message: 'Successfully subscribed to newsletter',
        subscriber: {
          email: subscriber.email,
          name: subscriber.name,
          preferences: subscriber.preferences
        }
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({ message: 'Failed to subscribe to newsletter' });
    }
  }
);

// @route   POST /api/newsletter/unsubscribe/:token
// @desc    Unsubscribe from newsletter
// @access  Public
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await Newsletter.unsubscribe(token);

    res.send(`
      <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h2>You have been unsubscribed</h2>
        <p>You have been successfully unsubscribed from our newsletter.</p>
        <p>We're sorry to see you go!</p>
      </div>
    `);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(400).send('Invalid or expired unsubscribe link');
  }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all subscribers (Admin only)
// @access  Private/Admin
router.get('/subscribers', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { page = 1, limit = 20, status } = req.query;

    let query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalSubscribers = await Newsletter.countDocuments(query);
    const totalPages = Math.ceil(totalSubscribers / parseInt(limit));

    res.json({
      subscribers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSubscribers,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ message: 'Failed to fetch subscribers' });
  }
});

// @route   POST /api/newsletter/send
// @desc    Send newsletter to subscribers (Admin only)
// @access  Private/Admin
router.post('/send',
  protect,
  [
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),

    body('content')
      .trim()
      .notEmpty()
      .withMessage('Content is required'),

    body('previewText')
      .optional()
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { subject, content, previewText } = req.body;

      // Get active subscribers
      const subscribers = await Newsletter.find({ isActive: true });

      if (subscribers.length === 0) {
        return res.status(400).json({ message: 'No active subscribers found' });
      }

      // Send newsletter in batches to avoid overwhelming the email service
      const batchSize = 50;
      const batches = Math.ceil(subscribers.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batch = subscribers.slice(i * batchSize, (i + 1) * batchSize);
        
        await emailService.sendNewsletter({
          subscribers: batch,
          subject,
          content,
          previewText
        });

        // Add delay between batches (1 second)
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update lastEmailSent for all subscribers
      await Newsletter.updateMany(
        { _id: { $in: subscribers.map(s => s._id) } },
        { lastEmailSent: new Date() }
      );

      res.json({
        message: `Newsletter sent to ${subscribers.length} subscribers`,
        recipients: subscribers.length
      });
    } catch (error) {
      console.error('Send newsletter error:', error);
      res.status(500).json({ message: 'Failed to send newsletter' });
    }
  }
);

// @route   GET /api/newsletter/stats
// @desc    Get newsletter statistics (Admin only)
// @access  Private/Admin
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Newsletter.getEngagementStats();
    const recentSubscribers = await Newsletter.find({ isActive: true })
      .sort({ subscribedAt: -1 })
      .limit(5);

    res.json({
      stats: stats[0] || {},
      recentSubscribers
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch newsletter statistics' });
  }
});

module.exports = router;
