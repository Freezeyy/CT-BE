module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Template3s', {
      template3_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      old_campus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'StudentOldCampuses',
          key: 'old_campus_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      old_programme_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Old institution program name (e.g., "Diploma in Software Engineering")',
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
        comment: 'New institution program (e.g., BSE)',
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Courses',
          key: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      old_subject_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      old_subject_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      old_subject_credit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      new_subject_code: {
        type: Sequelize.STRING,
        allowNull: true, // Can be null if mapping to course by name only
      },
      new_subject_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      new_subject_credit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      similarity_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 80, // Default 80% for Template3 (pre-approved)
      },
      template3_pdf_path: {
        type: Sequelize.TEXT,
        allowNull: true, // PDF file path for the Template3 document
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      replaced_by_template3_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Template3s',
          key: 'template3_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      intake_year: {
        type: Sequelize.STRING,
        allowNull: true, // e.g., "2021-2023"
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
    
    // Add index for faster lookups (includes old_programme_name for program-specific lookups)
    await queryInterface.addIndex('Template3s', ['old_campus_id', 'old_programme_name', 'program_id', 'old_subject_code', 'is_active'], {
      name: 'template3_lookup_idx',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Template3s');
  },
};
