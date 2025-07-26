import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import '../App.css';

function StartNode({ data }) {
  const [keyword, setKeyword] = useState(data.keyword || '');

  const handleChange = (e) => {
    setKeyword(e.target.value);
    if (data.onChange) {
      data.onChange({ ...data, keyword: e.target.value });
    }
  };

  return (
    <div className="node-card">
      <div className="node-header">Início do Fluxo</div>
      <input
        type="text"
        className="node-input"
        placeholder="Palavra-chave"
        value={keyword}
        onChange={handleChange}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default StartNode;
