const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ShippingAddress extends Model {
    static associate(models) {
      // ShippingAddress belongs to User
      ShippingAddress.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      });
      
      // ShippingAddress belongs to Order (optional)
      ShippingAddress.belongsTo(models.Order, { 
        foreignKey: 'orderId', 
        as: 'order',
        onDelete: 'CASCADE'
      });
    }
  }

  ShippingAddress.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('home', 'office', 'other'),
      defaultValue: 'home'
    },
    street: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    pincode: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, defaultValue: 'India' },
    addressType: {
      type: DataTypes.ENUM('billing', 'shipping'),
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'users',
        key: 'id' 
      },
      onDelete: 'CASCADE'
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true, // Make this optional if an address can exist without an order
      references: { 
        model: 'orders', 
        key: 'id' 
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'ShippingAddress',
    tableName: 'shipping_addresses',
    timestamps: true
  });

  return ShippingAddress;
};
