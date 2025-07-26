import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import '../App.css';

function MessageNode({ data }) {
  const [message, setMessage] = useState(data.message || '');

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (data.onChange) {
      data.onChange({ ...data, message: e.target.value });
    }
  };

  return (
    <div className="node-card">
      <div className="node-header">Enviar Mensagem</div>
      <textarea
        className="node-textarea"
        rows="3"
        placeholder="Texto da mensagem"
        value={message}
        onChange={handleChange}
      />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default MessageNode;
