'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('historico_mensagens');
    if (!Object.prototype.hasOwnProperty.call(table, 'media_url')) {
      await queryInterface.addColumn('historico_mensagens', 'media_url', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(table, 'message_type')) {
      await queryInterface.addColumn('historico_mensagens', 'message_type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'texto',
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('historico_mensagens', 'media_url');
    await queryInterface.removeColumn('historico_mensagens', 'message_type');
  }
};
