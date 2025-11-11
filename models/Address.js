const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Address extends Model {
    static associate(models) {
      Address.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      });
    }
  }

  Address.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('home', 'work', 'other'),
      defaultValue: 'home'
    },
    street: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Street is required' }
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'City is required' }
      }
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'State is required' }
      }
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Pincode is required' },
        is: {
          args: /^[1-9][0-9]{5}$/,
          msg: 'Please provide a valid 6-digit pincode'
        }
      }
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    timestamps: true
  });

  return Address;
};
