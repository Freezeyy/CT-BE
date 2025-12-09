module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Lecturers', {
      lecturer_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lecturer_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lecturer_email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      lecturer_password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lecturer_image: {
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
    await queryInterface.dropTable('Lecturers');
  },
};

