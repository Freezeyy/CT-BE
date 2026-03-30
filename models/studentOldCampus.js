const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentOldCampus extends Model {
    static associate(models) {
      // StudentOldCampus belongs to Institution (previous institution parent)
      this.belongsTo(models.Institution, {
        foreignKey: 'institution_id',
        as: 'institution',
      });
      // StudentOldCampus has many Students
      this.hasMany(models.Student, {
        foreignKey: 'old_campus_id',
        as: 'students',
      });
      // StudentOldCampus has many SMEAssignments
      this.hasMany(models.SMEAssignment, {
        foreignKey: 'old_campus_id',
        as: 'smeAssignments',
      });
      // StudentOldCampus has many PastSyllabusApprovals
      this.hasMany(models.PastSyllabusApproval, {
        foreignKey: 'old_campus_id',
        as: 'pastSyllabusApprovals',
      });
    }
  }
  StudentOldCampus.init({
    old_campus_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    old_campus_name: DataTypes.STRING,
    institution_id: DataTypes.INTEGER,
    is_active: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'StudentOldCampus',
    tableName: 'StudentOldCampuses',
    underscored: false,
  });
  return StudentOldCampus;
};

