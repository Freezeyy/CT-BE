module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Students', {
      student_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      student_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      student_email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      student_password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      student_phone: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.dropTable('Students');
  },
};

