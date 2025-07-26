import React, { useCallback, useRef, useEffect, useState } from 'react';
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
  useReactFlow();

  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null, handleId: null });

  const openMenu = useCallback((e, nodeId, handleId) => {
    e.preventDefault();
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    setMenu({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      nodeId,
      handleId,
    });
  }, []);

  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, visible: false })), []);

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
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: (d) => handleNodeChange(n.id, d),
          onAdd: (e, handleId) => openMenu(e, n.id, handleId),
        },
      })),
    );
  }, [setNodes, handleNodeChange, openMenu]);

  const addNode = useCallback(
    (type, position = { x: 250, y: 25 }) => {
      const newNode = {
        id: getId(),
        type,
        position,
        data: {},
      };
      newNode.data.onChange = (d) => handleNodeChange(newNode.id, d);
      newNode.data.onAdd = (e, handleId) => openMenu(e, newNode.id, handleId);
      if (type === 'message') newNode.data.message = '';
      if (type === 'question') newNode.data = { ...newNode.data, question: '', options: [] };
      if (type === 'start') newNode.data.keyword = '';
      setNodes((nds) => nds.concat(newNode));
      return newNode.id;
    },
    [setNodes, handleNodeChange, openMenu],
  );

  const addConnectedNode = useCallback(
    (type) => {
      if (!menu.nodeId) return;
      const srcNode = nodes.find((n) => n.id === menu.nodeId);
      if (!srcNode) return;
      const position = { x: srcNode.position.x, y: srcNode.position.y + 80 };
      const newId = addNode(type, position);
      if (!newId) return;
      const edgeParams = { source: menu.nodeId, target: newId };
      if (menu.handleId) edgeParams.sourceHandle = menu.handleId;
      setEdges((eds) => addEdge(edgeParams, eds));
      closeMenu();
    },
    [menu, nodes, addNode, setEdges, closeMenu],
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


  return (
    <ReactFlowProvider>
      <div className="flow-container">
        <div
          className="flow-area"
          ref={reactFlowWrapper}
          onClick={closeMenu}
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
          {menu.visible && (
            <div
              className="context-menu"
              style={{ left: menu.x, top: menu.y }}
            >
              <button type="button" onClick={() => addConnectedNode('message')}>Mensagem</button>
              <button type="button" onClick={() => addConnectedNode('question')}>Pergunta</button>
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default Canvas;
