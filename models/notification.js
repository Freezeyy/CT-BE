const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // Notifications don't have explicit foreign keys in the ERD
      // noti_receiver_id is a generic integer that could reference different entities
    }
  }
  Notification.init({
    noti_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    noti_type: DataTypes.STRING,
    noti_title: DataTypes.STRING,
    noti_message: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'Notifications',
    underscored: false,
  });
  return Notification;
};

