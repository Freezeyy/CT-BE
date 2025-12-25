module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Categories', {
      category_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      category_name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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

    // Insert default categories
    await queryInterface.bulkInsert('Categories', [
      { category_name: 'Common Core', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'University Compulsory', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'MPU', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'Discipline Core', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'Elective', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'Final Year Project', createdAt: new Date(), updatedAt: new Date() },
      { category_name: 'Industrial Training', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Categories');
  },
};

