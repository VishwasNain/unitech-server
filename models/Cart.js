const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Cart extends Model {
    static associate(models) {
      // Cart belongs to a User
      Cart.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE'
      });

      // Cart has many CartItems
      Cart.hasMany(models.CartItem, {
        foreignKey: 'cartId',
        as: 'items',
        onDelete: 'CASCADE'
      });
    }

    // Static method to get user's cart with products
    static async getUserCart(userId) {
      return this.findOne({
        where: { userId },
        include: [
          {
            model: this.sequelize.models.CartItem,
            as: 'items',
            include: [{
              model: this.sequelize.models.Product,
              as: 'product'
            }]
          }
        ]
      });
    }

    // Static method to add item to cart
    static async addItem(userId, productId, quantity = 1) {
      const { CartItem, Product } = this.sequelize.models;
      
      // Get or create cart
      let cart = await this.findOne({ where: { userId } });
      if (!cart) {
        cart = await this.create({ userId });
      }

      // Get product to get price
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Add or update item in cart
      const [cartItem] = await CartItem.findOrCreate({
        where: { cartId: cart.id, productId },
        defaults: {
          quantity: 0,
          price: product.price
        }
      });

      // Update quantity
      cartItem.quantity += quantity;
      if (cartItem.quantity < 1) {
        await cartItem.destroy();
        return { cart, message: 'Item removed from cart' };
      }

      await cartItem.save();
      return { cart, cartItem };
    }

    // Static method to remove item from cart
    static async removeItem(userId, productId) {
      const cart = await this.findOne({ where: { userId } });
      if (!cart) {
        throw new Error('Cart not found');
      }

      const result = await this.sequelize.models.CartItem.destroy({
        where: { cartId: cart.id, productId }
      });

      if (result === 0) {
        throw new Error('Item not found in cart');
      }

      return { success: true };
    }

    // Static method to update item quantity
    static async updateItemQuantity(userId, productId, quantity) {
      if (quantity < 1) {
        return this.removeItem(userId, productId);
      }

      const cart = await this.findOne({ where: { userId } });
      if (!cart) {
        throw new Error('Cart not found');
      }

      const cartItem = await this.sequelize.models.CartItem.findOne({
        where: { cartId: cart.id, productId }
      });

      if (!cartItem) {
        throw new Error('Item not found in cart');
      }

      cartItem.quantity = quantity;
      await cartItem.save();
      return { cartItem };
    }

    // Static method to clear cart
    static async clearCart(userId) {
      const cart = await this.findOne({ where: { userId } });
      if (!cart) {
        throw new Error('Cart not found');
      }

      await this.sequelize.models.CartItem.destroy({
        where: { cartId: cart.id }
      });

      return { success: true };
    }

    // Static method to apply coupon
    static async applyCoupon(userId, couponCode, discount, discountType = 'percentage') {
      if (discountType === 'percentage' && (discount < 0 || discount > 100)) {
        throw new Error('Discount percentage must be between 0 and 100');
      }
      if (discount < 0) {
        throw new Error('Discount cannot be negative');
      }

      const cart = await this.findOne({ where: { userId } });
      if (!cart) {
        throw new Error('Cart not found');
      }

      cart.couponCode = couponCode;
      cart.couponDiscount = discount;
      cart.discountType = discountType;
      await cart.save();

      return cart;
    }

    // Instance method to calculate subtotal
    calculateSubtotal() {
      if (!this.items) return 0;
      return this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }

    // Instance method to calculate total with all adjustments
    calculateTotal() {
      let subtotal = this.calculateSubtotal();
      
      // Apply discount if exists
      if (this.couponDiscount) {
        if (this.discountType === 'percentage') {
          subtotal = subtotal * (1 - (this.couponDiscount / 100));
        } else {
          subtotal = Math.max(0, subtotal - this.couponDiscount);
        }
      }
      
      // Add tax and shipping
      const total = subtotal + (this.shipping || 0) + (subtotal * ((this.tax || 0) / 100));
      return Math.round(total * 100) / 100; // Round to 2 decimal places
    }
  }

  Cart.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    couponCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    couponDiscount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: {
          args: 100,
          msg: 'Discount cannot be more than 100%'
        }
      }
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      defaultValue: 'percentage'
    },
    tax: {
      type: DataTypes.DECIMAL(5, 2),
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
      allowNull: false,
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
      allowNull: false,
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
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Total price cannot be negative'
        }
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
    timestamps: true,
    underscored: true,
    hooks: {
      // Calculate total items before saving
      beforeSave: async (cart) => {
        if (cart.items && cart.items.length > 0) {
          // Calculate total items
          cart.totalItems = cart.items.reduce((total, item) => {
            return total + item.quantity;
          }, 0);

          // Calculate total price
          cart.totalPrice = cart.calculateTotal();
        }
      }
    }
  });

  return Cart;
};
