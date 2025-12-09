module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add foreign key constraint to existing application_id column
    await queryInterface.addConstraint('SubjectMethodExperts', {
      fields: ['application_id'],
      type: 'foreign key',
      name: 'subjectmethodexperts_application_id_fk',
      references: {
        table: 'CreditTransferApplications',
        field: 'ct_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeConstraint('SubjectMethodExperts', 'subjectmethodexperts_application_id_fk');
  },
};

