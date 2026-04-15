module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add reset_token for forgot-password flow (token stored server-side for validation)
    await queryInterface.addColumn('Students', 'reset_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('Lecturers', 'reset_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Students', 'reset_token');
    await queryInterface.removeColumn('Lecturers', 'reset_token');
  },
};

