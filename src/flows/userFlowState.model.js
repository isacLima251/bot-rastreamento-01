module.exports = (sequelize, DataTypes) => {
  const UserFlowState = sequelize.define('UserFlowState', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    telefone: { type: DataTypes.STRING, allowNull: false },
    flow_id: { type: DataTypes.INTEGER, allowNull: false },
    node_id: DataTypes.INTEGER
  }, { tableName: 'user_flow_state', timestamps: true });
  return UserFlowState;
};
