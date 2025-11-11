'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if columns exist before adding them
      const tableDescription = await queryInterface.describeTable('products');
      
      if (!tableDescription.isFeatured) {
        await queryInterface.addColumn('products', 'isFeatured', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });
      }

      if (!tableDescription.isActive) {
        await queryInterface.addColumn('products', 'isActive', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction });
      }

      // Get all indexes
      const indexes = await queryInterface.showIndex('products');
      const indexExists = indexes.some(index => index.name === 'product_featured_idx');
      
      // Only add the index if it doesn't exist
      if (!indexExists) {
        await queryInterface.addIndex('products', ['isFeatured', 'isActive'], {
          name: 'product_featured_idx',
          transaction
        });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove the index if it exists
      const indexes = await queryInterface.showIndex('products');
      const indexExists = indexes.some(index => index.name === 'product_featured_idx');
      
      if (indexExists) {
        await queryInterface.removeIndex('products', 'product_featured_idx', { transaction });
      }
      
      // Remove the columns if they exist
      const tableDescription = await queryInterface.describeTable('products');
      
      if (tableDescription.isFeatured) {
        await queryInterface.removeColumn('products', 'isFeatured', { transaction });
      }
      
      if (tableDescription.isActive) {
        await queryInterface.removeColumn('products', 'isActive', { transaction });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
