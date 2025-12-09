module.exports = {
  up: async (queryInterface) => {
    // Drop Users table first (it has foreign key to Roles)
    await queryInterface.dropTable('Users');
    // Then drop Roles table
    await queryInterface.dropTable('Roles');
  },
  down: async (queryInterface, Sequelize) => {
    // Recreate Roles table
    await queryInterface.createTable('Roles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
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
    // Recreate Users table
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      password: {
        type: Sequelize.STRING,
      },
      phone: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
      },
      image: {
        allowNull: true,
        type: Sequelize.TEXT,
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
      reset_token: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      verifiedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      RoleId: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
    });
  },
};

