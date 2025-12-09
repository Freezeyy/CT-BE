module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HeadOfSections', {
      hos_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lecturer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Lecturers',
          key: 'lecturer_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('HeadOfSections');
  },
};

