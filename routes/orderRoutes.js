const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.getUserOrders(
      req.user._id,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const totalOrders = await Order.countDocuments({ user: req.user._id });
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// @route   POST /api/orders
// @desc    Create new order from cart
// @access  Private
router.post('/',
  protect,
  [
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),

    body('shippingAddress.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),

    body('shippingAddress.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),

    body('shippingAddress.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),

    body('shippingAddress.pincode')
      .matches(/^\d{6}$/)
      .withMessage('Pincode must be 6 digits'),

    body('paymentMethod')
      .isIn(['card', 'upi', 'netbanking', 'cod', 'wallet'])
      .withMessage('Invalid payment method'),

    body('billingAddress')
      .optional()
      .isObject()
      .withMessage('Billing address must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        shippingAddress,
        billingAddress,
        paymentMethod,
        couponCode,
        notes
      } = req.body;

      // Get user's cart
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Check product availability and stock
      for (const item of cart.items) {
        if (!item.product.isActive) {
          return res.status(400).json({
            message: `${item.product.name} is no longer available`
          });
        }

        if (item.product.stock < item.quantity) {
          return res.status(400).json({
            message: `${item.product.name} only has ${item.product.stock} items in stock`
          });
        }
      }

      // Calculate totals
      const subtotal = cart.subtotal;
      const discount = cart.discountAmount;
      const tax = subtotal * 0.18; // 18% GST
      const shipping = subtotal > 1000 ? 0 : 100; // Free shipping over ₹1000
      const total = subtotal - discount + tax + shipping;

      // Create order items
      const orderItems = cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        name: item.product.name,
        image: item.product.images[0]?.url || ''
      }));

      // Create order
      const order = new Order({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        coupon: cart.coupon,
        notes
      });

      // Handle payment based on payment method
      if (paymentMethod === 'card') {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100), // Convert to paise
          currency: 'inr',
          metadata: {
            orderId: order._id.toString(),
            userId: req.user._id.toString()
          }
        });

        order.stripePaymentIntentId = paymentIntent.id;
        order.paymentStatus = 'pending';
      } else {
        order.paymentStatus = paymentMethod === 'cod' ? 'pending' : 'completed';
      }

      await order.save();

      // Update product stock
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      // Clear cart
      await Cart.clearCart(req.user._id);

      // Send confirmation email
      await emailService.sendOrderConfirmation(order, req.user);

      res.status(201).json({
        message: 'Order placed successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          paymentMethod,
          requiresPayment: paymentMethod === 'card'
        },
        ...(paymentMethod === 'card' && {
          clientSecret: order.stripePaymentIntentId
        })
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Failed to place order' });
    }
  }
);

// @route   POST /api/orders/:id/payment
// @desc    Process payment for order
// @access  Private
router.post('/:id/payment',
  protect,
  [
    body('paymentIntentId')
      .notEmpty()
      .withMessage('Payment intent ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (order.paymentStatus === 'completed') {
        return res.status(400).json({ message: 'Order already paid' });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        order.paymentStatus = 'completed';
        order.paymentId = paymentIntentId;
        await order.save();

        // Send confirmation email
        await emailService.sendOrderConfirmation(order, req.user);

        res.json({
          message: 'Payment successful',
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus
          }
        });
      } else {
        res.status(400).json({ message: 'Payment failed' });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({ message: 'Payment processing failed' });
    }
  }
);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel delivered order' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }

    // Update order status
    order.orderStatus = 'cancelled';
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
});

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get('/admin/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email mobile')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put('/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, trackingNumber } = req.body;

    const validStatuses = [
      'pending', 'confirmed', 'processing', 'shipped',
      'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderStatus: status,
        ...(trackingNumber && { trackingNumber }),
        ...(status === 'delivered' && { deliveredAt: new Date() })
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

module.exports = router;
