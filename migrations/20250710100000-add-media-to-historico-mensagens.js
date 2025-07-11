'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('historico_mensagens', 'media_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('historico_mensagens', 'message_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'texto',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('historico_mensagens', 'media_url');
    await queryInterface.removeColumn('historico_mensagens', 'message_type');
  }
};
