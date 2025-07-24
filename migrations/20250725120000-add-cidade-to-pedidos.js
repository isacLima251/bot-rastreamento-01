'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('pedidos');
    if (!Object.prototype.hasOwnProperty.call(table, 'cidade')) {
      await queryInterface.addColumn('pedidos', 'cidade', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos', 'cidade');
  }
};
