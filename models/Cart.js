const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  coupon: {
    code: String,
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot be more than 100%']
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
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
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Total price cannot be negative']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subtotal (sum of all item prices)
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for discount amount
cartSchema.virtual('discountAmount').get(function() {
  if (!this.coupon || !this.coupon.discount) return 0;

  const subtotal = this.subtotal;
  if (this.coupon.discountType === 'percentage') {
    return (subtotal * this.coupon.discount) / 100;
  } else {
    return Math.min(this.coupon.discount, subtotal);
  }
});

// Virtual for final total
cartSchema.virtual('finalTotal').get(function() {
  const subtotal = this.subtotal;
  const discount = this.discountAmount;
  return subtotal - discount + this.tax + this.shipping;
});

// Index for better query performance
cartSchema.index({ user: 1 });

// Pre-save middleware to update totals
cartSchema.pre('save', function(next) {
  // Update total items
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);

  // Update total price (sum of all item prices)
  this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Update last updated timestamp
  this.lastUpdated = new Date();

  next();
});

// Static method to get user's cart with populated products
cartSchema.statics.getUserCart = function(userId) {
  return this.findOne({ user: userId }).populate('items.product');
};

// Static method to add item to cart
cartSchema.statics.addItem = async function(userId, productId, quantity = 1) {
  const cart = await this.findOne({ user: userId });

  if (!cart) {
    // Create new cart if doesn't exist
    const newCart = new this({
      user: userId,
      items: [{ product: productId, quantity, price: 0 }] // Price will be updated by middleware
    });
    return newCart.save();
  }

  // Check if product already exists in cart
  const existingItem = cart.items.find(item =>
    item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, price: 0 });
  }

  return cart.save();
};

// Static method to remove item from cart
cartSchema.statics.removeItem = async function(userId, productId) {
  const cart = await this.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter(item =>
    item.product.toString() !== productId.toString()
  );

  return cart.save();
};

// Static method to update item quantity
cartSchema.statics.updateItemQuantity = async function(userId, productId, quantity) {
  if (quantity < 1) {
    return this.removeItem(userId, productId);
  }

  const cart = await this.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  const item = cart.items.find(item =>
    item.product.toString() === productId.toString()
  );

  if (!item) {
    throw new Error('Product not found in cart');
  }

  item.quantity = quantity;
  return cart.save();
};

// Static method to clear cart
cartSchema.statics.clearCart = async function(userId) {
  const cart = await this.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = [];
  cart.coupon = null;
  return cart.save();
};

// Static method to apply coupon
cartSchema.statics.applyCoupon = async function(userId, couponCode, discount, discountType = 'percentage') {
  const cart = await this.findOne({ user: userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.coupon = {
    code: couponCode,
    discount,
    discountType
  };

  return cart.save();
};

module.exports = mongoose.model('Cart', cartSchema);
