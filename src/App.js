import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './App.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [nodes, setNodes] = useState({});
  const [edges, setEdges] = useState([]);

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
            label: sourceApp,
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }
        if (!tempNodes[targetApp]) {
          tempNodes[targetApp] = {
            id: targetApp,
            label: targetApp,
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }

        // Add edge
        tempEdges.push({
          source: sourceApp,
          target: targetApp,
        });
      } else {
        // It's a standalone application name
        const appName = trimmedLine;
        if (!tempNodes[appName]) {
          tempNodes[appName] = {
            id: appName,
            label: appName,
            position: { x: Math.random() * 800, y: Math.random() * 600 },
          };
        }
      }
    });

    setNodes(tempNodes);
    setEdges(tempEdges);
  };

  // Function to update node positions after dragging
  const handleDrag = (e, data, nodeId) => {
    const updatedNodes = { ...nodes };
    updatedNodes[nodeId].position = { x: data.x, y: data.y };
    setNodes(updatedNodes);
  };

  return (
    <div className="App">
      <div className="left-panel">
        <h2>Applications and Relationships</h2>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter applications and relationships here..."
        ></textarea>
        <button onClick={parseInput}>Generate Diagram</button>
      </div>
      <div className="right-panel">
        <svg width="100%" height="100%">
          {/* Define arrowhead marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="8"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="black" />
            </marker>
          </defs>

          {/* Render edges */}
          {edges.map((edge, index) => {
            const sourceNode = nodes[edge.source];
            const targetNode = nodes[edge.target];
            if (!sourceNode || !targetNode) return null;
            return (
              <line
                key={index}
                x1={sourceNode.position.x + 75}
                y1={sourceNode.position.y + 25}
                x2={targetNode.position.x + 75}
                y2={targetNode.position.y + 25}
                stroke="black"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>

        {/* Render nodes using react-draggable */}
        {Object.values(nodes).map((node) => (
          <Draggable
            key={node.id}
            position={node.position}
            onDrag={(e, data) => handleDrag(e, data, node.id)}
          >
            <div
              className="node"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '150px',
                height: '50px',
              }}
            >
              <div className="node-box">
                <span className="node-label">{node.label}</span>
              </div>
            </div>
          </Draggable>
        ))}
      </div>
    </div>
  );
}

export default App;