module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HosReviews', {
      hos_review_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      hos_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'HeadOfSections', key: 'hos_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      application_subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'NewApplicationSubjects', key: 'application_subject_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ct_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CreditTransferApplications', key: 'ct_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      coordinator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Coordinators', key: 'coordinator_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      hos_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      decided_at: {
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

    await queryInterface.addIndex('HosReviews', ['hos_id', 'status'], { name: 'idx_hosreviews_hos_status' });
    await queryInterface.addIndex('HosReviews', ['ct_id', 'application_subject_id'], { name: 'idx_hosreviews_ct_subject' });
    await queryInterface.addConstraint('HosReviews', {
      fields: ['hos_id', 'application_subject_id', 'status'],
      type: 'unique',
      name: 'unique_active_hos_review_per_subject',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('HosReviews');
  },
};

