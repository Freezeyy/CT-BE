module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PastApplicationSubjects', 'approval_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'pending', // pending, approved_template3, approved_sme, rejected, needs_sme_review
    });
    await queryInterface.addColumn('PastApplicationSubjects', 'template3_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Template3s',
        key: 'template3_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('PastApplicationSubjects', 'similarity_percentage', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PastApplicationSubjects', 'needs_sme_review', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('PastApplicationSubjects', 'sme_review_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('PastApplicationSubjects', 'coordinator_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('PastApplicationSubjects', 'coordinator_notes');
    await queryInterface.removeColumn('PastApplicationSubjects', 'sme_review_notes');
    await queryInterface.removeColumn('PastApplicationSubjects', 'needs_sme_review');
    await queryInterface.removeColumn('PastApplicationSubjects', 'similarity_percentage');
    await queryInterface.removeColumn('PastApplicationSubjects', 'template3_id');
    await queryInterface.removeColumn('PastApplicationSubjects', 'approval_status');
  },
};
