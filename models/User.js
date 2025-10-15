const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
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
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  mobileVerificationCode: String,
  mobileVerificationExpires: Date,
  otpAttempts: {
    type: Number,
    default: 0
  },
  lastOtpSent: Date,
  profileImage: {
    type: String,
    default: ''
  },
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  wishlist: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationToken;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate mobile OTP
userSchema.methods.createMobileOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.mobileVerificationCode = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  this.mobileVerificationExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

  return otp;
};

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password reset token is valid
userSchema.methods.isPasswordResetTokenValid = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return hashedToken === this.passwordResetToken && this.passwordResetExpires > Date.now();
};

// Check if email verification token is valid
userSchema.methods.isEmailVerificationTokenValid = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return hashedToken === this.emailVerificationToken && this.emailVerificationExpires > Date.now();
};

// Check if mobile OTP is valid
userSchema.methods.isMobileOTPValid = function(otp) {
  const hashedOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  return hashedOtp === this.mobileVerificationCode && this.mobileVerificationExpires > Date.now();
};

// Increment OTP attempts
userSchema.methods.incrementOtpAttempts = function() {
  this.otpAttempts += 1;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
