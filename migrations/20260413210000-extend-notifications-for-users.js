module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Notifications', 'noti_receiver_type', {
      type: Sequelize.STRING, // student | lecturer
      allowNull: false,
      defaultValue: 'student',
    });
    await queryInterface.addColumn('Notifications', 'noti_receiver_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('Notifications', 'is_read', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('Notifications', 'read_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Notifications', 'link_path', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addIndex('Notifications', ['noti_receiver_type', 'noti_receiver_id', 'is_read'], {
      name: 'idx_notifications_receiver_read',
    });
    await queryInterface.addIndex('Notifications', ['noti_receiver_type', 'noti_receiver_id', 'createdAt'], {
      name: 'idx_notifications_receiver_created',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Notifications', 'idx_notifications_receiver_read');
    await queryInterface.removeIndex('Notifications', 'idx_notifications_receiver_created');
    await queryInterface.removeColumn('Notifications', 'link_path');
    await queryInterface.removeColumn('Notifications', 'read_at');
    await queryInterface.removeColumn('Notifications', 'is_read');
    await queryInterface.removeColumn('Notifications', 'noti_receiver_id');
    await queryInterface.removeColumn('Notifications', 'noti_receiver_type');
  },
};

