module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Programs', {
      program_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      program_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      program_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      program_structure: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      campus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Campuses',
          key: 'campus_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
    await queryInterface.dropTable('Programs');
  },
};

