const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Category has many Courses
      this.hasMany(models.Course, {
        foreignKey: 'category_id',
        as: 'courses',
      });
    }
  }
  Category.init({
    category_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'Categories',
    underscored: false,
  });
  return Category;
};

