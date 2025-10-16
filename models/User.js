const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * User Model
 * Handles user authentication, authorization, and profile management
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for the user'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
        len: {
          args: [2, 100],
          msg: 'Name must be between 2 and 100 characters'
        }
      },
      comment: 'Full name of the user'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email already in use'
      },
      validate: {
        isEmail: { msg: 'Please provide a valid email' },
        notEmpty: { msg: 'Email is required' },
        isLowercase: true
      },
      comment: 'User email (must be unique)'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Password is required' },
        len: {
          args: [8, 100],
          msg: 'Password must be at least 8 characters long'
        },
        isStrongPassword: {
          args: [{
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
          }],
          msg: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }
      },
      comment: 'Hashed password'
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'admin']],
          msg: 'Invalid role'
        }
      },
      comment: 'User role for authorization'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the user has verified their email'
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token for password reset'
    },
    resetPasswordExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for password reset token'
    },
    verifyEmailToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token for email verification'
    },
    verifyEmailExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for email verification token'
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: 'One-time password for verification'
    },
    otpExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for OTP'
    },
    otpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Number of failed OTP attempts'
    },
    lastOtpSent: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the last OTP was sent'
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'Profile image must be a valid URL' }
      },
      comment: 'URL to user\'s profile image'
    },
    phoneNumber: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: {
          args: /^\+?[0-9]{10,15}$/,
          msg: 'Please provide a valid phone number'
        }
      },
      comment: 'User\'s contact number'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last login'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the user account is active'
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        notifications: true,
        emailMarketing: false,
        darkMode: false,
        language: 'en'
      },
      comment: 'User preferences and settings'
    }
  }, {
    timestamps: true,
    tableName: 'users',
    paranoid: true, // Enable soft deletes
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['phoneNumber'], unique: true, where: { phoneNumber: { [Op.ne]: null } } },
      { fields: ['role'] },
      { fields: ['isVerified'] },
      { fields: ['isActive'] }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      afterCreate: (user) => {
        // Remove sensitive data from the created user object
        user.password = undefined;
        user.resetPasswordToken = undefined;
        user.verifyEmailToken = undefined;
        user.otp = undefined;
      }
    },
    defaultScope: {
      attributes: { exclude: ['password', 'resetPasswordToken', 'verifyEmailToken', 'otp'] }
    },
    scopes: {
      withSensitiveData: {
        attributes: { include: ['password', 'resetPasswordToken', 'verifyEmailToken', 'otp'] }
      },
      active: {
        where: { isActive: true }
      },
      verified: {
        where: { isVerified: true }
      }
    }
  });

  //#region Instance Methods
  
  /**
   * Compare entered password with hashed password in database
   * @param {string} enteredPassword - The password to compare
   * @returns {Promise<boolean>} True if passwords match
   */
  User.prototype.comparePassword = async function(enteredPassword) {
    if (!enteredPassword) {
      throw new Error('Password is required');
    }
    return await bcrypt.compare(enteredPassword, this.password);
  };

  /**
   * Generate JWT token for authentication
   * @returns {string} JWT token
   */
  User.prototype.getJwtToken = function() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.sign(
      { 
        id: this.id, 
        role: this.role,
        email: this.email 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: process.env.APP_NAME || 'unitech'
      }
    );
  };

  /**
   * Generate and set password reset token
   * @returns {string} The reset token
   */
  User.prototype.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    return resetToken;
  };

  /**
   * Generate and set email verification token
   * @returns {string} The verification token
   */
  User.prototype.getVerifyEmailToken = function() {
    const verifyToken = crypto.randomBytes(32).toString('hex');
    this.verifyEmailToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    this.verifyEmailExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return verifyToken;
  };

  /**
   * Generate and set OTP for verification
   * @returns {string} The generated OTP
   */
  User.prototype.generateOtp = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    this.otpAttempts = 0;
    this.lastOtpSent = new Date();
    return otp;
  };

  /**
   * Check if password reset token is valid
   * @param {string} token - The token to validate
   * @returns {boolean} True if token is valid
   */
  User.prototype.isPasswordResetTokenValid = function(token) {
    if (!token) return false;
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    return hashedToken === this.resetPasswordToken && 
           this.resetPasswordExpire > new Date();
  };

  /**
   * Check if email verification token is valid
   * @param {string} token - The token to validate
   * @returns {boolean} True if token is valid
   */
  User.prototype.isEmailVerificationTokenValid = function(token) {
    if (!token || !this.verifyEmailToken || !this.verifyEmailExpire) {
      return false;
    }
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    return hashedToken === this.verifyEmailToken && 
           this.verifyEmailExpire > new Date();
  };

  /**
   * Check if OTP is valid
   * @param {string} otp - The OTP to validate
   * @returns {boolean} True if OTP is valid
   */
  User.prototype.isOtpValid = function(otp) {
    if (!otp || !this.otp || !this.otpExpire) {
      return false;
    }
    
    return this.otp === otp && 
           this.otpExpire > new Date() && 
           this.otpAttempts < 5;
  };

  /**
   * Increment OTP attempts
   * @returns {Promise<User>} Updated user instance
   */
  User.prototype.incrementOtpAttempts = async function() {
    this.otpAttempts += 1;
    
    // Lock account after too many failed attempts
    if (this.otpAttempts >= 5) {
      this.otp = null;
      this.otpExpire = null;
    }
    
    return await this.save();
  };

  /**
   * Update last login timestamp
   * @returns {Promise<User>} Updated user instance
   */
  User.prototype.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save();
  };

  //#endregion

  //#region Class Methods
  
  /**
   * Find user by email
   * @param {string} email - User's email
   * @returns {Promise<User|null>} User instance or null if not found
   */
  User.findByEmail = async function(email) {
    if (!email) return null;
    return await this.findOne({ 
      where: { email: email.toLowerCase() },
      ...this.scope('withSensitiveData')
    });
  };

  /**
   * Check if email is already in use
   * @param {string} email - Email to check
   * @param {string} [excludeId] - User ID to exclude from check
   * @returns {Promise<boolean>} True if email is in use
   */
  User.isEmailTaken = async function(email, excludeId = null) {
    const where = { email: email.toLowerCase() };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const user = await this.findOne({ where });
    return !!user;
  };

  /**
   * Find user by reset token
   * @param {string} token - Reset token
   * @returns {Promise<User|null>} User instance or null if not found
   */
  User.findByResetToken = async function(token) {
    if (!token) return null;
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    return await this.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { [Op.gt]: new Date() }
      },
      ...this.scope('withSensitiveData')
    });
  };

  //#endregion

  //#region Associations
  
  User.associate = (models) => {
    // User has many addresses
    User.hasMany(models.Address, {
      foreignKey: 'userId',
      as: 'addresses'
    });
    
    // User has many orders
    User.hasMany(models.Order, {
      foreignKey: 'userId',
      as: 'orders'
    });
    
    // User has one cart
    User.hasOne(models.Cart, {
      foreignKey: 'userId',
      as: 'cart'
    });
    
    // User has many newsletter subscriptions
    User.hasMany(models.Newsletter, {
      foreignKey: 'email',
      sourceKey: 'email',
      as: 'newsletterSubscriptions'
    });
  };
  
  //#endregion

  return User;
};
