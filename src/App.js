import React, { useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

function App() {
  const [inputText, setInputText] = useState('a\nb\na -> b');
  // Initialize nodes and edges state using React Flow hooks
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Function to parse the input text
  const parseInput = () => {
    const lines = inputText.split('\n');
    const tempNodes = {};
    const tempEdges = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return;

      // Check for relationship pattern: Application1 -> Application2
      const match = trimmedLine.match(/^(.+?)\s*->\s*(.+)$/);
      if (match) {
        const sourceApp = match[1].trim();
        const targetApp = match[2].trim();

        // Add nodes if they don't exist
        if (!tempNodes[sourceApp]) {
          tempNodes[sourceApp] = {
            id: sourceApp,
            data: { label: sourceApp },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }
        if (!tempNodes[targetApp]) {
          tempNodes[targetApp] = {
            id: targetApp,
            data: { label: targetApp },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }

        // Add edge with arrow
        tempEdges.push({
          id: `e${sourceApp}-${targetApp}`,
          source: sourceApp,
          target: targetApp,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      } else {
        // It's a standalone application name
        const appName = trimmedLine;
        if (!tempNodes[appName]) {
          tempNodes[appName] = {
            id: appName,
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

  return (
    <div className="App">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter relationships in the format: Application1 -> Application2"
        style={{ width: '100%', height: '100px' }}
      />
      <button onClick={parseInput}>Parse</button>
      <div style={{ width: '100%', height: '80vh' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;