module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ProgramCourses', 'academic_year', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Year of study (1–4)',
    });
    await queryInterface.addColumn('ProgramCourses', 'semester_number', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Semester within year (1–3)',
    });
    await queryInterface.addColumn('ProgramCourses', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('ProgramCourses', 'prerequisite_course_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Courses',
        key: 'course_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ProgramCourses', 'prerequisite_course_id');
    await queryInterface.removeColumn('ProgramCourses', 'sort_order');
    await queryInterface.removeColumn('ProgramCourses', 'semester_number');
    await queryInterface.removeColumn('ProgramCourses', 'academic_year');
  },
};
