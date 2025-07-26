import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import '../App.css';

function QuestionNode({ data }) {
  const [question, setQuestion] = useState(data.question || '');
  const [options, setOptions] = useState(data.options || []);

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
    triggerChange({ question: e.target.value, options });
  };

  const triggerChange = (newData) => {
    if (data.onChange) {
      data.onChange({ ...data, ...newData });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
    triggerChange({ question, options: newOpts });
  };

  const addOption = () => {
    const newOpts = [...options, ''];
    setOptions(newOpts);
    triggerChange({ question, options: newOpts });
  };

  return (
    <div className="node-card">
      <div className="node-header">Pergunta com Opções</div>
      <textarea
        className="node-textarea"
        rows="3"
        placeholder="Digite a pergunta"
        value={question}
        onChange={handleQuestionChange}
      />
      <div className="options-section">
        <h6>Opções de Resposta</h6>
        {options.map((opt, idx) => (
          <div key={idx} className="option-item">
            <input
              type="text"
              className="node-input"
              placeholder={`Opção ${idx + 1}`}
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
            />
            <Handle type="source" position={Position.Right} id={`opt-${idx}`} />
            {data.onAdd && (
              <button
                type="button"
                className="add-node-btn"
                onClick={(e) => data.onAdd(e, `opt-${idx}`)}
              >
                +
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addOption}>
          + Adicionar Opção
        </button>
      </div>
      <Handle type="target" position={Position.Top} />
    </div>
  );
}

export default QuestionNode;
