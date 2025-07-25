'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('flows', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      cliente_id: { type: Sequelize.INTEGER, allowNull: false },
      nome: { type: Sequelize.STRING, allowNull: false },
      gatilho: { type: Sequelize.STRING, allowNull: false },
      ativo: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('flow_nodes', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      flow_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flows', key: 'id' }, onDelete: 'CASCADE' },
      tipo: { type: Sequelize.STRING, allowNull: false },
      conteudo: { type: Sequelize.TEXT, allowNull: true },
      next_node_id: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('node_options', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      node_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flow_nodes', key: 'id' }, onDelete: 'CASCADE' },
      label: { type: Sequelize.STRING, allowNull: false },
      next_node_id: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('user_flow_state', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      cliente_id: { type: Sequelize.INTEGER, allowNull: false },
      telefone: { type: Sequelize.STRING, allowNull: false },
      flow_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'flows', key: 'id' }, onDelete: 'CASCADE' },
      node_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'flow_nodes', key: 'id' }, onDelete: 'SET NULL' },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_flow_state');
    await queryInterface.dropTable('node_options');
    await queryInterface.dropTable('flow_nodes');
    await queryInterface.dropTable('flows');
  }
};
