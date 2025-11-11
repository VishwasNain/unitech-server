const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ShippingAddress extends Model {
    static associate(models) {
      ShippingAddress.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
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
    orderId: {
      type: DataTypes.UUID, // match Order.id
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'ShippingAddress',
    tableName: 'shipping_addresses',
    timestamps: true
  });

  return ShippingAddress;
};
