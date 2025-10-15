const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    productUpdates: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newsletters: {
      type: Boolean,
      default: true
    },
    newArrivals: {
      type: Boolean,
      default: true
    }
  },
  subscriptionSource: {
    type: String,
    enum: ['website', 'popup', 'checkout', 'footer', 'other'],
    default: 'website'
  },
  unsubscribeToken: {
    type: String,
    unique: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: Date,
  lastEmailSent: Date,
  emailOpenCount: {
    type: Number,
    default: 0
  },
  emailClickCount: {
    type: Number,
    default: 0
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ isActive: 1, subscribedAt: -1 });
newsletterSchema.index({ subscriptionSource: 1 });

// Virtual for subscription duration in days
newsletterSchema.virtual('subscriptionDuration').get(function() {
  const endDate = this.unsubscribedAt || new Date();
  return Math.floor((endDate - this.subscribedAt) / (1000 * 60 * 60 * 24));
});

// Static method to generate unsubscribe token
newsletterSchema.statics.generateUnsubscribeToken = function() {
  return require('crypto').randomBytes(32).toString('hex');
};

// Pre-save middleware to generate unsubscribe token
newsletterSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = this.constructor.generateUnsubscribeToken();
  }
  next();
});

// Static method to get active subscribers
newsletterSchema.statics.getActiveSubscribers = function(limit = 1000) {
  return this.find({ isActive: true })
    .sort({ subscribedAt: -1 })
    .limit(limit);
};

// Static method to get subscribers by source
newsletterSchema.statics.getSubscribersBySource = function(source) {
  return this.find({ subscriptionSource: source, isActive: true })
    .sort({ subscribedAt: -1 });
};

// Static method to unsubscribe user
newsletterSchema.statics.unsubscribe = async function(token) {
  const subscriber = await this.findOne({ unsubscribeToken: token });

  if (!subscriber) {
    throw new Error('Invalid unsubscribe token');
  }

  subscriber.isActive = false;
  subscriber.unsubscribedAt = new Date();

  return subscriber.save();
};

// Static method to update email engagement
newsletterSchema.statics.updateEngagement = async function(email, type) {
  const update = {};

  if (type === 'open') {
    update.$inc = { emailOpenCount: 1 };
    update.lastEmailSent = new Date();
  } else if (type === 'click') {
    update.$inc = { emailClickCount: 1 };
    update.lastEmailSent = new Date();
  }

  return this.findOneAndUpdate({ email }, update, { new: true });
};

// Static method to get engagement statistics
newsletterSchema.statics.getEngagementStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
        activeSubscribers: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalOpens: { $sum: '$emailOpenCount' },
        totalClicks: { $sum: '$emailClickCount' },
        avgOpens: { $avg: '$emailOpenCount' },
        avgClicks: { $avg: '$emailClickCount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
