'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Create a new temporary table with the correct schema
      await queryInterface.createTable('reviews_new', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        rating: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        comment: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 2. Copy data from old table to new table (if any)
      await queryInterface.sequelize.query(
        'INSERT INTO reviews_new (id, rating, comment, user_id, product_id, created_at, updated_at) ' +
        'SELECT gen_random_uuid(), rating, comment, user_id::uuid, product_id::uuid, created_at, updated_at ' +
        'FROM reviews',
        { transaction }
      );

      // 3. Drop the old table
      await queryInterface.dropTable('reviews', { transaction });

      // 4. Rename new table to original name
      await queryInterface.renameTable('reviews_new', 'reviews', { transaction });

      // 5. Add unique index
      await queryInterface.addIndex('reviews', ['user_id', 'product_id'], {
        unique: true,
        name: 'reviews_user_product_unique',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Note: This is a destructive migration, so the down migration will recreate the old schema
    // but data might be lost in the process
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.createTable('reviews_old', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        // ... other fields with old types
      }, { transaction });

      // Copy data back (note: this might not be perfect due to type conversion)
      await queryInterface.sequelize.query(
        'INSERT INTO reviews_old (rating, comment, user_id, product_id, created_at, updated_at) ' +
        'SELECT rating, comment, user_id::text, product_id::text, created_at, updated_at ' +
        'FROM reviews',
        { transaction }
      );

      await queryInterface.dropTable('reviews', { transaction });
      await queryInterface.renameTable('reviews_old', 'reviews', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
