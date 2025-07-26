module.exports = (sequelize, DataTypes) => {
  const FlowNode = sequelize.define('FlowNode', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    flow_id: { type: DataTypes.INTEGER, allowNull: false },
    node_type: { type: DataTypes.STRING, allowNull: false },
    message_text: DataTypes.TEXT,
    is_start_node: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, { tableName: 'flow_nodes', timestamps: true });
  return FlowNode;
};
