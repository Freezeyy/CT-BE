const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Program extends Model {
    static associate(models) {
      // Program belongs to Campus
      this.belongsTo(models.Campus, {
        foreignKey: 'campus_id',
        as: 'campus',
      });
      // Program has many Students
      this.hasMany(models.Student, {
        foreignKey: 'program_id',
        as: 'students',
      });
      // Program belongs to many Courses (many-to-many)
      this.belongsToMany(models.Course, {
        through: models.ProgramCourse,
        foreignKey: 'program_id',
        otherKey: 'course_id',
        as: 'courses',
      });
      // Program has many ProgramCourses (junction table entries)
      this.hasMany(models.ProgramCourse, {
        foreignKey: 'program_id',
        as: 'programCourses',
      });
      // Program has many Coordinators
      this.hasMany(models.Coordinator, {
        foreignKey: 'program_id',
        as: 'coordinators',
      });
      // Program has many CreditTransferApplications
      this.hasMany(models.CreditTransferApplication, {
        foreignKey: 'program_id',
        as: 'creditTransferApplications',
      });
    }
  }
  Program.init({
    program_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    program_name: DataTypes.STRING,
    program_code: DataTypes.STRING,
    program_structure: DataTypes.TEXT,
    campus_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Program',
    tableName: 'Programs',
    underscored: false,
  });
  return Program;
};

