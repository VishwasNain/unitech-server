const { Model, DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class Newsletter extends Model {
    static associate(models) {
      // Define associations here if needed
    }

    // Static method to generate unsubscribe token
    static generateUnsubscribeToken() {
      return crypto.randomBytes(32).toString('hex');
    }

    // Static method to get active subscribers
    static async getActiveSubscribers(limit = 1000) {
      return this.findAll({
        where: {
          isActive: true,
          '$preferences.newsletters$': true
        },
        limit: limit,
        raw: true
      });
    }

    // Static method to get subscribers by source
    static getSubscribersBySource(source) {
      return this.findAll({
        where: { subscriptionSource: source }
      });
    }

    // Static method to unsubscribe user
    static async unsubscribe(token) {
      const subscriber = await this.findOne({ 
        where: { unsubscribeToken: token } 
      });
      
      if (!subscriber) {
        throw new Error('Invalid unsubscribe token');
      }
      
      await subscriber.update({
        isActive: false,
        preferences: {
          ...subscriber.preferences,
          newsletters: false
        }
      });
      
      return { success: true, email: subscriber.email };
    }

    // Static method to update email engagement
    static async updateEngagement(email, type) {
      const updateData = { lastEngagement: new Date() };
      
      if (type === 'open') {
        updateData.openCount = sequelize.literal('open_count + 1');
      } else if (type === 'click') {
        updateData.clickCount = sequelize.literal('click_count + 1');
      }
      
      const [updated] = await this.update(updateData, {
        where: { email },
        returning: true,
        plain: true
      });
      
      return updated;
    }

    // Static method to get engagement statistics
    static async getEngagementStats() {
      const result = await this.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalSubscribers'],
          [
            sequelize.literal(`COUNT(CASE WHEN is_active = true AND (preferences->>'newsletters')::boolean = true THEN 1 END)`),
            'activeSubscribers'
          ],
          [sequelize.fn('SUM', sequelize.col('open_count')), 'totalOpens'],
          [sequelize.fn('SUM', sequelize.col('click_count')), 'totalClicks']
        ],
        raw: true
      });

      const stats = result[0] || {
        totalSubscribers: 0,
        activeSubscribers: 0,
        totalOpens: 0,
        totalClicks: 0
      };

      // Get source distribution
      const sources = await this.findAll({
        attributes: [
          'subscriptionSource',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['subscriptionSource'],
        raw: true
      });

      // Calculate rates
      const openRate = stats.totalSubscribers > 0 
        ? stats.totalOpens / stats.totalSubscribers 
        : 0;
      
      const clickRate = stats.totalSubscribers > 0 
        ? stats.totalClicks / stats.totalSubscribers 
        : 0;
      
      const ctr = stats.totalOpens > 0 
        ? (stats.totalClicks / stats.totalOpens) * 100 
        : 0;

      return {
        ...stats,
        openRate,
        clickRate,
        ctr,
        sourceDistribution: sources.map(source => ({
          source: source.subscriptionSource,
          count: parseInt(source.count, 10)
        }))
      };
    }
  }

  Newsletter.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    lastEngagement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    openCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clickCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Newsletter',
    tableName: 'newsletters',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: (newsletter) => {
        if (!newsletter.unsubscribeToken) {
          newsletter.unsubscribeToken = Newsletter.generateUnsubscribeToken();
        }
      }
    },
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['unsubscribe_token'], unique: true },
      { 
        name: 'newsletters_is_active',
        fields: ['is_active'],
        where: { is_active: true }
      },
      {
        name: 'newsletters_preferences_newsletters',
        fields: [sequelize.literal("(preferences->>'newsletters')::boolean")],
        where: { is_active: true }
      }
    ]
  });

  return Newsletter;
};
