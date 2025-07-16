'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('pedidos', 'lastCheckedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('pedidos', 'statusChangeAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('pedidos', 'checkCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await queryInterface.addColumn('pedidos', 'alertSent', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos', 'lastCheckedAt');
    await queryInterface.removeColumn('pedidos', 'statusChangeAt');
    await queryInterface.removeColumn('pedidos', 'checkCount');
    await queryInterface.removeColumn('pedidos', 'alertSent');
  }
};
