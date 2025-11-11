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
      field: 'user_id',  // Explicitly set the database column name
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    productId: {
      field: 'product_id',  // Explicitly set the database column name
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    addedAt: {
      type: DataTypes.DATE,
      field: 'added_at',  // Explicitly set the database column name
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Wishlist',
    tableName: 'wishlists',
    timestamps: true,
    underscored: true,  // This will handle automatic conversion between snake_case and camelCase
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'product_id'],  // Use snake_case for database column names
      }
    ]
  });

  return Wishlist;
};
