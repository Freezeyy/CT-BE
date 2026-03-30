const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UniType extends Model {
    static associate(models) {
      this.hasMany(models.Institution, {
        foreignKey: 'uni_type_id',
        as: 'institutions',
      });
    }
  }

  UniType.init({
    uni_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uni_type_code: DataTypes.STRING,
    uni_type_name: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'UniType',
    tableName: 'UniTypes',
    underscored: false,
  });

  return UniType;
};

