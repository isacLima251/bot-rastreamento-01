import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode, MessageNode, QuestionNode } from './nodes';

function Canvas({ nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange }) {
  const nodeTypes = {
    start: StartNode,
    message: MessageNode,
    question: QuestionNode,
  };

  const id = useRef(nodes.length + 1);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const getId = () => `node_${id.current++}`;

  const handleNodeChange = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)),
      );
    },
    [setNodes],
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, onChange: (d) => handleNodeChange(n.id, d) } })),
    );
  }, [setNodes, handleNodeChange]);

  const addNode = useCallback(
    (type, position = { x: 250, y: 25 }) => {
      const newNode = {
        id: getId(),
        type,
        position,
        data: {},
      };
      newNode.data.onChange = (d) => handleNodeChange(newNode.id, d);
      if (type === 'message') newNode.data.message = '';
      if (type === 'question') newNode.data = { ...newNode.data, question: '', options: [] };
      if (type === 'start') newNode.data.keyword = '';
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, handleNodeChange],
  );

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

  const onDragStart = (event, type) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      addNode(type, position);
    },
    [project, addNode],
  );

  return (
    <ReactFlowProvider>
      <div className="flow-container">
        <div className="toolbar">
          <button
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, 'message')}
            onClick={() => addNode('message')}
          >
            + Adicionar Mensagem
          </button>
          <button
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, 'question')}
            onClick={() => addNode('question')}
          >
            + Adicionar Pergunta
          </button>
        </div>
        <div
          className="flow-area"
          ref={reactFlowWrapper}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
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
