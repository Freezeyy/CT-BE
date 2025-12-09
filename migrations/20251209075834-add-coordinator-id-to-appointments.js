module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appointments', 'coordinator_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Coordinators',
        key: 'coordinator_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Appointments', 'coordinator_id');
  },
};

