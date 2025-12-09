const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PastApplicationSubject extends Model {
    static associate(models) {
      // PastApplicationSubject belongs to NewApplicationSubject
      this.belongsTo(models.NewApplicationSubject, {
        foreignKey: 'application_subject_id',
        as: 'newApplicationSubject',
      });
      // PastApplicationSubject has many PastSyllabusApprovals
      this.hasMany(models.PastSyllabusApproval, {
        foreignKey: 'pastSubject_id',
        as: 'pastSyllabusApprovals',
      });
    }
  }
  PastApplicationSubject.init({
    pastSubject_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pastSubject_code: DataTypes.STRING,
    pastSubject_name: DataTypes.STRING,
    pastSubject_grade: DataTypes.STRING,
    pastSubject_syllabus_path: DataTypes.TEXT,
    application_subject_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PastApplicationSubject',
    tableName: 'PastApplicationSubjects',
    underscored: false,
  });
  return PastApplicationSubject;
};

