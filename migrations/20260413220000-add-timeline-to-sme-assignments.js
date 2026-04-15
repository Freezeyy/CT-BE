module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('SMEAssignments', 'assigned_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('SMEAssignments', 'due_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('SMEAssignments', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('SMEAssignments', 'assignment_status', {
      type: Sequelize.STRING, // pending | completed
      allowNull: false,
      defaultValue: 'pending',
    });

    // Backfill for existing rows
    await queryInterface.sequelize.query(`
      UPDATE SMEAssignments
      SET assigned_at = COALESCE(assigned_at, createdAt),
          due_at = COALESCE(due_at, DATE_ADD(createdAt, INTERVAL 14 DAY)),
          assignment_status = COALESCE(assignment_status, 'pending');
    `);

    await queryInterface.addIndex('SMEAssignments', ['sme_id', 'assignment_status'], {
      name: 'idx_smeassignments_sme_status',
    });
  },

  down: async (queryInterface) => {
    // MySQL requires an index on FK columns (sme_id). If the composite index is the only
    // one covering sme_id, dropping it can fail. Ensure a single-column index exists first.
    try {
      await queryInterface.addIndex('SMEAssignments', ['sme_id'], {
        name: 'idx_smeassignments_sme_id',
      });
    } catch (e) {
      // ignore if it already exists
    }

    await queryInterface.removeIndex('SMEAssignments', 'idx_smeassignments_sme_status');
    await queryInterface.removeColumn('SMEAssignments', 'assignment_status');
    await queryInterface.removeColumn('SMEAssignments', 'completed_at');
    await queryInterface.removeColumn('SMEAssignments', 'due_at');
    await queryInterface.removeColumn('SMEAssignments', 'assigned_at');
  },
};

