const { useState, useCallback, useEffect } = React;
const { createRoot } = ReactDOM;
const { ReactFlowProvider, ReactFlow, addEdge, applyNodeChanges, applyEdgeChanges, MiniMap, Controls, Background, Handle, Position } = window.ReactFlow;

function StartNode({ id, data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('strong', null, 'Início'),
      React.createElement('input', {
        style: { width: '100%' },
        placeholder: 'Palavra-chave',
        value: data.label || '',
        onChange: e => data.onChange(id, e.target.value)
      }),
      React.createElement(Handle, { type: 'source', position: Position.Right })
    )
  );
}

function MessageNode({ id, data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('textarea', {
        rows: 3,
        style: { width: '100%' },
        value: data.text || '',
        onChange: e => data.onChange(id, e.target.value)
      }),
      React.createElement(Handle, { type: 'target', position: Position.Left }),
      React.createElement(Handle, { type: 'source', position: Position.Right })
    )
  );
}

function QuestionNode({ id, data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('textarea', {
        rows: 3,
        style: { width: '100%' },
        value: data.text || '',
        onChange: e => data.onChange(id, e.target.value)
      }),
      (data.options || []).map((opt, idx) => (
        React.createElement('div', { key: idx, style: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' } },
          React.createElement('input', {
            value: opt.text || '',
            placeholder: 'Opção',
            onChange: e => data.onOptionChange(id, idx, e.target.value)
          }),
          React.createElement(Handle, { type: 'source', position: Position.Right, id: String(idx) })
        )
      )),
      React.createElement('button', {
        type: 'button',
        onClick: () => data.onOptionAdd(id),
        style: { marginTop: '4px' }
      }, '+ opção'),
      React.createElement(Handle, { type: 'target', position: Position.Left })
    )
  );
}

const nodeTypes = { start: StartNode, message: MessageNode, question: QuestionNode };

function FlowBuilder({ flowId }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const onNodesChange = useCallback(changes => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback(changes => setEdges(eds => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback(params => setEdges(eds => addEdge(params, eds)), []);

  const updateNodeData = useCallback((id, updater) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n));
  }, []);

  const changeLabel = (id, value) => updateNodeData(id, () => ({ label: value }));
  const changeText = (id, value) => updateNodeData(id, () => ({ text: value }));
  const addOption = (id) => updateNodeData(id, data => ({ options: [...(data.options || []), { text: '' }] }));
  const changeOption = (id, idx, value) => updateNodeData(id, data => ({ options: data.options.map((o,i)=> i===idx?{...o,text:value}:o) }));

  const addStart = () => setNodes(ns => {
    if (ns.some(n => n.type === 'start')) return ns;
    return [...ns, { id: `s1`, type: 'start', position: { x: 50, y: 40 }, data: { label: '', onChange: changeLabel } }];
  });

  const addMessage = () => setNodes(ns => [
    ...ns,
    { id: `n${ns.length+1}`, type: 'message', position: { x: 250, y: ns.length*80 }, data: { text: 'Mensagem', onChange: changeText } }
  ]);

  const addQuestion = () => setNodes(ns => [
    ...ns,
    { id: `n${ns.length+1}`, type: 'question', position: { x: 250, y: ns.length*80 }, data: { text: 'Pergunta', options: [{ text: 'Opção 1' }], onChange: changeText, onOptionAdd: addOption, onOptionChange: changeOption } }
  ]);

  useEffect(() => {
    if (!flowId) { addStart(); return; }
    fetch(`/api/flows/${flowId}`).then(r => r.json()).then(f => {
      const loadedNodes = [];
      const loadedEdges = [];
      (f.FlowNodes || []).forEach((n, idx) => {
        const nodeId = String(idx + 1);
        let data = { text: n.message_text || '', label: n.message_text || '' };
        if (n.node_type === 'question') {
          data = {
            text: n.message_text || '',
            options: (n.NodeOptions || []).map(o => ({ text: o.option_text })),
            onChange: changeText,
            onOptionAdd: addOption,
            onOptionChange: changeOption
          };
        } else if (n.node_type === 'start') {
          data = { label: n.message_text || '', onChange: changeLabel };
        } else {
          data = { text: n.message_text || '', onChange: changeText };
        }
        loadedNodes.push({ id: nodeId, type: n.node_type, position: { x: 250, y: idx*100 }, data });
      });
      (f.FlowNodes || []).forEach((n, idx) => {
        const sourceId = String(idx + 1);
        (n.NodeOptions || []).forEach((opt, oidx) => {
          if (opt.next_node_id) {
            const targetId = String(opt.next_node_id);
            loadedEdges.push({ id: `e${sourceId}-${targetId}-${oidx}`, source: sourceId, target: targetId, sourceHandle: n.node_type === 'question' ? String(oidx) : null, label: opt.option_text });
          }
        });
      });
      if (!loadedNodes.some(n => n.type === 'start')) addStart();
      setNodes(ns => loadedNodes.map(n => {
        if (n.type === 'start') n.data.onChange = changeLabel;
        if (n.type === 'message') n.data.onChange = changeText;
        if (n.type === 'question') {
          n.data.onChange = changeText;
          n.data.onOptionAdd = addOption;
          n.data.onOptionChange = changeOption;
        }
        return n;
      }));
      setEdges(loadedEdges);
      document.getElementById('flow-name').value = f.name || '';
      document.getElementById('flow-trigger').value = f.trigger_keyword || '';
    });
  }, [flowId]);

  const collectData = () => {
    const orderMap = {};
    nodes.forEach((n, idx) => { orderMap[n.id] = idx + 1; });
    const flowNodes = nodes.map((n, idx) => {
      const outgoing = edges.filter(e => e.source === n.id);
      const node = {
        node_type: n.type,
        message_text: n.type === 'start' ? n.data.label : n.data.text,
        is_start_node: n.type === 'start'
      };
      node.options = [];
      if (n.type === 'question') {
        (n.data.options || []).forEach((opt, oidx) => {
          const edge = outgoing.find(e => e.sourceHandle === String(oidx));
          node.options.push({ option_text: opt.text, next_node_id: edge ? orderMap[edge.target] : null });
        });
      } else {
        const edge = outgoing[0];
        if (edge) node.options.push({ option_text: '', next_node_id: orderMap[edge.target] });
      }
      return node;
    });
    return {
      name: document.getElementById('flow-name').value.trim(),
      trigger_keyword: document.getElementById('flow-trigger').value.trim(),
      nodes: flowNodes
    };
  };

  const save = () => {
    const data = collectData();
    if (!data.name || !data.trigger_keyword) { alert('Preencha nome e gatilho'); return; }
    const url = flowId ? `/api/flows/${flowId}` : '/api/flows';
    const method = flowId ? 'PUT' : 'POST';
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(resp => { if (resp.ok) window.location.href = 'flows.html'; else alert('Falha ao salvar fluxo'); });
  };

  useEffect(() => {
    document.getElementById('btn-save-flow').addEventListener('click', save);
    document.getElementById('add-message').addEventListener('click', addMessage);
    document.getElementById('add-question').addEventListener('click', addQuestion);
  }, []);

  return (
    React.createElement(ReactFlowProvider, null,
      React.createElement(ReactFlow, {
        nodes, edges, nodeTypes,
        onNodesChange, onEdgesChange, onConnect,
        fitView: true,
        style: { width: '100%', height: '80vh' }
      },
        React.createElement(MiniMap, null),
        React.createElement(Controls, null),
        React.createElement(Background, null)
      )
    )
  );
}

const params = new URLSearchParams(window.location.search);
const flowId = params.get('id');

createRoot(document.getElementById('root')).render(React.createElement(FlowBuilder, { flowId }));

