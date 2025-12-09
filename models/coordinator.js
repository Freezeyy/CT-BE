const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Coordinator extends Model {
    static associate(models) {
      // Coordinator belongs to Lecturer
      this.belongsTo(models.Lecturer, {
        foreignKey: 'lecturer_id',
        as: 'lecturer',
      });
      // Coordinator belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // Coordinator belongs to Appointment
      this.belongsTo(models.Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment',
      });
      // Coordinator has many CreditTransferApplications
      this.hasMany(models.CreditTransferApplication, {
        foreignKey: 'coordinator_id',
        as: 'creditTransferApplications',
      });
      // Coordinator has many Appointments
      this.hasMany(models.Appointment, {
        foreignKey: 'coordinator_id',
        as: 'appointments',
      });
    }
  }
  Coordinator.init({
    coordinator_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lecturer_id: DataTypes.INTEGER,
    program_id: DataTypes.INTEGER,
    appointment_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Coordinator',
    tableName: 'Coordinators',
    underscored: false,
  });
  return Coordinator;
};

