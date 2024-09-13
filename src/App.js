import React, { useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  MarkerType,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// Custom node component with handles on all sides
function CustomNode({ data }) {
  return (
    <div
      style={{
        padding: 8,
        border: '2px solid #777',
        borderRadius: 6,
        backgroundColor: '#fff',
        position: 'relative',
      }}
    >
      {data.label}
      {/* Handles on all four sides */}
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Top} id="top" />
    </div>
  );
}

function App() {
  const [inputText, setInputText] = useState(
    'Requisition\nPurchase\nReceive\nPayment\nGL\nRequisition-> Receive\nPurchase \\> Receive\nReceive-> Payment\nPayment \\> GL'
  );

  // Initialize nodes and edges state using React Flow hooks
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Define the custom node types
  const nodeTypes = { custom: CustomNode };

  // Function to parse the input text
  const parseInput = () => {
    const lines = inputText.split('\n');
    const tempNodes = {};
    const tempEdges = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return;

      let match;
      let sourceHandle = 'right';
      let targetHandle = 'left';

      // Check for side connection pattern: Application1 -> Application2
      match = trimmedLine.match(/^(.+?)\s*->\s*(.+)$/);
      if (match) {
        sourceHandle = 'right';
        targetHandle = 'left';
      } else {
        // Check for top-bottom connection pattern: Application1 \> Application2
        match = trimmedLine.match(/^(.+?)\s*\\>\s*(.+)$/);
        if (match) {
          sourceHandle = 'bottom';
          targetHandle = 'top';
        }
      }

      if (match) {
        const sourceApp = match[1].trim();
        const targetApp = match[2].trim();

        // Add nodes if they don't exist
        if (!tempNodes[sourceApp]) {
          tempNodes[sourceApp] = {
            id: sourceApp,
            type: 'custom', // Use the custom node type
            data: { label: sourceApp },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }
        if (!tempNodes[targetApp]) {
          tempNodes[targetApp] = {
            id: targetApp,
            type: 'custom', // Use the custom node type
            data: { label: targetApp },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }

        // Add edge with appropriate handles
        tempEdges.push({
          id: `e${sourceApp}-${targetApp}`,
          source: sourceApp,
          target: targetApp,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            fill: 'black',
            strokeWidth: 3,
            width: 20,
            height: 20,
          },
        });
      } else {
        // It's a standalone application name
        const appName = trimmedLine;
        if (!tempNodes[appName]) {
          tempNodes[appName] = {
            id: appName,
            type: 'custom', // Use the custom node type
            data: { label: appName },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }
      }
    });

    // Update nodes and edges state
    setNodes(Object.values(tempNodes));
    setEdges(tempEdges);
  };

  // Handle edge creation by dragging from handles
  const onConnect = (params) =>
    setEdges((eds) =>
      addEdge(
        { ...params, markerEnd: { type: MarkerType.ArrowClosed } },
        eds
      )
    );

  return (
    <div className="App">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter relationships in the format: App1 -> App2 "
        style={{ width: '18%' }}
      />
      <button onClick={parseInput} style={{ writingMode: 'vertical-rl' }}>Click here to Generate Flow Diagram</button>
      <div style={{ width: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;