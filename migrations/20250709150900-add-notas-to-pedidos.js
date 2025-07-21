'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('pedidos');
    if (!Object.prototype.hasOwnProperty.call(table, 'notas')) {
      await queryInterface.addColumn('pedidos', 'notas', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos', 'notas');
  }
};
