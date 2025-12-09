const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PastSyllabusApproval extends Model {
    static associate(models) {
      // PastSyllabusApproval belongs to StudentOldCampus
      this.belongsTo(models.StudentOldCampus, {
        foreignKey: 'old_campus_id',
        as: 'oldCampus',
      });
      // PastSyllabusApproval belongs to CreditTransferApplication
      this.belongsTo(models.CreditTransferApplication, {
        foreignKey: 'ct_id',
        as: 'creditTransferApplication',
      });
      // PastSyllabusApproval belongs to PastApplicationSubject
      this.belongsTo(models.PastApplicationSubject, {
        foreignKey: 'pastSubject_id',
        as: 'pastApplicationSubject',
      });
      // PastSyllabusApproval belongs to NewApplicationSubject
      this.belongsTo(models.NewApplicationSubject, {
        foreignKey: 'application_subject_id',
        as: 'newApplicationSubject',
      });
    }
  }
  PastSyllabusApproval.init({
    psa_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    old_campus_id: DataTypes.INTEGER,
    ct_id: DataTypes.INTEGER,
    pastSubject_id: DataTypes.INTEGER,
    application_subject_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PastSyllabusApproval',
    tableName: 'PastSyllabusApprovals',
    underscored: false,
  });
  return PastSyllabusApproval;
};

