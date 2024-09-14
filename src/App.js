import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useEdgesState,
  MarkerType,
  addEdge,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// Custom node component without x and y coordinates display
function CustomNode({ data }) {
  return (
    <div
      style={{
        padding: 8,
        border: '2px solid #777',
        borderRadius: 6,
        backgroundColor: '#fff',
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
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  // Refs to prevent infinite loops
  const updatingInputTextRef = useRef(false);
  const updatingNodesRef = useRef(false);
  const updatingEdgesRef = useRef(false);

  // Initialize nodes and edges state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Define the custom node types
  const nodeTypes = { custom: CustomNode };

  // Function to parse the input text
  const parseInput = () => {
    if (updatingInputTextRef.current) {
      updatingInputTextRef.current = false;
      return;
    }
    const lines = inputText.split('\n');
    const tempNodes = {};
    const tempEdges = [];
    let lineIndex = 0;

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        lineIndex++;
        return;
      }

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
          },
          data: {
            line: trimmedLine,
          },
        });
      } else {
        // Check if the line matches the coordinate pattern
        match = trimmedLine.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(.+)$/);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          const label = match[3].trim();
          if (!tempNodes[label]) {
            tempNodes[label] = {
              id: label,
              type: 'custom',
              data: { label, lineIndex },
              position: { x, y },
            };
          }
        } else {
          // It's a standalone application name
          const appName = trimmedLine;
          if (!tempNodes[appName]) {
            tempNodes[appName] = {
              id: appName,
              type: 'custom', // Use the custom node type
              data: { label: appName, lineIndex },
              position: { x: Math.random() * 800, y: Math.random() * 600 },
            };
          }
        }
      }
      lineIndex++;
    });

    // Update nodes and edges state
    updatingNodesRef.current = true;
    updatingEdgesRef.current = true;
    setNodes(Object.values(tempNodes));
    setEdges(tempEdges);
    updatingNodesRef.current = false;
    updatingEdgesRef.current = false;
  };

  // Handle node changes
  const handleNodesChange = (changes) => {
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);

      if (updatingNodesRef.current) {
        return updatedNodes;
      }

      // Update inputText when nodes are moved
      const movedNodes = changes.filter(
        (change) => change.type === 'position' && change.dragging === false
      );

      if (movedNodes.length > 0) {
        updatingInputTextRef.current = true;

        setInputText((prevText) => {
          const lines = prevText.split('\n');
          const linesMap = {};
          lines.forEach((line, index) => {
            linesMap[index] = line;
          });

          movedNodes.forEach((nodeChange) => {
            const node = updatedNodes.find((n) => n.id === nodeChange.id);
            if (node && node.data.lineIndex !== undefined) {
              // Update the line corresponding to this node
              const lineIndex = node.data.lineIndex;
              const { x, y } = node.position;
              const newLine = `${Math.round(x)},${Math.round(y)},${node.data.label}`;
              linesMap[lineIndex] = newLine;
            }
          });

          // Reconstruct the input text
          return Object.values(linesMap).join('\n');
        });
      }

      return updatedNodes;
    });
  };

  // Handle edge changes
  const handleEdgesChange = (changes) => {
    setEdges((eds) => {
      const updatedEdges = applyEdgeChanges(changes, eds);

      if (updatingEdgesRef.current) {
        return updatedEdges;
      }

      // Check for removed edges
      const removedEdges = changes.filter((change) => change.type === 'remove');

      if (removedEdges.length > 0) {
        updatingInputTextRef.current = true;

        setInputText((prevText) => {
          const lines = prevText.split('\n');
          const linesSet = new Set(lines);

          removedEdges.forEach((edgeChange) => {
            const edge = eds.find((e) => e.id === edgeChange.id);
            if (edge && edge.data && edge.data.line) {
              linesSet.delete(edge.data.line);
            }
          });

          return Array.from(linesSet).join('\n');
        });
      }

      return updatedEdges;
    });
  };

  // Handle edge creation by dragging from handles
  const onConnect = (params) => {
    const newEdge = {
      id: `e${params.source}-${params.target}-${edges.length}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };

    // Now, update the inputText
    updatingInputTextRef.current = true;

    setInputText((prevText) => {
      const lines = prevText.split('\n');

      const sourceApp = params.source;
      const targetApp = params.target;
      const sourceHandle = params.sourceHandle;
      const targetHandle = params.targetHandle;

      let newLine;
      if (
        (sourceHandle === 'right' && targetHandle === 'left') ||
        (sourceHandle === 'left' && targetHandle === 'right')
      ) {
        newLine = `${sourceApp} -> ${targetApp}`;
      } else if (
        (sourceHandle === 'bottom' && targetHandle === 'top') ||
        (sourceHandle === 'top' && targetHandle === 'bottom')
      ) {
        newLine = `${sourceApp} \\> ${targetApp}`;
      } else {
        // Default to right-left connection
        newLine = `${sourceApp} -> ${targetApp}`;
      }

      // Add the new line to the edge's data for future reference
      newEdge.data = {
        line: newLine,
      };

      // Check if the line already exists to avoid duplicates
      if (!lines.includes(newLine)) {
        setEdges((eds) => [...eds, newEdge]);
        return [...lines, newLine].join('\n');
      } else {
        setEdges((eds) => [...eds, newEdge]);
        return prevText;
      }
    });
  };

  // Fetch input.txt when the component mounts
  useEffect(() => {
    fetch('input.txt')
      .then((response) => response.text())
      .then((text) => {
        setInputText(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching input.txt:', error);
        setLoading(false);
      });
  }, []);

  // Parse input when it changes
  useEffect(() => {
    if (!loading && inputText) {
      parseInput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, loading]);

  return (
    <div className="App">
      <textarea
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
        }}
        placeholder="Enter relationships in the format: x,y,label or App1 -> App2 "
        style={{ width: '18%' }}
      />
      <div style={{ width: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
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
