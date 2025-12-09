const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Campus extends Model {
    static associate(models) {
      // Campus has many Lecturers
      this.hasMany(models.Lecturer, {
        foreignKey: 'campus_id',
        as: 'lecturers',
      });
      // Campus has many Programs
      this.hasMany(models.Program, {
        foreignKey: 'campus_id',
        as: 'programs',
      });
      // Campus has many Courses
      this.hasMany(models.Course, {
        foreignKey: 'campus_id',
        as: 'courses',
      });
    }
  }
  Campus.init({
    campus_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    campus_name: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Campus',
    tableName: 'Campuses',
    underscored: false,
  });
  return Campus;
};

