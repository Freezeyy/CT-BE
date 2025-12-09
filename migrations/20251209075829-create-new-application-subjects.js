module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('NewApplicationSubjects', {
      application_subject_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      application_subject_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ct_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CreditTransferApplications',
          key: 'ct_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    await queryInterface.dropTable('NewApplicationSubjects');
  },
};

