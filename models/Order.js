module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    orderNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'paypal', 'stripe', 'cod', 'bank_transfer'),
      allowNull: false
    },
    paymentId: {
      type: DataTypes.STRING
    },
    paymentStatus: {
      type: DataTypes.STRING
    },
    paymentUpdateTime: {
      type: DataTypes.STRING
    },
    paymentEmail: {
      type: DataTypes.STRING
    },
    itemsPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    taxPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    shippingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paidAt: {
      type: DataTypes.DATE
    },
    isDelivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deliveredAt: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    trackingNumber: {
      type: DataTypes.STRING
    },
    notes: {
      type: DataTypes.TEXT
    },
    couponCode: {
      type: DataTypes.STRING
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0
    },
    refundStatus: {
      type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected', 'processed'),
      defaultValue: 'none'
    },
    refundReason: {
      type: DataTypes.TEXT
    },
    refundRequestedAt: {
      type: DataTypes.DATE
    },
    refundProcessedAt: {
      type: DataTypes.DATE
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0
    },
    shippingAddressId: {
      type: DataTypes.UUID,
      references: {
        model: 'Addresses',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    hooks: {
      beforeCreate: async (order) => {
        if (!order.orderNumber) {
          order.orderNumber = 'ORD' + 
            Date.now().toString().slice(-6) + 
            Math.floor(1000 + Math.random() * 9000);
        }
      }
    }
  });

  // Class Methods
  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Order.belongsTo(models.Address, {
      foreignKey: 'shippingAddressId',
      as: 'shippingAddress'
    });
    
    Order.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
    
    Order.hasMany(models.OrderStatus, {
      foreignKey: 'orderId',
      as: 'statusHistory'
    });
  };

  // Instance Methods
  Order.prototype.getUserOrders = async function(userId, limit = 10, offset = 0) {
    return Order.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: this.sequelize.models.User, attributes: ['id', 'name', 'email'] },
        { 
          model: this.sequelize.models.OrderItem, 
          as: 'items',
          include: [
            { 
              model: this.sequelize.models.Product, 
              attributes: ['id', 'name', 'price', 'image'] 
            }
          ]
        }
      ]
    });
  };

  Order.getOrdersByStatus = async function(status, limit = 20) {
    return this.findAll({
      where: { status },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        { model: this.sequelize.models.User, attributes: ['id', 'name', 'email'] }
      ]
    });
  };

  Order.updateOrderStatus = async function(orderId, status, trackingNumber = null) {
    const order = await this.findByPk(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const updates = { status };
    
    if (status === 'delivered') {
      updates.isDelivered = true;
      updates.deliveredAt = new Date();
    }
    
    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }
    
    await order.update(updates);
    
    // Create status history record
    await this.sequelize.models.OrderStatus.create({
      orderId: order.id,
      status,
      notes: `Status changed to ${status}`
    });
    
    return order.reload({
      include: [
        { model: this.sequelize.models.User, attributes: ['id', 'name', 'email'] },
        { model: this.sequelize.models.OrderItem, as: 'items' }
      ]
    });
  };

  return Order;
};
