const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Product name is required'
      },
      len: {
        args: [1, 100],
        msg: 'Product name must be between 1 and 100 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Product description is required'
      },
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
      min: {
        args: [0],
        msg: 'Price cannot be negative'
      },
      isDecimal: {
        msg: 'Price must be a valid number'
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
      notEmpty: {
        msg: 'Category is required'
      },
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
      notEmpty: {
        msg: 'Brand is required'
      }
    }
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Stock cannot be negative'
      },
      isInt: {
        msg: 'Stock must be an integer'
      }
    }
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  warranty: {
    type: DataTypes.INTEGER,
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
  metaTitle: {
    type: DataTypes.STRING
  },
  metaDescription: {
    type: DataTypes.TEXT
  },
  metaKeywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  averageRating: {
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
  numReviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: async (product, options) => {
      // Calculate discount percentage if original price exists
      if (product.originalPrice && product.originalPrice > product.price) {
        product.discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      } else {
        product.discount = 0;
      }
      
      // Generate slug from name if not provided
      if (product.name && !product.slug) {
        product.slug = product.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    }
  },
  getterMethods: {
    finalPrice() {
      return this.originalPrice && this.originalPrice > this.price 
        ? this.price 
        : this.originalPrice || this.price;
    }
  },
  indexes: [
    {
      fields: ['name', 'description'],
      using: 'GIN',
      operator: 'gin_trgm_ops'
    },
    {
      fields: ['category', 'brand']
    },
    {
      fields: ['price', 'averageRating']
    }
  ]
});

// Class methods
Product.getByCategory = async function(category, limit = 20) {
  return this.findAll({
    where: { category, isActive: true },
    order: [['createdAt', 'DESC']],
    limit
  });
};

Product.getFeatured = async function(limit = 10) {
  return this.findAll({
    where: { featured: true, isActive: true },
    order: [
      ['averageRating', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit
  });
};

Product.search = async function(query, limit = 20) {
  return this.findAll({
    where: {
      isActive: true,
      [Op.or]: [
        {
          name: {
            [Op.iLike]: `%${query}%`
          }
        },
        {
          description: {
            [Op.iLike]: `%${query}%`
          }
        }
      ]
    },
    order: [['createdAt', 'DESC']],
    limit
  });
};

// Instance methods
Product.prototype.addRating = async function(userId, rating, comment = '') {
  const review = await this.createReview({
    userId,
    rating,
    comment
  });
  
  // Update average rating and review count
  const reviews = await this.getReviews();
  this.averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  this.numReviews = reviews.length;
  await this.save();
  
  return review;
};

// Associations will be defined in a separate file or after all models are defined

module.exports = Product;
