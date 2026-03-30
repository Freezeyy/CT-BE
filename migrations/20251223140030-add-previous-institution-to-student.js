module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Students', 'institution_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Institutions',
        key: 'institution_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Students', ['institution_id'], {
      name: 'students_institution_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Students', 'Students_institution_id_foreign_idx');
    await queryInterface.removeIndex('Students', 'students_institution_idx');
    await queryInterface.removeColumn('Students', 'institution_id');
  },
};