const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CartItem extends Model {
    static associate(models) {
      // CartItem belongs to a Cart
      CartItem.belongsTo(models.Cart, {
        foreignKey: 'cartId',
        onDelete: 'CASCADE'
      });
      
      // CartItem belongs to a Product
      CartItem.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }

  CartItem.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: 'Quantity must be at least 1'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price cannot be negative'
        }
      }
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: false
  });

  return CartItem;
};
