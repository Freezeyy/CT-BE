module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('StudentOldCampuses', 'institution_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Institutions',
        key: 'institution_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // optional consistency
    await queryInterface.addColumn('StudentOldCampuses', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addIndex('StudentOldCampuses', ['institution_id', 'old_campus_name'], {
      name: 'old_campuses_institution_name_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('StudentOldCampuses', 'StudentOldCampuses_institution_id_foreign_idx');
    await queryInterface.removeIndex('StudentOldCampuses', 'old_campuses_institution_name_idx');
    await queryInterface.removeColumn('StudentOldCampuses', 'institution_id');
    await queryInterface.removeColumn('StudentOldCampuses', 'is_active');
  },
};

