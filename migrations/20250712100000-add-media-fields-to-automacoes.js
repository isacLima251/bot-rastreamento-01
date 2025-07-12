'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('automacoes', 'tipo_midia', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'texto'
    });
    await queryInterface.addColumn('automacoes', 'url_midia', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('automacoes', 'legenda_midia', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('automacoes', 'tipo_midia');
    await queryInterface.removeColumn('automacoes', 'url_midia');
    await queryInterface.removeColumn('automacoes', 'legenda_midia');
  }
};
