'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('pedidos');
    if (!Object.prototype.hasOwnProperty.call(table, 'ultimaMensagem')) {
      await queryInterface.addColumn('pedidos', 'ultimaMensagem', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!Object.prototype.hasOwnProperty.call(table, 'dataUltimaMensagem')) {
      await queryInterface.addColumn('pedidos', 'dataUltimaMensagem', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos', 'ultimaMensagem');
    await queryInterface.removeColumn('pedidos', 'dataUltimaMensagem');
  }
};
