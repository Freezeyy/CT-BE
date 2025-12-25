module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PastApplicationSubjects', 'pastSubject_credit', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('PastApplicationSubjects', 'pastSubject_credit');
  },
};

