module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Migrate existing program_id data from Courses to ProgramCourses junction table
    // Only migrate courses that have a valid program_id
    // Using INSERT IGNORE to skip duplicates (MariaDB/MySQL syntax)
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO \`ProgramCourses\` (\`program_id\`, \`course_id\`, \`createdAt\`, \`updatedAt\`)
      SELECT \`program_id\`, \`course_id\`, NOW(), NOW()
      FROM \`Courses\`
      WHERE \`program_id\` IS NOT NULL;
    `);
  },

  down: async (queryInterface) => {
    // This migration is not reversible without losing data
    // We would need to restore program_id from junction table, but we can't know which one to pick if a course has multiple programs
    await queryInterface.sequelize.query(`
      DELETE FROM \`ProgramCourses\`;
    `);
  },
};

