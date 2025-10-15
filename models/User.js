const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetPasswordToken: DataTypes.STRING,
  resetPasswordExpire: DataTypes.DATE,
  verifyEmailToken: DataTypes.STRING,
  verifyEmailExpire: DataTypes.DATE,
  otp: DataTypes.STRING,
  otpExpire: DataTypes.DATE,
  otpAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastOtpSent: DataTypes.DATE,
  profileImage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  phoneNumber: {
    type: DataTypes.STRING,
    validate: {
      is: /^[0-9]{10}$/
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'users'
});

// Address model (separate table for one-to-many relationship)
const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('home', 'work', 'other'),
    defaultValue: 'home'
  },
  street: DataTypes.STRING,
  city: DataTypes.STRING,
  state: DataTypes.STRING,
  pincode: DataTypes.STRING,
  country: {
    type: DataTypes.STRING,
    defaultValue: 'India'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Wishlist model (junction table for many-to-many relationship)
const Wishlist = sequelize.define('Wishlist', {
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define associations
User.hasMany(Address);
Address.belongsTo(User);

User.belongsToMany(require('./Product'), { through: Wishlist });

// Instance methods
User.prototype.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.prototype.getJwtToken = function() {
  return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

User.prototype.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

User.prototype.getVerifyEmailToken = function() {
  const verifyToken = crypto.randomBytes(20).toString('hex');
  this.verifyEmailToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');
  this.verifyEmailExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verifyToken;
};

User.prototype.generateOtp = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpAttempts = 0;
  this.lastOtpSent = Date.now();
  return otp;
};

User.prototype.isPasswordResetTokenValid = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return hashedToken === this.resetPasswordToken && this.resetPasswordExpire > Date.now();
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
