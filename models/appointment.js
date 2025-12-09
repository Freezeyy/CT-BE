const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      // Appointment belongs to Student
      this.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student',
      });
      // Appointment belongs to Coordinator
      this.belongsTo(models.Coordinator, {
        foreignKey: 'coordinator_id',
        as: 'coordinator',
      });
      // Appointment has one Coordinator (reverse of belongsTo)
      this.hasOne(models.Coordinator, {
        foreignKey: 'appointment_id',
        as: 'coordinatorAppointment',
      });
    }
  }
  Appointment.init({
    appointment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appointment_status: DataTypes.STRING,
    appointment_notes: DataTypes.TEXT,
    appointment_start: DataTypes.DATE,
    appointment_end: DataTypes.DATE,
    student_id: DataTypes.INTEGER,
    coordinator_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Appointment',
    tableName: 'Appointments',
    underscored: false,
  });
  return Appointment;
};

