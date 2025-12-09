module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SMEAssignments', {
      assignment_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sme_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'SubjectMethodExperts',
          key: 'sme_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CreditTransferApplications',
          key: 'ct_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      application_subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'NewApplicationSubjects',
          key: 'application_subject_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pastSubject_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'PastApplicationSubjects',
          key: 'pastSubject_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      old_campus_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'StudentOldCampuses',
          key: 'old_campus_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    await queryInterface.dropTable('SMEAssignments');
  },
};

