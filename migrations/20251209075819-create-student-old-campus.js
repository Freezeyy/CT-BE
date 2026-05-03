module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('StudentOldCampuses', {
      old_campus_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      old_campus_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
  down: async (queryInterface) => {
    // In some environments, `MappingBanks` exists outside the migration chain
    // and references `StudentOldCampuses`. Drop that FK constraint first so undo works.
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE `MappingBanks` DROP FOREIGN KEY `mappingbanks_ibfk_3`'
      );
    } catch (e) {
      // ignore if table/constraint doesn't exist
    }
    await queryInterface.dropTable('StudentOldCampuses');
  },
};

