'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Create new shipping_addresses table with correct schema
      await queryInterface.createTable('shipping_addresses_new', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        type: {
          type: Sequelize.ENUM('home', 'office', 'other'),
          defaultValue: 'home'
        },
        street: { 
          type: Sequelize.STRING, 
          allowNull: false 
        },
        city: { 
          type: Sequelize.STRING, 
          allowNull: false 
        },
        state: { 
          type: Sequelize.STRING, 
          allowNull: false 
        },
        pincode: { 
          type: Sequelize.STRING, 
          allowNull: false 
        },
        country: { 
          type: Sequelize.STRING, 
          defaultValue: 'India' 
        },
        address_type: {
          type: Sequelize.ENUM('billing', 'shipping'),
          allowNull: false
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
        order_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { 
            model: 'orders', 
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
      }, { 
        transaction,
        timestamps: true,
        underscored: true
      });

      // 2. Copy data from old table to new table if it exists
      const tableExists = await queryInterface.showAllTables();
      const oldTableExists = tableExists.some(table => table === 'shipping_addresses');
      
      if (oldTableExists) {
        await queryInterface.sequelize.query(
          `INSERT INTO shipping_addresses_new (
            id, type, street, city, state, pincode, country, 
            address_type, user_id, order_id, created_at, updated_at
          ) 
          SELECT 
            id, type, street, city, state, pincode, country, 
            address_type, user_id::uuid, order_id::uuid, created_at, updated_at
          FROM shipping_addresses`,
          { transaction }
        );

        // 3. Drop the old table
        await queryInterface.dropTable('shipping_addresses', { transaction });
      }

      // 4. Rename new table to the original name
      await queryInterface.renameTable('shipping_addresses_new', 'shipping_addresses', { transaction });

      // 5. Add indexes
      await queryInterface.addIndex('shipping_addresses', ['user_id'], { transaction });
      await queryInterface.addIndex('shipping_addresses', ['order_id'], { transaction });

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
      // Recreate old schema (simplified)
      await queryInterface.createTable('shipping_addresses_old', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        // ... other fields with old types
      }, { transaction });

      // Copy data back (simplified, might need adjustments)
      await queryInterface.sequelize.query(
        `INSERT INTO shipping_addresses_old (
          type, street, city, state, pincode, country, 
          address_type, user_id, order_id, created_at, updated_at
        ) 
        SELECT 
          type, street, city, state, pincode, country, 
          address_type, user_id::text, order_id::text, created_at, updated_at
        FROM shipping_addresses`,
        { transaction }
      );

      await queryInterface.dropTable('shipping_addresses', { transaction });
      await queryInterface.renameTable('shipping_addresses_old', 'shipping_addresses', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
