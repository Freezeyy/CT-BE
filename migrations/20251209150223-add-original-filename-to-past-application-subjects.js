module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PastApplicationSubjects', 'original_filename', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('PastApplicationSubjects', 'original_filename');
  },
};
