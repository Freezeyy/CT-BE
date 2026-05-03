module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Students', 'student_identifier', {
      type: Sequelize.STRING,
      allowNull: true, // keep existing DBs working; enforced at signup/API level
      unique: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Students', 'student_identifier');
  },
};

