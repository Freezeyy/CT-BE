const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubjectMethodExpert extends Model {
    static associate(models) {
      // SubjectMethodExpert belongs to Lecturer
      this.belongsTo(models.Lecturer, {
        foreignKey: 'lecturer_id',
        as: 'lecturer',
      });
      // SubjectMethodExpert belongs to Course
      this.belongsTo(models.Course, {
        foreignKey: 'course_id',
        as: 'course',
      });
      // SubjectMethodExpert belongs to CreditTransferApplication
      this.belongsTo(models.CreditTransferApplication, {
        foreignKey: 'application_id',
        as: 'creditTransferApplication',
      });
      // SubjectMethodExpert has many SMEAssignments
      this.hasMany(models.SMEAssignment, {
        foreignKey: 'sme_id',
        as: 'smeAssignments',
      });
    }
  }
  SubjectMethodExpert.init({
    sme_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lecturer_id: DataTypes.INTEGER,
    course_id: DataTypes.INTEGER,
    application_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'SubjectMethodExpert',
    tableName: 'SubjectMethodExperts',
    underscored: false,
  });
  return SubjectMethodExpert;
};

