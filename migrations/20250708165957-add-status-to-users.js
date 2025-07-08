'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'active'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'status');
  }
};
