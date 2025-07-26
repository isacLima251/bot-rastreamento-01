module.exports = (sequelize, DataTypes) => {
  const UserFlowState = sequelize.define('UserFlowState', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pedido_id: { type: DataTypes.INTEGER, allowNull: false },
    current_flow_id: { type: DataTypes.INTEGER, allowNull: false },
    current_node_id: DataTypes.INTEGER
  }, { tableName: 'user_flow_states', timestamps: true });
  return UserFlowState;
};
