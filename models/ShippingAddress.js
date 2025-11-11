const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ShippingAddress extends Model {
    static associate(models) {
      // ShippingAddress belongs to Order
      ShippingAddress.belongsTo(models.Order, {
        foreignKey: 'orderId',
        onDelete: 'CASCADE'
      });
    }
  }

  ShippingAddress.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('home', 'work', 'other'),
      defaultValue: 'home'
    },
    street: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'India'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    addressType: {
      type: DataTypes.ENUM('shipping', 'billing'),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ShippingAddress',
    tableName: 'shipping_addresses',
    timestamps: true,
    underscored: true
  });

  return ShippingAddress;
};
