module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Lecturers', 'is_superadmin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addIndex('Lecturers', ['is_superadmin'], {
      name: 'lecturers_is_superadmin_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Lecturers', 'lecturers_is_superadmin_idx');
    await queryInterface.removeColumn('Lecturers', 'is_superadmin');
  },
};

