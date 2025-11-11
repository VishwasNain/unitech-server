const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Order extends Model {
    static associate(models) {
      // Order belongs to User
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      // Order has many OrderItems
      Order.hasMany(models.OrderItem, {
        foreignKey: 'orderId',
        as: 'items'
      });

      // Order has one ShippingAddress (for shipping)
      Order.hasOne(models.ShippingAddress, {
        foreignKey: 'orderId',
        as: 'shippingAddress',
        scope: { addressType: 'shipping' }
      });

      // Order has one ShippingAddress (for billing)
      Order.hasOne(models.ShippingAddress, {
        foreignKey: 'orderId',
        as: 'billingAddress',
        scope: { addressType: 'billing' }
      });
    }

    // Instance method to calculate order age in days
    getOrderAge() {
      return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
    }

    // Static method to generate unique order number
    static generateOrderNumber() {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `UT${timestamp.slice(-6)}${random}`;
    }

    // Static method to get user's orders
    static async getUserOrders(userId, limit = 10, offset = 0) {
      return this.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: this.sequelize.models.OrderItem,
            as: 'items',
            include: [{
              model: this.sequelize.models.Product,
              as: 'product'
            }]
          }
        ]
      });
    }

    // Static method to get orders by status
    static getOrdersByStatus(status, limit = 20) {
      return this.findAll({
        where: { orderStatus: status },
        order: [['createdAt', 'DESC']],
        limit,
        include: [
          {
            model: this.sequelize.models.User,
            attributes: ['name', 'email', 'mobile']
          }
        ]
      });
    }

    // Static method to update order status
    static async updateOrderStatus(orderId, status, trackingNumber = null) {
      const order = await this.findByPk(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      const updateData = { orderStatus: status };
      
      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      await order.update(updateData);
      return order.reload();
    }

    // Static method to get order statistics
    static async getOrderStats(startDate, endDate) {
      const where = {};
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[sequelize.Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[sequelize.Op.lte] = new Date(endDate);
      }

      // Get basic stats
      const stats = await this.findOne({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
          [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
          [sequelize.fn('AVG', sequelize.col('total')), 'avgOrderValue']
        ],
        raw: true
      });

      // Get total items ordered
      const itemsResult = await this.sequelize.models.OrderItem.findOne({
        include: [{
          model: this,
          as: 'order',
          where: where,
          required: true,
          attributes: []
        }],
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalItems']
        ],
        raw: true
      });

      // Get status distribution
      const statusDist = await this.findAll({
        where,
        attributes: [
          'orderStatus as status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['orderStatus'],
        raw: true
      });

      // Get payment method distribution
      const paymentDist = await this.findAll({
        where,
        attributes: [
          'paymentMethod as method',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['paymentMethod'],
        raw: true
      });

      return [{
        ...stats,
        totalItems: itemsResult ? parseInt(itemsResult.totalItems, 10) : 0,
        statusDistribution: statusDist,
        paymentMethodDistribution: paymentDist
      }];
    }
  }

  Order.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'upi', 'netbanking', 'cod', 'wallet'),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    orderStatus: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded'
      ),
      defaultValue: 'pending'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Subtotal cannot be negative'
        }
      }
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Tax cannot be negative'
        }
      }
    },
    shipping: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Shipping cost cannot be negative'
        }
      }
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Discount cannot be negative'
        }
      }
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Total cannot be negative'
        }
      }
    },
    coupon: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isGift: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    giftMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    placedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (order) => {
        if (!order.orderNumber) {
          order.orderNumber = Order.generateOrderNumber();
        }
        
        if (!order.estimatedDelivery) {
          // Set estimated delivery to 7 days from now
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + 7);
          order.estimatedDelivery = deliveryDate;
        }
      }
    },
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['order_number'], unique: true },
      { fields: ['order_status'] },
      { fields: ['payment_status'] }
    ]
  });

  return Order;
};
