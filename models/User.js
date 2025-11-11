const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class User extends Model {
    // Compare password method
    async comparePassword(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    }

    // Generate email verification token
    createEmailVerificationToken() {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      return verificationToken;
    }

    // Generate password reset token
    createPasswordResetToken() {
      const resetToken = crypto.randomBytes(32).toString('hex');
      this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      return resetToken;
    }

    // Generate mobile OTP
    createMobileOTP() {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.mobileVerificationCode = otp;
      this.mobileVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      this.otpAttempts = 0;
      this.lastOtpSent = new Date();
      return otp;
    }

    // Check if password reset token is valid
    isPasswordResetTokenValid(token) {
      if (!this.passwordResetToken) return false;
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      return (
        this.passwordResetToken === hashedToken &&
        this.passwordResetExpires > new Date()
      );
    }

    // Check if email verification token is valid
    isEmailVerificationTokenValid(token) {
      if (!this.emailVerificationToken) return false;
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      return this.emailVerificationToken === hashedToken && this.emailVerificationExpires > new Date();
    }

    // Check if mobile OTP is valid
    isMobileOTPValid(otp) {
      if (!this.mobileVerificationCode) return false;
      return (
        this.mobileVerificationCode === otp &&
        this.mobileVerificationExpires > new Date()
      );
    }

    // Increment OTP attempts
    async incrementOtpAttempts() {
      this.otpAttempts += 1;
      return this.save();
    }

    // Define associations
    static associate(models) {
      // Define associations here
      User.hasMany(models.ShippingAddress, { foreignKey: 'userId' });
      User.hasMany(models.Wishlist, { foreignKey: 'userId' });
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
        len: {
          args: [1, 50],
          msg: 'Name cannot be more than 50 characters'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Please provide a valid email' },
        notEmpty: { msg: 'Email is required' }
      }
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^[6-9]\d{9}$/,
          msg: 'Please provide a valid 10-digit mobile number'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6],
          msg: 'Password must be at least 6 characters'
        }
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
    emailVerificationToken: DataTypes.STRING,
    emailVerificationExpires: DataTypes.DATE,
    passwordResetToken: DataTypes.STRING,
    passwordResetExpires: DataTypes.DATE,
    mobileVerificationCode: DataTypes.STRING,
    mobileVerificationExpires: DataTypes.DATE,
    otpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastOtpSent: DataTypes.DATE,
    profileImage: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['password'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      }
    },
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  return User;
};
