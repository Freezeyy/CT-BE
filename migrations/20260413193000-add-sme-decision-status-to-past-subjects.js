module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add SME decision status separate from workflow status (HOS overrides approval_status)
    await queryInterface.addColumn('PastApplicationSubjects', 'sme_decision_status', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Backfill from existing statuses where possible
    await queryInterface.sequelize.query(`
      UPDATE PastApplicationSubjects
      SET sme_decision_status = approval_status
      WHERE approval_status IN ('approved_sme', 'rejected')
        AND (sme_decision_status IS NULL OR sme_decision_status = '');
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('PastApplicationSubjects', 'sme_decision_status');
  },
};

