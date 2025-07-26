const { useState, useCallback, useEffect, Fragment } = React;
const { createRoot } = ReactDOM;
const { ReactFlowProvider, ReactFlow, addEdge, applyNodeChanges, applyEdgeChanges, Background, Controls, MiniMap, Handle, Position } = window.ReactFlow;

function StartNode({ data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('strong', null, 'Início'),
      React.createElement('div', null, data.label),
      React.createElement(Handle, { type: 'source', position: Position.Right })
    )
  );
}

function MessageNode({ data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('div', null, data.label),
      React.createElement(Handle, { type: 'target', position: Position.Left }),
      React.createElement(Handle, { type: 'source', position: Position.Right })
    )
  );
}

function QuestionNode({ id, data }) {
  return (
    React.createElement('div', { className: 'rf-node' },
      React.createElement('div', null, data.label),
      data.options && data.options.map((opt, idx) => (
        React.createElement('div', { key: idx },
          React.createElement('small', null, opt.text || 'Opção'),
          React.createElement(Handle, { type: 'source', position: Position.Right, id: String(idx) })
        )
      )),
      React.createElement(Handle, { type: 'target', position: Position.Left })
    )
  );
}

const nodeTypes = { start: StartNode, message: MessageNode, question: QuestionNode };

function FlowEditor({ flowId }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const onNodesChange = useCallback(changes => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback(changes => setEdges(eds => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback(params => setEdges(eds => addEdge(params, eds)), []);

  const addStart = () => setNodes(nds => {
    if (nds.some(n => n.type === 'start')) return nds;
    return [...nds, { id: `n${nds.length+1}`, type: 'start', position: { x: 50, y: 40 }, data: { label: '' } }];
  });
  const addMessage = () => setNodes(nds => [...nds, { id: `n${nds.length+1}`, type: 'message', position: { x: 250, y: nds.length*80 }, data: { label: 'Mensagem' } }]);
  const addQuestion = () => setNodes(nds => [...nds, { id: `n${nds.length+1}`, type: 'question', position: { x: 250, y: nds.length*80 }, data: { label: 'Pergunta', options: [{ text: 'Sim' }, { text: 'Não' }] } }]);

  useEffect(() => {
    if (!flowId) {
      addStart();
      return;
    }
    fetch(`/api/flows/${flowId}`).then(r => r.json()).then(f => {
      const loadedNodes = [];
      const loadedEdges = [];
      (f.FlowNodes || []).forEach((n, idx) => {
        loadedNodes.push({
          id: String(n.id),
          type: n.node_type === 'start' ? 'start' : n.node_type,
          position: { x: 250, y: idx * 80 },
          data: { label: n.message_text || '', options: n.NodeOptions }
        });
        if (Array.isArray(n.NodeOptions)) {
          n.NodeOptions.forEach((opt, oidx) => {
            if (opt.next_node_id) {
              loadedEdges.push({ id: `e${n.id}-${opt.next_node_id}-${oidx}`, source: String(n.id), sourceHandle: String(oidx), target: String(opt.next_node_id), label: opt.option_text });
            }
          });
        }
      });
      if (!loadedNodes.some(n => n.type === 'start')) {
        loadedNodes.unshift({ id: `nstart`, type: 'start', position: { x: 50, y: 40 }, data: { label: '' } });
      }
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      document.getElementById('flow-name').value = f.name || '';
      document.getElementById('flow-trigger').value = f.trigger_keyword || '';
    });
  }, [flowId]);

  const collectData = () => {
    return {
      name: document.getElementById('flow-name').value.trim(),
      trigger_keyword: document.getElementById('flow-trigger').value.trim(),
      nodes: nodes.map(n => ({
        node_type: n.type,
        message_text: n.data.label,
        is_start_node: n.type === 'start',
        options: edges.filter(e => e.source === n.id).map(e => ({ option_text: e.label || '', next_node_id: e.target }))
      }))
    };
  };

  const save = () => {
    const data = collectData();
    if (!data.name || !data.trigger_keyword) {
      alert('Preencha nome e gatilho');
      return;
    }
    const url = flowId ? `/api/flows/${flowId}` : '/api/flows';
    const method = flowId ? 'PUT' : 'POST';
    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(resp => { if (resp.ok) window.location.href = 'flows.html'; else alert('Falha ao salvar fluxo'); });
  };

  useEffect(() => {
    document.getElementById('btn-save-flow').addEventListener('click', save);
    document.getElementById('add-start').addEventListener('click', addStart);
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

createRoot(document.getElementById('root')).render(React.createElement(FlowEditor, { flowId }));

