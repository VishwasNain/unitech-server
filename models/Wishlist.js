const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Wishlist extends Model {
    static associate(models) {
      Wishlist.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      });
      
      Wishlist.belongsTo(models.Product, {
        foreignKey: 'productId',
        onDelete: 'CASCADE'
      });
    }
  }

  Wishlist.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Wishlist',
    tableName: 'wishlists',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'productId']
      }
    ]
  });

  return Wishlist;
};
