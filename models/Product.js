const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {
    // Define associations
    static associate(models) {
      // Products belong to a User (seller)
      Product.belongsTo(models.User, {
        foreignKey: 'sellerId',
        as: 'seller',
        onDelete: 'CASCADE'
      });

      // Products have many Reviews
      Product.hasMany(models.Review, {
        foreignKey: 'productId',
        as: 'reviews',
        onDelete: 'CASCADE'
      });

      // Products can be in many orders through OrderItems
      Product.hasMany(models.OrderItem, {
        foreignKey: 'productId',
        as: 'orderItems'
      });

      // Products can be in many carts through CartItems
      Product.hasMany(models.CartItem, {
        foreignKey: 'productId',
        as: 'cartItems'
      });

      // Products can be in many wishlists
      Product.hasMany(models.Wishlist, {
        foreignKey: 'productId',
        as: 'wishlists'
      });
    }

    // Instance method to calculate discount
    calculateDiscount() {
      if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
      }
      return 0;
    }

    // Static method to get products by category
    static async getByCategory(category, limit = 20) {
      return this.findAll({
        where: { 
          category,
          isActive: true 
        },
        order: [
          ['ratingsAverage', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit
      });
    }

    // Static method to get featured products
    static async getFeatured(limit = 10) {
      return this.findAll({
        where: { 
          isFeatured: true, 
          isActive: true 
        },
        order: [
          ['ratingsAverage', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit
      });
    }

    // Static method to search products
    static async search(query, limit = 20) {
      return this.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { name: { [Op.iLike]: `%${query}%` } },
            { description: { [Op.iLike]: `%${query}%` } },
            { brand: { [Op.iLike]: `%${query}%` } },
            { category: { [Op.iLike]: `%${query}%` } }
          ]
        },
        order: [
          ['ratingsAverage', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit
      });
    }
  }

  Product.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Product name is required' },
        len: {
          args: [1, 100],
          msg: 'Product name cannot be more than 100 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Product description is required' },
        len: {
          args: [1, 1000],
          msg: 'Description cannot be more than 1000 characters'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Price is required' },
        min: {
          args: [0],
          msg: 'Price cannot be negative'
        }
      }
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      validate: {
        min: {
          args: [0],
          msg: 'Original price cannot be negative'
        }
      }
    },
    discount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Discount cannot be negative'
        },
        max: {
          args: [100],
          msg: 'Discount cannot be more than 100%'
        }
      }
    },
    category: {
      type: DataTypes.ENUM(
        'laptops',
        'desktops',
        'components',
        'accessories',
        'monitors',
        'storage',
        'networking',
        'software',
        'gaming',
        'other'
      ),
      allowNull: false,
      validate: {
        notNull: { msg: 'Category is required' },
        isIn: {
          args: [[
            'laptops',
            'desktops',
            'components',
            'accessories',
            'monitors',
            'storage',
            'networking',
            'software',
            'gaming',
            'other'
          ]],
          msg: 'Please select a valid category'
        }
      }
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Brand is required' }
      }
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        notNull: { msg: 'Stock quantity is required' },
        min: {
          args: [0],
          msg: 'Stock cannot be negative'
        }
      }
    },
    sku: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'SKU is required' }
      }
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Weight cannot be negative'
        }
      }
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    specifications: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    ratingsAverage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Rating cannot be less than 0'
        },
        max: {
          args: [5],
          msg: 'Rating cannot be more than 5'
        }
      }
    },
    ratingsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    warranty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Warranty cannot be negative'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    hooks: {
      beforeSave: (product) => {
        // Calculate discount before saving
        if (product.originalPrice && product.originalPrice > product.price) {
          product.discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        } else {
          product.discount = 0;
        }
      }
    },
    indexes: [
      {
        name: 'product_search_idx',
        fields: ['name', 'description', 'brand', 'category'],
        type: 'FULLTEXT'
      },
      {
        name: 'product_price_idx',
        fields: ['price']
      },
      {
        name: 'product_category_idx',
        fields: ['category']
      },
      {
        name: 'product_featured_idx',
        fields: ['isFeatured', 'isActive']
      },
      {
        name: 'product_sku_idx',
        fields: ['sku'],
        unique: true
      }
    ]
  });

  return Product;
};
