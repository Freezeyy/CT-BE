const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CreditTransferApplication extends Model {
    static associate(models) {
      // CreditTransferApplication belongs to Student
      this.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student',
      });
      // CreditTransferApplication belongs to Coordinator
      this.belongsTo(models.Coordinator, {
        foreignKey: 'coordinator_id',
        as: 'coordinator',
      });
      // CreditTransferApplication belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // CreditTransferApplication has many NewApplicationSubjects
      this.hasMany(models.NewApplicationSubject, {
        foreignKey: 'ct_id',
        as: 'newApplicationSubjects',
      });
      // CreditTransferApplication has many SMEAssignments
      this.hasMany(models.SMEAssignment, {
        foreignKey: 'application_id',
        as: 'smeAssignments',
      });
      // CreditTransferApplication has many PastSyllabusApprovals
      this.hasMany(models.PastSyllabusApproval, {
        foreignKey: 'ct_id',
        as: 'pastSyllabusApprovals',
      });
    }
  }
  CreditTransferApplication.init({
    ct_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ct_status: DataTypes.STRING,
    ct_notes: DataTypes.TEXT,
    prev_campus_name: DataTypes.STRING,
    prev_programme_name: DataTypes.STRING,
    transcript_path: DataTypes.STRING,
    student_id: DataTypes.INTEGER,
    coordinator_id: DataTypes.INTEGER,
    program_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'CreditTransferApplication',
    tableName: 'CreditTransferApplications',
    underscored: false,
  });
  return CreditTransferApplication;
};

