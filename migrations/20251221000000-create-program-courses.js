module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ProgramCourses', {
      program_course_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Programs',
          key: 'program_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Courses',
          key: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Add unique constraint to prevent duplicate program-course pairs
    await queryInterface.addIndex('ProgramCourses', ['program_id', 'course_id'], {
      unique: true,
      name: 'unique_program_course',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ProgramCourses');
  },
};

