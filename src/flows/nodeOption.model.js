module.exports = (sequelize, DataTypes) => {
  const NodeOption = sequelize.define('NodeOption', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    node_id: { type: DataTypes.INTEGER, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
    next_node_id: DataTypes.INTEGER
  }, { tableName: 'node_options', timestamps: true });
  return NodeOption;
};
