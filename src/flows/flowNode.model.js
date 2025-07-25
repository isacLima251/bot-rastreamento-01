module.exports = (sequelize, DataTypes) => {
  const FlowNode = sequelize.define('FlowNode', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    flow_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING, allowNull: false },
    conteudo: DataTypes.TEXT,
    next_node_id: DataTypes.INTEGER
  }, { tableName: 'flow_nodes', timestamps: true });
  return FlowNode;
};
