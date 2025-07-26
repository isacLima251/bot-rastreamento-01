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

  useEffect(() => {
    if (!flowId) return;
    authFetch(`/api/flows/${flowId}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || '');
        setTrigger(data.trigger_keyword || '');
        if (Array.isArray(data.nodes)) setNodes(data.nodes);
        if (Array.isArray(data.edges)) setEdges(data.edges);
      })
      .catch(() => {});
  }, [flowId, setNodes, setEdges]);

  const saveFlow = () => {
    const payload = {
      name,
      trigger_keyword: trigger,
      nodes,
      edges,
    };
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
