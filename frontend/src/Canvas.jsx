import React from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode, MessageNode, QuestionNode } from './nodes';

function Canvas() {
  const nodeTypes = {
    start: StartNode,
    message: MessageNode,
    question: QuestionNode,
  };

  const nodes = [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { keyword: '' },
    },
  ];
  const edges = [];

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '80vh' }}>
        <ReactFlow nodeTypes={nodeTypes} nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

export default Canvas;
