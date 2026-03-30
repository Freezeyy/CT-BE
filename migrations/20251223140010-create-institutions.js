module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Institutions', {
      institution_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      institution_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      uni_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'UniTypes',
          key: 'uni_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('Institutions', ['uni_type_id', 'institution_name'], {
      name: 'institutions_uni_type_name_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Institutions');
  },
};

