import React from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

function Canvas() {
  const nodes = [];
  const edges = [];

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '80vh' }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

export default Canvas;
