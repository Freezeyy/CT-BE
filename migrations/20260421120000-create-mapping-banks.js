module.exports = {
  up: async (queryInterface, Sequelize) => {
    // This project already has a `MappingBanks` table in some environments.
    // Keep this migration idempotent: create if missing, otherwise align columns.
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.map(String).some((t) => t.toLowerCase() === 'mappingbanks');

    if (!hasTable) {
      await queryInterface.createTable('MappingBanks', {
        mapping_bank_id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        coordinator_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Coordinators', key: 'coordinator_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Programs', key: 'program_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        old_campus_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'StudentOldCampuses', key: 'old_campus_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        title: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        file_path: { type: Sequelize.STRING, allowNull: false },
        original_filename: { type: Sequelize.STRING, allowNull: true },
        intake_year: { type: Sequelize.STRING, allowNull: true },
        mapping_code: { type: Sequelize.STRING, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      });
    }

    const cols = await queryInterface.describeTable('MappingBanks');

    if (!cols.visible_student_ids) {
      await queryInterface.addColumn('MappingBanks', 'visible_student_ids', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Supervisor-requested fields (store alongside existing ones; keep backward-compatible)
    if (!cols.prev_program) {
      await queryInterface.addColumn('MappingBanks', 'prev_program', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!cols.namingConvention) {
      await queryInterface.addColumn('MappingBanks', 'namingConvention', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    // Avoid dropping table on rollback (could contain real data).
    // Instead, remove only the columns added by this migration if present.
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.map(String).some((t) => t.toLowerCase() === 'mappingbanks');
    if (!hasTable) return;

    const cols = await queryInterface.describeTable('MappingBanks');
    if (cols.namingConvention) await queryInterface.removeColumn('MappingBanks', 'namingConvention');
    if (cols.prev_program) await queryInterface.removeColumn('MappingBanks', 'prev_program');
    if (cols.visible_student_ids) await queryInterface.removeColumn('MappingBanks', 'visible_student_ids');
  },
};

