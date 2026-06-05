module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.map(String).some((t) => t.toLowerCase() === 'courses');
    if (!hasTable) return;

    const cols = await queryInterface.describeTable('Courses');
    if (!cols.syllabus) {
      await queryInterface.addColumn('Courses', 'syllabus', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.map(String).some((t) => t.toLowerCase() === 'courses');
    if (!hasTable) return;

    const cols = await queryInterface.describeTable('Courses');
    if (cols.syllabus) {
      await queryInterface.removeColumn('Courses', 'syllabus');
    }
  },
};
