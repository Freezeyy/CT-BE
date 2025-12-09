module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Students', 'campus_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Campuses',
        key: 'campus_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      after: 'program_id', // Add after program_id column
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Students', 'campus_id');
  },
};

