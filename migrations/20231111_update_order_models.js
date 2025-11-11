'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Create new tables with correct schema
      await queryInterface.createTable('orders_new', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        order_number: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        payment_method: {
          type: Sequelize.ENUM('card', 'upi', 'netbanking', 'cod', 'wallet'),
          allowNull: false
        },
        payment_status: {
          type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
          defaultValue: 'pending'
        },
        payment_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        order_status: {
          type: Sequelize.ENUM(
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'out_for_delivery',
            'delivered',
            'cancelled',
            'returned',
            'refunded'
          ),
          defaultValue: 'pending'
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        tax: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        shipping: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        discount: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        total: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        coupon: {
          type: Sequelize.JSONB,
          defaultValue: null
        },
        tracking_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        estimated_delivery: {
          type: Sequelize.DATE,
          allowNull: true
        },
        delivered_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        stripe_payment_intent_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        is_gift: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        gift_message: {
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
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        placed_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

      // 2. Create order_items_new table
      await queryInterface.createTable('order_items_new', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        image: {
          type: Sequelize.STRING,
          allowNull: true
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
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'orders_new',
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

      // 3. Copy data from old tables to new tables (if any)
      // Note: This is a simplified version. You might need to adjust based on your actual data
      await queryInterface.sequelize.query(
        `INSERT INTO orders_new (
          id, order_number, payment_method, payment_status, payment_id, 
          order_status, subtotal, tax, shipping, discount, total, 
          coupon, tracking_number, estimated_delivery, delivered_at, 
          notes, stripe_payment_intent_id, is_gift, gift_message, 
          user_id, placed_at, created_at, updated_at
        ) 
        SELECT 
          gen_random_uuid(), order_number, payment_method, payment_status, payment_id,
          order_status, subtotal, tax, shipping, discount, total,
          coupon, tracking_number, estimated_delivery, delivered_at,
          notes, stripe_payment_intent_id, is_gift, gift_message,
          user_id::uuid, placed_at, created_at, updated_at
        FROM orders`,
        { transaction }
      );

      // 4. Copy order items (this is a simplified version)
      await queryInterface.sequelize.query(
        `INSERT INTO order_items_new (
          id, quantity, price, name, image, 
          product_id, order_id, created_at, updated_at
        )
        SELECT 
          gen_random_uuid(), oi.quantity, oi.price, oi.name, oi.image,
          oi.product_id::uuid, o_new.id, oi.created_at, oi.updated_at
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN orders_new o_new ON o.order_number = o_new.order_number`,
        { transaction }
      );

      // 5. Drop old tables
      await queryInterface.dropTable('order_items', { transaction });
      await queryInterface.dropTable('orders', { transaction });

      // 6. Rename new tables
      await queryInterface.renameTable('orders_new', 'orders', { transaction });
      await queryInterface.renameTable('order_items_new', 'order_items', { transaction });

      // 7. Add indexes
      await queryInterface.addIndex('orders', ['user_id'], { transaction });
      await queryInterface.addIndex('orders', ['order_status'], { transaction });
      await queryInterface.addIndex('orders', ['payment_status'], { transaction });
      await queryInterface.addIndex('order_items', ['order_id'], { transaction });
      await queryInterface.addIndex('order_items', ['product_id'], { transaction });

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
      await queryInterface.createTable('orders_old', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        // ... other fields with old types
      }, { transaction });

      await queryInterface.createTable('order_items_old', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        // ... other fields with old types
      }, { transaction });

      // Copy data back (simplified, might need adjustments)
      await queryInterface.sequelize.query(
        `INSERT INTO orders_old (
          order_number, payment_method, payment_status, payment_id, 
          order_status, subtotal, tax, shipping, discount, total, 
          coupon, tracking_number, estimated_delivery, delivered_at, 
          notes, stripe_payment_intent_id, is_gift, gift_message, 
          user_id, placed_at, created_at, updated_at
        ) 
        SELECT 
          order_number, payment_method, payment_status, payment_id,
          order_status, subtotal, tax, shipping, discount, total,
          coupon, tracking_number, estimated_delivery, delivered_at,
          notes, stripe_payment_intent_id, is_gift, gift_message,
          user_id::text, placed_at, created_at, updated_at
        FROM orders`,
        { transaction }
      );

      await queryInterface.dropTable('order_items', { transaction });
      await queryInterface.dropTable('orders', { transaction });
      await queryInterface.renameTable('orders_old', 'orders', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
