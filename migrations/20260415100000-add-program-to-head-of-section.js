module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HeadOfSections', 'program_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Programs', key: 'program_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      defaultValue: 1,
    });
    await queryInterface.addIndex('HeadOfSections', ['program_id', 'end_date'], {
      name: 'idx_hos_program_active',
    });
  },

  down: async (queryInterface) => {
    // MySQL requires dropping FK constraint before dropping the supporting index.
    // Sequelize names the FK constraint created by addColumn() as:
    // `<table>_<column>_foreign_idx`
    await queryInterface.removeConstraint('HeadOfSections', 'HeadOfSections_program_id_foreign_idx');
    await queryInterface.removeIndex('HeadOfSections', 'idx_hos_program_active');
    await queryInterface.removeColumn('HeadOfSections', 'program_id');
  },
};

