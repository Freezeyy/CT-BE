module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Template3s');

    if (!table.sme_review_notes) {
      await queryInterface.addColumn('Template3s', 'sme_review_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!table.topics_comparison) {
      await queryInterface.addColumn('Template3s', 'topics_comparison', {
        type: Sequelize.TEXT, // store JSON string
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('Template3s');
    if (table.topics_comparison) {
      await queryInterface.removeColumn('Template3s', 'topics_comparison');
    }
    if (table.sme_review_notes) {
      await queryInterface.removeColumn('Template3s', 'sme_review_notes');
    }
  },
};

