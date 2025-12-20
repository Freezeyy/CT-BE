const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NewApplicationSubject extends Model {
    static associate(models) {
      // NewApplicationSubject belongs to CreditTransferApplication
      this.belongsTo(models.CreditTransferApplication, {
        foreignKey: 'ct_id',
        as: 'creditTransferApplication',
      });
      // NewApplicationSubject belongs to Course
      this.belongsTo(models.Course, {
        foreignKey: 'course_id',
        as: 'course',
      });
      // NewApplicationSubject has many PastApplicationSubjects
      this.hasMany(models.PastApplicationSubject, {
        foreignKey: 'application_subject_id',
        as: 'pastApplicationSubjects',
      });
      // NewApplicationSubject has many SMEAssignments
      this.hasMany(models.SMEAssignment, {
        foreignKey: 'application_subject_id',
        as: 'smeAssignments',
      });
      // NewApplicationSubject has many PastSyllabusApprovals
      this.hasMany(models.PastSyllabusApproval, {
        foreignKey: 'application_subject_id',
        as: 'pastSyllabusApprovals',
      });
    }
  }
  NewApplicationSubject.init({
    application_subject_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    application_subject_name: DataTypes.STRING, // Keep for backward compatibility, can be derived from course
    course_id: DataTypes.INTEGER, // FK to Courses table
    ct_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'NewApplicationSubject',
    tableName: 'NewApplicationSubjects',
    underscored: false,
  });
  return NewApplicationSubject;
};

