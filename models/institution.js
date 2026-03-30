const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Institution extends Model {
    static associate(models) {
      this.belongsTo(models.UniType, {
        foreignKey: 'uni_type_id',
        as: 'uniType',
      });
      this.hasMany(models.StudentOldCampus, {
        foreignKey: 'institution_id',
        as: 'oldCampuses',
      });
    }
  }

  Institution.init({
    institution_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    institution_name: DataTypes.STRING,
    uni_type_id: DataTypes.INTEGER,
    is_active: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Institution',
    tableName: 'Institutions',
    underscored: false,
  });

  return Institution;
};

