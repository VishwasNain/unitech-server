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

      // 2. Check if we need to migrate data from the old table
      const tableExists = await queryInterface.showAllTables();
      const oldTableExists = tableExists.some(table => table === 'shipping_addresses');
      
      if (oldTableExists) {
        // First, check if we need to handle data migration
        const oldTableInfo = await queryInterface.describeTable('shipping_addresses');
        const needsTypeConversion = oldTableInfo.order_id && oldTableInfo.order_id.type === 'INTEGER';
        
        if (needsTypeConversion) {
          // Handle type conversion for order_id from INTEGER to UUID
          await queryInterface.sequelize.query(
            `INSERT INTO shipping_addresses_new (
              id, type, street, city, state, pincode, country, 
              address_type, user_id, order_id, created_at, updated_at
            ) 
            SELECT 
              gen_random_uuid() as id, 
              type, 
              street, 
              city, 
              state, 
              pincode, 
              COALESCE(country, 'India') as country,
              COALESCE(address_type, 'shipping') as address_type,
              user_id::uuid as user_id,
              (SELECT id FROM orders WHERE id::text = shipping_addresses.order_id::text LIMIT 1) as order_id,
              COALESCE(created_at, NOW()) as created_at, 
              COALESCE(updated_at, NOW()) as updated_at
            FROM shipping_addresses`,
            { transaction }
          );
        } else {
          // No type conversion needed, just copy the data
          await queryInterface.sequelize.query(
            `INSERT INTO shipping_addresses_new (
              id, type, street, city, state, pincode, country, 
              address_type, user_id, order_id, created_at, updated_at
            ) 
            SELECT 
              id, type, street, city, state, pincode, 
              COALESCE(country, 'India') as country,
              COALESCE(address_type, 'shipping') as address_type,
              user_id, 
              order_id, 
              COALESCE(created_at, NOW()) as created_at, 
              COALESCE(updated_at, NOW()) as updated_at
            FROM shipping_addresses`,
            { transaction }
          );
        }

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
      // Create a backup of the current data
      await queryInterface.createTable('shipping_addresses_backup', {
        id: {
          type: Sequelize.UUID,
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
          type: Sequelize.UUID
        },
        order_id: {
          type: Sequelize.UUID
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

      // Copy data to backup
      await queryInterface.sequelize.query(
        `INSERT INTO shipping_addresses_backup
        SELECT * FROM shipping_addresses`,
        { transaction }
      );

      // Drop and recreate the table with the new schema
      await queryInterface.dropTable('shipping_addresses', { transaction });
      
      // Recreate the table with the original schema if needed
      await queryInterface.createTable('shipping_addresses', {
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

      // Restore data from backup
      await queryInterface.sequelize.query(
        `INSERT INTO shipping_addresses
        SELECT * FROM shipping_addresses_backup`,
        { transaction }
      );

      // Drop the backup table
      await queryInterface.dropTable('shipping_addresses_backup', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
