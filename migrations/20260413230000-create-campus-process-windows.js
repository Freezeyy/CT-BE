module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CampusProcessWindows', {
      campus_process_window_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      campus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Campuses', key: 'campus_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ct_start_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ct_end_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sme_eval_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 14,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('CampusProcessWindows', {
      fields: ['campus_id'],
      type: 'unique',
      name: 'unique_campus_process_window',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('CampusProcessWindows');
  },
};

