const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    static associate(models) {
      // Student belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // Student belongs to Campus
      this.belongsTo(models.Campus, {
        foreignKey: 'campus_id',
        as: 'campus',
      });
      // Student belongs to StudentOldCampus
      this.belongsTo(models.StudentOldCampus, {
        foreignKey: 'old_campus_id',
        as: 'oldCampus',
      });
      // Student has many CreditTransferApplications
      this.hasMany(models.CreditTransferApplication, {
        foreignKey: 'student_id',
        as: 'creditTransferApplications',
      });
      // Student has many Appointments
      this.hasMany(models.Appointment, {
        foreignKey: 'student_id',
        as: 'appointments',
      });
    }
  }
  Student.init({
    student_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_name: DataTypes.STRING,
    student_email: DataTypes.STRING,
    student_password: DataTypes.STRING,
    student_phone: DataTypes.STRING,
    program_id: DataTypes.INTEGER,
    campus_id: DataTypes.INTEGER,
    old_campus_id: DataTypes.INTEGER,
    prev_programme_name: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Student',
    tableName: 'Students',
    underscored: false,
  });
  return Student;
};

