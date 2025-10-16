module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Orders',
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
      validate: {
        min: 1
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING
    },
    totalPrice: {
      type: DataTypes.VIRTUAL,
      get() {
        return (this.getDataValue('price') * this.getDataValue('quantity')).toFixed(2);
      }
    }
  }, {
    timestamps: true,
    tableName: 'order_items', // Explicitly set table name to avoid pluralization issues
    hooks: {
      beforeSave: async (orderItem) => {
        // Ensure price is always positive
        if (orderItem.price < 0) {
          throw new Error('Price cannot be negative');
        }
        // Ensure quantity is at least 1
        if (orderItem.quantity < 1) {
          throw new Error('Quantity must be at least 1');
        }
      }
    }
  });

  // Class Methods
  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
    
    OrderItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  // Instance Methods
  OrderItem.prototype.getTotalPrice = function() {
    return (this.price * this.quantity).toFixed(2);
  };

  return OrderItem;
};
