module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CreditTransferApplications', {
      ct_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      ct_status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ct_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      prev_campus_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Students',
          key: 'student_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      coordinator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Coordinators',
          key: 'coordinator_id',
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
    await queryInterface.dropTable('CreditTransferApplications');
  },
};

