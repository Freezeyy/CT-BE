const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SMEAssignment extends Model {
    static associate(models) {
      // SMEAssignment belongs to SubjectMethodExpert
      this.belongsTo(models.SubjectMethodExpert, {
        foreignKey: 'sme_id',
        as: 'subjectMethodExpert',
      });
      // SMEAssignment belongs to CreditTransferApplication
      this.belongsTo(models.CreditTransferApplication, {
        foreignKey: 'application_id',
        as: 'creditTransferApplication',
      });
      // SMEAssignment belongs to NewApplicationSubject
      this.belongsTo(models.NewApplicationSubject, {
        foreignKey: 'application_subject_id',
        as: 'newApplicationSubject',
      });
      // SMEAssignment belongs to PastApplicationSubject
      this.belongsTo(models.PastApplicationSubject, {
        foreignKey: 'pastSubject_id',
        as: 'pastApplicationSubject',
      });
      // SMEAssignment belongs to StudentOldCampus
      this.belongsTo(models.StudentOldCampus, {
        foreignKey: 'old_campus_id',
        as: 'oldCampus',
      });
    }
  }
  SMEAssignment.init({
    assignment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sme_id: DataTypes.INTEGER,
    application_id: DataTypes.INTEGER,
    application_subject_id: DataTypes.INTEGER,
    pastSubject_id: DataTypes.INTEGER,
    old_campus_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SMEAssignment',
    tableName: 'SMEAssignments',
    underscored: false,
  });
  return SMEAssignment;
};

