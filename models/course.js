const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // Course belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // Course belongs to Campus
      this.belongsTo(models.Campus, {
        foreignKey: 'campus_id',
        as: 'campus',
      });
      // Course has many SubjectMethodExperts
      this.hasMany(models.SubjectMethodExpert, {
        foreignKey: 'course_id',
        as: 'subjectMethodExperts',
      });
      // Note: NewApplicationSubjects are linked to courses by name matching, not by foreign key
      // The application_subject_name in NewApplicationSubjects matches course_name in Courses
    }
  }
  Course.init({
    course_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_name: DataTypes.STRING,
    course_code: DataTypes.STRING,
    course_credit: DataTypes.INTEGER,
    program_id: DataTypes.INTEGER,
    campus_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'Courses',
    underscored: false,
  });
  return Course;
};

