module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Carts',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
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
    tableName: 'cart_items',
    timestamps: false
  });

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cartId',
      as: 'cart'
    });
    
    CartItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return CartItem;
};
