'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('pedidos', 'ultimaMensagem', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('pedidos', 'ultimaMensagem', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
