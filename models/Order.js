const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  name: String,
  image: String
});

const shippingAddressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'cod', 'wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  orderStatus: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned',
      'refunded'
    ],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  coupon: {
    code: String,
    discount: Number,
    discountType: String
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  stripePaymentIntentId: String,
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String,
  placedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to generate unique order number
orderSchema.statics.generateOrderNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `UT${timestamp.slice(-6)}${random}`;
};

// Pre-save middleware to generate order number if not exists
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber();
  }

  // Set estimated delivery (7 days from order)
  if (!this.estimatedDelivery) {
    this.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

// Static method to get user's orders
orderSchema.statics.getUserOrders = function(userId, limit = 10, skip = 0) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('items.product');
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status, limit = 20) {
  return this.find({ orderStatus: status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email mobile');
};

// Static method to update order status
orderSchema.statics.updateOrderStatus = async function(orderId, status, trackingNumber = null) {
  const order = await this.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  order.orderStatus = status;

  if (status === 'delivered') {
    order.deliveredAt = new Date();
  }

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  return order.save();
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = async function(startDate, endDate) {
  const matchStage = {};

  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);
