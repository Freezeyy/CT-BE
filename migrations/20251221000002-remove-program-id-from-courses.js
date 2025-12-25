module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the foreign key constraint first
    // For MariaDB/MySQL, we need to find the constraint name first
    try {
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Courses' 
        AND COLUMN_NAME = 'program_id' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      if (constraints && constraints.length > 0) {
        const constraintName = constraints[0].CONSTRAINT_NAME;
        await queryInterface.sequelize.query(`
          ALTER TABLE \`Courses\` 
          DROP FOREIGN KEY \`${constraintName}\`
        `);
      }
    } catch (error) {
      // Constraint might not exist or already removed, continue
      console.log('Foreign key constraint removal skipped:', error.message);
    }

    // Remove the program_id column
    await queryInterface.removeColumn('Courses', 'program_id');
  },

  down: async (queryInterface, Sequelize) => {
    // Add program_id column back
    await queryInterface.addColumn('Courses', 'program_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null since we can't restore all relationships
      references: {
        model: 'Programs',
        key: 'program_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    // Try to restore program_id from junction table (pick first program for each course)
    // Note: This will only restore one program per course, losing the many-to-many relationship
    await queryInterface.sequelize.query(`
      UPDATE \`Courses\` c
      SET \`program_id\` = (
        SELECT \`program_id\` 
        FROM \`ProgramCourses\` pc 
        WHERE pc.\`course_id\` = c.\`course_id\` 
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM \`ProgramCourses\` pc WHERE pc.\`course_id\` = c.\`course_id\`
      );
    `);
  },
};

