const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HeadOfSection extends Model {
    static associate(models) {
      // HeadOfSection belongs to Lecturer
      this.belongsTo(models.Lecturer, {
        foreignKey: 'lecturer_id',
        as: 'lecturer',
      });
      // HeadOfSection belongs to Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      // HeadOfSection has many HosReviews
      this.hasMany(models.HosReview, {
        foreignKey: 'hos_id',
        as: 'hosReviews',
      });
    }
  }
  HeadOfSection.init({
    hos_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lecturer_id: DataTypes.INTEGER,
    program_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'HeadOfSection',
    tableName: 'HeadOfSections',
    underscored: false,
  });
  return HeadOfSection;
};

