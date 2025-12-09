const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Lecturer extends Model {
    static associate(models) {
      // Lecturer belongs to Campus
      this.belongsTo(models.Campus, {
        foreignKey: 'campus_id',
        as: 'campus',
      });
      // Lecturer has many Coordinators (has role)
      this.hasMany(models.Coordinator, {
        foreignKey: 'lecturer_id',
        as: 'coordinators',
      });
      // Lecturer has many HeadOfSections (has role)
      this.hasMany(models.HeadOfSection, {
        foreignKey: 'lecturer_id',
        as: 'headOfSections',
      });
      // Lecturer has many SubjectMethodExperts (has role)
      this.hasMany(models.SubjectMethodExpert, {
        foreignKey: 'lecturer_id',
        as: 'subjectMethodExperts',
      });
    }
  }
  Lecturer.init({
    lecturer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lecturer_name: DataTypes.STRING,
    lecturer_email: DataTypes.STRING,
    lecturer_password: DataTypes.STRING,
    lecturer_image: DataTypes.TEXT,
    is_admin: DataTypes.BOOLEAN,
    campus_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Lecturer',
    tableName: 'Lecturers',
    underscored: false,
  });
  return Lecturer;
};

