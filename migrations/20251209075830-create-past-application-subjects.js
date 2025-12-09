module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PastApplicationSubjects', {
      pastSubject_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      pastSubject_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pastSubject_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pastSubject_grade: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pastSubject_syllabus_path: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.dropTable('PastApplicationSubjects');
  },
};

