module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      unique: true
    },
    couponCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Discount cannot be negative'
        }
      }
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      defaultValue: 'percentage'
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
    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Total items cannot be negative'
        }
      }
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Total price cannot be negative'
        }
      }
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    tableName: 'carts',
    hooks: {
      beforeSave: async (cart) => {
        cart.lastUpdated = new Date();
      }
    }
  });

  // Instance methods
  Cart.prototype.calculateTotals = async function() {
    const cartItems = await this.getCartItems({
      include: ['product']
    });
    
    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    let discountAmount = 0;
    if (this.discount) {
      if (this.discountType === 'percentage') {
        discountAmount = (subtotal * this.discount) / 100;
      } else {
        discountAmount = Math.min(this.discount, subtotal);
      }
    }

    this.totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    this.totalPrice = subtotal - discountAmount + parseFloat(this.tax || 0) + parseFloat(this.shipping || 0);
    
    return this.save();
  };

  // Class methods
  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'cartItems',
      onDelete: 'CASCADE'
    });
  };

  return Cart;
};
