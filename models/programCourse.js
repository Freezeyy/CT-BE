const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProgramCourse extends Model {
    static associate(models) {
      // ProgramCourse belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // ProgramCourse belongs to Course
      this.belongsTo(models.Course, {
        foreignKey: 'course_id',
        as: 'course',
      });
      this.belongsTo(models.Course, {
        foreignKey: 'prerequisite_course_id',
        as: 'prerequisiteCourse',
      });
    }
  }
  ProgramCourse.init({
    program_course_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    program_id: DataTypes.INTEGER,
    course_id: DataTypes.INTEGER,
    academic_year: DataTypes.INTEGER,
    semester_number: DataTypes.INTEGER,
    sort_order: DataTypes.INTEGER,
    prerequisite_course_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'ProgramCourse',
    tableName: 'ProgramCourses',
    underscored: false,
  });
  return ProgramCourse;
};

