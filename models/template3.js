const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Template3 extends Model {
    static associate(models) {
      // Template3 belongs to StudentOldCampus
      this.belongsTo(models.StudentOldCampus, {
        foreignKey: 'old_campus_id',
        as: 'oldCampus',
      });
      // Template3 belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // Template3 belongs to Course
      this.belongsTo(models.Course, {
        foreignKey: 'course_id',
        as: 'course',
      });
      // Template3 can be replaced by another Template3 (for cohort tracking)
      this.belongsTo(models.Template3, {
        foreignKey: 'replaced_by_template3_id',
        as: 'replacedBy',
      });
      // Template3 can replace another Template3
      this.hasOne(models.Template3, {
        foreignKey: 'replaced_by_template3_id',
        as: 'replaces',
      });
    }
  }
  Template3.init({
    template3_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    old_campus_id: DataTypes.INTEGER,
    old_programme_name: DataTypes.STRING, // Old institution program name (e.g., "Diploma in Software Engineering")
    program_id: DataTypes.INTEGER, // New institution program (e.g., BSE)
    course_id: DataTypes.INTEGER,
    old_subject_code: DataTypes.STRING,
    old_subject_name: DataTypes.STRING,
    old_subject_credit: DataTypes.INTEGER,
    new_subject_code: DataTypes.STRING,
    new_subject_name: DataTypes.STRING,
    new_subject_credit: DataTypes.INTEGER,
    similarity_percentage: DataTypes.INTEGER,
    template3_pdf_path: DataTypes.TEXT,
    is_active: DataTypes.BOOLEAN,
    replaced_by_template3_id: DataTypes.INTEGER,
    intake_year: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Template3',
    tableName: 'Template3s',
    underscored: false,
  });
  return Template3;
};
