'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('flows', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(255), allowNull: false },
      trigger_keyword: { type: Sequelize.STRING(255), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('flow_nodes', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      flow_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flows', key: 'id' }, onDelete: 'CASCADE' },
      node_type: { type: Sequelize.STRING(50), allowNull: false },
      message_text: { type: Sequelize.TEXT, allowNull: true },
      is_start_node: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('node_options', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      source_node_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flow_nodes', key: 'id' }, onDelete: 'CASCADE' },
      option_text: { type: Sequelize.STRING(255), allowNull: false },
      next_node_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'flow_nodes', key: 'id' }, onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('user_flow_states', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      pedido_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pedidos', key: 'id' }, onDelete: 'CASCADE' },
      current_flow_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flows', key: 'id' }, onDelete: 'CASCADE' },
      current_node_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'flow_nodes', key: 'id' }, onDelete: 'SET NULL' },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('user_flow_states');
    await queryInterface.dropTable('node_options');
    await queryInterface.dropTable('flow_nodes');
    await queryInterface.dropTable('flows');
  }
};
