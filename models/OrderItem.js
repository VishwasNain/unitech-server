const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class OrderItem extends Model {
    static associate(models) {
      // OrderItem belongs to Order
      OrderItem.belongsTo(models.Order, { 
        foreignKey: 'orderId',
        as: 'order'
      });
      
      // OrderItem belongs to Product
      OrderItem.belongsTo(models.Product, { 
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }

  OrderItem.init({
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'orders', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'products', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true
  });

  return OrderItem;
};
