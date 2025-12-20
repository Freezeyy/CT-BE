module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('NewApplicationSubjects', 'course_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null for backward compatibility with existing data
      references: {
        model: 'Courses',
        key: 'course_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for faster lookups
    await queryInterface.addIndex('NewApplicationSubjects', ['course_id'], {
      name: 'new_application_subjects_course_id_idx',
    });
  },

  down: async (queryInterface) => {
    // First, find and remove the foreign key constraint
    // MySQL/MariaDB automatically creates a foreign key when using references in addColumn
    // We need to query the database to find the constraint name
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'NewApplicationSubjects' 
      AND COLUMN_NAME = 'course_id' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    // Remove foreign key constraint if it exists
    if (constraints && constraints.length > 0) {
      const constraintName = constraints[0].CONSTRAINT_NAME;
      await queryInterface.sequelize.query(`
        ALTER TABLE \`NewApplicationSubjects\` 
        DROP FOREIGN KEY \`${constraintName}\`
      `);
    }

    // Now remove the index (if it exists and wasn't automatically removed with FK)
    try {
      await queryInterface.removeIndex('NewApplicationSubjects', 'new_application_subjects_course_id_idx');
    } catch (error) {
      // Index might not exist or was already removed, ignore
      console.log('Index removal skipped:', error.message);
    }

    // Finally, remove the column
    await queryInterface.removeColumn('NewApplicationSubjects', 'course_id');
  },
};

