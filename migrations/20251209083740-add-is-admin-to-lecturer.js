module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Lecturers', 'is_admin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Lecturers', 'is_admin');
  },
};

