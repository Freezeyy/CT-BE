module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CreditTransferApplications', 'prev_programme_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('CreditTransferApplications', 'transcript_path', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('CreditTransferApplications', 'transcript_path');
    await queryInterface.removeColumn('CreditTransferApplications', 'prev_programme_name');
  },
};
