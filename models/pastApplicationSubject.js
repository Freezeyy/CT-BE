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
      // PastApplicationSubject belongs to Template3 (if matched)
      this.belongsTo(models.Template3, {
        foreignKey: 'template3_id',
        as: 'template3',
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
    pastSubject_credit: DataTypes.INTEGER,
    pastSubject_syllabus_path: DataTypes.TEXT,
    original_filename: DataTypes.STRING,
    approval_status: DataTypes.STRING, // pending, approved_template3, approved_sme, rejected, needs_sme_review
    template3_id: DataTypes.INTEGER,
    similarity_percentage: DataTypes.INTEGER,
    needs_sme_review: DataTypes.BOOLEAN,
    sme_review_notes: DataTypes.TEXT,
    coordinator_notes: DataTypes.TEXT,
    application_subject_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PastApplicationSubject',
    tableName: 'PastApplicationSubjects',
    underscored: false,
  });
  return PastApplicationSubject;
};

