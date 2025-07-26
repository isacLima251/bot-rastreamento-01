import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode, MessageNode, QuestionNode } from './nodes';

function Canvas() {
  const nodeTypes = {
    start: StartNode,
    message: MessageNode,
    question: QuestionNode,
  };

  const initialNodes = [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { keyword: '' },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const id = useRef(1);
  const getId = () => `node_${id.current++}`;

  const addNode = useCallback((type) => {
    const newNode = {
      id: getId(),
      type,
      position: { x: 250, y: 25 },
      data: {},
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodesDelete = useCallback(
    (deleted) => {
      setNodes((nds) => nds.filter((n) => !deleted.find((d) => d.id === n.id)));
    },
    [setNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id)));
    },
    [setEdges],
  );

  return (
    <ReactFlowProvider>
      <div className="flow-container">
        <div className="toolbar">
          <button type="button" onClick={() => addNode('message')}>
            + Adicionar Mensagem
          </button>
          <button type="button" onClick={() => addNode('question')}>
            + Adicionar Pergunta
          </button>
        </div>
        <div className="flow-area">
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onConnect={onConnect}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default Canvas;
