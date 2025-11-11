const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Order extends Model {
    static associate(models) {
      // Order belongs to User
      Order.belongsTo(models.User, { 
        foreignKey: 'userId',
        as: 'user'
      });
      
      // Order has many OrderItems
      Order.hasMany(models.OrderItem, { 
        foreignKey: 'orderId',
        as: 'items'
      });
      
      // Order has one ShippingAddress
      Order.hasOne(models.ShippingAddress, { 
        foreignKey: 'orderId', 
        as: 'shippingAddress',
        constraints: false
      });
    }
  }

  Order.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // generate UUID automatically
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'pending'
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};
