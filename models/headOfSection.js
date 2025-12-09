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
    }
  }
  HeadOfSection.init({
    hos_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lecturer_id: DataTypes.INTEGER,
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

