import React, { useEffect, useState } from 'react';
import Canvas from './Canvas';
import { useNodesState, useEdgesState } from 'reactflow';

function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, options);
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const flowId = params.get('id');

  const initialNodes = [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { keyword: '' },
    },
  ];

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // transforma dados da API para o formato utilizado pelo React Flow
  function mapFromApi(data) {
    const loadedNodes = [];
    const loadedEdges = [];
    (data.FlowNodes || []).forEach((n, idx) => {
      const node = {
        id: String(n.id),
        type: n.node_type,
        position: { x: 250, y: idx * 80 },
        data: {},
      };
      if (node.type === 'message') node.data.message = n.message_text || '';
      if (node.type === 'question') {
        node.data.question = n.message_text || '';
        node.data.options = [];
      }
      loadedNodes.push(node);
      if (Array.isArray(n.NodeOptions)) {
        n.NodeOptions.forEach((opt, oidx) => {
          if (node.type === 'question') node.data.options[oidx] = opt.option_text;
          if (opt.next_node_id) {
            loadedEdges.push({
              id: `e${n.id}-${opt.next_node_id}-${oidx}`,
              source: String(n.id),
              target: String(opt.next_node_id),
              sourceHandle: node.type === 'question' ? `opt-${oidx}` : undefined,
              label: opt.option_text,
            });
          }
        });
      }
    });
    if (!loadedNodes.some((n) => n.type === 'start')) {
      loadedNodes.unshift({ id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { keyword: '' } });
    }
    return { nodes: loadedNodes, edges: loadedEdges };
  }

  useEffect(() => {
    if (!flowId) return;
    authFetch(`/api/flows/${flowId}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || '');
        setTrigger(data.trigger_keyword || '');
        const mapped = mapFromApi(data);
        setNodes(mapped.nodes);
        setEdges(mapped.edges);
      })
      .catch(() => {});
  }, [flowId, setNodes, setEdges]);

  const saveFlow = () => {
    const nodeMap = {};
    nodes.forEach((n) => { nodeMap[n.id] = n; });
    const apiNodes = nodes.map((n) => {
      const item = {
        node_type: n.type,
        message_text: '',
        is_start_node: n.type === 'start',
        options: [],
      };
      if (n.type === 'message') item.message_text = n.data.message || '';
      if (n.type === 'question') item.message_text = n.data.question || '';
      return item;
    });

    const indexMap = {};
    nodes.forEach((n, idx) => { indexMap[n.id] = idx; });
    edges.forEach((e) => {
      const srcIdx = indexMap[e.source];
      if (srcIdx == null) return;
      const srcNode = nodeMap[e.source];
      const opt = { option_text: '', next_node_id: parseInt(e.target, 10) };
      if (srcNode.type === 'question') {
        const optIdx = parseInt((e.sourceHandle || '').replace('opt-', ''), 10);
        if (Array.isArray(srcNode.data.options) && !Number.isNaN(optIdx)) {
          opt.option_text = srcNode.data.options[optIdx] || '';
        }
      }
      apiNodes[srcIdx].options.push(opt);
    });

    const payload = { name, trigger_keyword: trigger, nodes: apiNodes };

    authFetch(flowId ? `/api/flows/${flowId}` : '/api/flows', {
      method: flowId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((resp) => {
        if (resp.ok) {
          alert('Fluxo salvo com sucesso');
        } else {
          alert('Erro ao salvar fluxo');
        }
      })
      .catch(() => alert('Erro ao salvar fluxo'));
  };

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Nome do Fluxo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Palavra-chave"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          style={{ marginLeft: '8px' }}
        />
        <button type="button" onClick={saveFlow} style={{ marginLeft: '8px' }}>
          Salvar Fluxo
        </button>
      </div>
      <Canvas
        nodes={nodes}
        setNodes={setNodes}
        onNodesChange={onNodesChange}
        edges={edges}
        setEdges={setEdges}
        onEdgesChange={onEdgesChange}
      />
    </div>
  );
}

export default App;
