const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const Newsletter = sequelize.define('Newsletter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please provide a valid email'
        },
        notEmpty: {
          msg: 'Email is required'
        }
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: {
          args: [0, 50],
          msg: 'Name cannot be more than 50 characters'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        productUpdates: true,
        promotions: true,
        newsletters: true,
        newArrivals: true
      }
    },
    subscriptionSource: {
      type: DataTypes.ENUM('website', 'popup', 'checkout', 'footer', 'other'),
      defaultValue: 'website'
    },
    unsubscribeToken: {
      type: DataTypes.STRING,
      unique: true
    },
    subscribedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    unsubscribedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastEmailSent: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailOpenCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emailClickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subscriptionDuration: {
      type: DataTypes.VIRTUAL,
      get() {
        const endDate = this.unsubscribedAt || new Date();
        return Math.floor((endDate - this.subscribedAt) / (1000 * 60 * 60 * 24));
      }
    }
  }, {
    tableName: 'newsletters',
    timestamps: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['isActive', 'subscribedAt'], order: [['subscribedAt', 'DESC']] },
      { fields: ['subscriptionSource'] },
      { fields: ['unsubscribeToken'], unique: true }
    ]
  });

  // Class Methods
  Newsletter.associate = (models) => {
    // Add associations here if needed
  };

  // Instance Methods
  Newsletter.prototype.generateUnsubscribeToken = function() {
    return crypto.randomBytes(32).toString('hex');
  };

  // Hooks
  Newsletter.beforeCreate((newsletter) => {
    if (!newsletter.unsubscribeToken) {
      newsletter.unsubscribeToken = crypto.randomBytes(32).toString('hex');
    }
  });

  // Static Methods
  Newsletter.getActiveSubscribers = async function(limit = 1000) {
    return this.findAll({
      where: { isActive: true },
      order: [['subscribedAt', 'DESC']],
      limit: parseInt(limit)
    });
  };

  Newsletter.getSubscribersBySource = function(source) {
    return this.findAll({
      where: { 
        subscriptionSource: source,
        isActive: true 
      }
    });
  };

  Newsletter.unsubscribe = async function(token) {
    const subscriber = await this.findOne({ where: { unsubscribeToken: token } });
    
    if (!subscriber) {
      throw new Error('Invalid unsubscribe token');
    }
    
    return subscriber.update({
      isActive: false,
      unsubscribedAt: new Date()
    });
  };

  Newsletter.updateEngagement = async function(email, type) {
    const subscriber = await this.findOne({ where: { email } });
    if (!subscriber) return null;

    const updates = { lastEmailSent: new Date() };
    
    if (type === 'open') {
      updates.emailOpenCount = subscriber.emailOpenCount + 1;
    } else if (type === 'click') {
      updates.emailClickCount = subscriber.emailClickCount + 1;
    }
    
    return subscriber.update(updates);
  };

  Newsletter.getEngagementStats = async function() {
    const result = await this.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalSubscribers'],
        [
          sequelize.literal('COUNT(CASE WHEN "isActive" = true THEN 1 END)'),
          'activeSubscribers'
        ],
        [sequelize.fn('SUM', sequelize.col('emailOpenCount')), 'totalOpens'],
        [sequelize.fn('SUM', sequelize.col('emailClickCount')), 'totalClicks'],
        [
          sequelize.literal('AVG(CASE WHEN "emailOpenCount" > 0 THEN 1.0 ELSE 0.0 END) * 100'),
          'avgOpenRate'
        ]
      ],
      raw: true
    });

    return result[0] || {};
  };

  return Newsletter;
};
