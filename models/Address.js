module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: false
    },
    addressLine2: {
      type: DataTypes.STRING
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'India'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    addressType: {
      type: DataTypes.ENUM('home', 'office', 'other'),
      defaultValue: 'home'
    }
  }, {
    timestamps: true,
    tableName: 'addresses',
    hooks: {
      beforeSave: async (address) => {
        // If this is set as default, unset any other default addresses for this user
        if (address.isDefault) {
          await Address.update(
            { isDefault: false },
            {
              where: {
                userId: address.userId,
                id: { [sequelize.Sequelize.Op.ne]: address.id || null }
              },
              silent: true
            }
          );
        }
      }
    }
  });

  // Class Methods
  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Address.hasMany(models.Order, {
      foreignKey: 'shippingAddressId',
      as: 'orders'
    });
  };

  // Instance Methods
  Address.prototype.getFullAddress = function() {
    return `${this.addressLine1}${this.addressLine2 ? ', ' + this.addressLine2 : ''}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  };

  return Address;
};
