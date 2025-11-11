'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add isFeatured column if it doesn't exist
    await queryInterface.addColumn('products', 'isFeatured', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Add isActive column if it doesn't exist
    await queryInterface.addColumn('products', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // Add the index after adding the columns
    await queryInterface.addIndex('products', ['isFeatured', 'isActive'], {
      name: 'product_featured_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index first
    await queryInterface.removeIndex('products', 'product_featured_idx');
    
    // Remove the columns
    await queryInterface.removeColumn('products', 'isFeatured');
    await queryInterface.removeColumn('products', 'isActive');
  }
};
