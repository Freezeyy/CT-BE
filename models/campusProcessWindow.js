const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CampusProcessWindow extends Model {
    static associate(models) {
      this.belongsTo(models.Campus, {
        foreignKey: 'campus_id',
        as: 'campus',
      });
    }
  }

  CampusProcessWindow.init({
    campus_process_window_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    campus_id: DataTypes.INTEGER,
    ct_start_at: DataTypes.DATE,
    ct_end_at: DataTypes.DATE,
    sme_eval_days: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'CampusProcessWindow',
    tableName: 'CampusProcessWindows',
    underscored: false,
  });

  return CampusProcessWindow;
};

