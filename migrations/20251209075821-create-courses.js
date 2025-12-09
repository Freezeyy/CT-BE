module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Courses', {
      course_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      course_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      course_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      course_credit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Programs',
          key: 'program_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
    await queryInterface.dropTable('Courses');
  },
};

