module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Coordinators', {
      coordinator_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lecturer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Lecturers',
          key: 'lecturer_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Programs',
          key: 'program_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Appointments',
          key: 'appointment_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
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
    // and still references `Coordinators`. Drop that FK constraint first so
    // undo/undo:all can safely drop `Coordinators`.
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE `MappingBanks` DROP FOREIGN KEY `mappingbanks_ibfk_1`'
      );
    } catch (e) {
      // ignore if table/constraint doesn't exist
    }
    await queryInterface.dropTable('Coordinators');
  },
};

