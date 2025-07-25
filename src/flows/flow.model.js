module.exports = (sequelize, DataTypes) => {
  const Flow = sequelize.define('Flow', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING, allowNull: false },
    gatilho: { type: DataTypes.STRING, allowNull: false },
    ativo: { type: DataTypes.INTEGER, defaultValue: 1 }
  }, { tableName: 'flows', timestamps: true });
  return Flow;
};
