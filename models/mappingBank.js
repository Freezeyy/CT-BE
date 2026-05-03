const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MappingBank extends Model {
    static associate(models) {
      this.belongsTo(models.Coordinator, {
        foreignKey: 'coordinator_id',
        as: 'uploaderCoordinator',
      });
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program',
      });
      this.belongsTo(models.StudentOldCampus, {
        foreignKey: 'old_campus_id',
        as: 'oldCampus',
      });
    }
  }

  MappingBank.init({
    mb_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'mapping_bank_id',
    },
    uploader_coordinator_id: {
      type: DataTypes.INTEGER,
      field: 'coordinator_id',
    },
    mb_name: {
      type: DataTypes.STRING,
      field: 'title',
    },
    program_id: DataTypes.INTEGER,
    old_campus_id: DataTypes.INTEGER,
    file_upload: {
      type: DataTypes.STRING,
      field: 'file_path',
    },
    intake_year: DataTypes.STRING,
    prev_program: DataTypes.STRING, // added by migration (or can reuse description)
    namingConvention: DataTypes.STRING, // added by migration (or can reuse mapping_code)
    visible_student_ids: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'MappingBank',
    tableName: 'MappingBanks',
    underscored: false,
  });

  return MappingBank;
};

