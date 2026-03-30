module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Students');
    if (tableDesc.institution_id) {
      try {
        await queryInterface.removeIndex('Students', 'students_institution_idx');
      } catch (e) { /* ignore */ }
      try {
        await queryInterface.removeConstraint('Students', 'Students_institution_id_foreign_idx');
      } catch (e) { /* ignore */ }
      await queryInterface.removeColumn('Students', 'institution_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Students');
    if (!tableDesc.institution_id) {
      await queryInterface.addColumn('Students', 'institution_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Institutions', key: 'institution_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.addIndex('Students', ['institution_id'], { name: 'students_institution_idx' });
    }
  },
};

