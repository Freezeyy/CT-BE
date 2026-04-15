const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HosReview extends Model {
    static associate(models) {
      // HosReview belongs to HeadOfSection (assignee)
      this.belongsTo(models.HeadOfSection, {
        foreignKey: 'hos_id',
        as: 'hos',
      });
      // HosReview belongs to NewApplicationSubject
      this.belongsTo(models.NewApplicationSubject, {
        foreignKey: 'application_subject_id',
        as: 'newApplicationSubject',
      });
      // HosReview belongs to CreditTransferApplication
      this.belongsTo(models.CreditTransferApplication, {
        foreignKey: 'ct_id',
        as: 'creditTransferApplication',
      });
      // HosReview belongs to Coordinator (sender)
      this.belongsTo(models.Coordinator, {
        foreignKey: 'coordinator_id',
        as: 'coordinator',
      });
    }
  }

  HosReview.init({
    hos_review_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    hos_id: DataTypes.INTEGER,
    application_subject_id: DataTypes.INTEGER,
    ct_id: DataTypes.INTEGER,
    coordinator_id: DataTypes.INTEGER,
    status: DataTypes.STRING, // pending | approved | rejected
    hos_notes: DataTypes.TEXT,
    decided_at: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'HosReview',
    tableName: 'HosReviews',
    underscored: false,
  });

  return HosReview;
};

