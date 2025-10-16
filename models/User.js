module.exports = (sequelize, DataTypes) => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');

  const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verifyEmailToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verifyEmailExpire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otpExpire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  otpAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastOtpSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
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
  tableName: 'users',
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
    }
  }
});

// Instance Methods
User.prototype.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.prototype.getJwtToken = function() {
  return jwt.sign(
    { id: this.id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

User.prototype.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
  return resetToken;
};

User.prototype.getVerifyEmailToken = function() {
  const verifyToken = crypto.randomBytes(20).toString('hex');
  this.verifyEmailToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');
  this.verifyEmailExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return verifyToken;
};

User.prototype.generateOtp = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  this.otpAttempts = 0;
  this.lastOtpSent = new Date();
  return otp;
};

User.prototype.isPasswordResetTokenValid = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  return hashedToken === this.resetPasswordToken && 
         this.resetPasswordExpire > new Date();
};

User.prototype.isEmailVerificationTokenValid = function(token) {
  if (!this.verifyEmailToken || !this.verifyEmailExpire) return false;
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  return hashedToken === this.verifyEmailToken && 
         this.verifyEmailExpire > new Date();
};

User.prototype.isOtpValid = function(otp) {
  if (!this.otp || !this.otpExpire) return false;
  
  return this.otp === otp && 
         this.otpExpire > new Date() && 
         this.otpAttempts < 5;
};

User.prototype.incrementOtpAttempts = async function() {
  this.otpAttempts += 1;
  return await this.save();
};

// Export the model
module.exports = User;}
