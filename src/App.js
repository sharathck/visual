import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
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

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,collection,
  getDoc,
  where,
  setDoc,
  query,
  limit,
  getDocs,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);
let yGlobal = 260;

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

// Define the custom node types
const nodeTypes = { custom: CustomNode };

function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  // Refs to prevent infinite loops
  const updatingInputTextRef = useRef(false);
  const updatingNodesRef = useRef(false);
  const updatingEdgesRef = useRef(false);

  // Initialize nodes and edges state
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  // Authentication state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log('User is signed in:', currentUser.uid);
        // Fetch inputText from Firebase for the authenticated user
        await fetchInputTextFromFirebase(currentUser.uid);
      } else {
        console.log('No user is signed in');
        setInputText('');
        setNodes([]);
        setEdges([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Function to fetch inputText from Firebase
  const fetchInputTextFromFirebase = async (uid) => {
    let temp = '';
    try {
      const q = query(collection(db, 'diagrams'), where('userId', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        temp = docSnap.data().inputText;
        temp = temp.replace(/\|/g, '\n');
        setInputText(temp);
        console.log('Fetched inputText:', docSnap.data().inputText);
      } else {
        console.log('No documents found in Firebase');
        setInputText('');
      }
    } catch (error) {
      console.error('Error fetching inputText:', error);
    }
  };

  // Function to save inputText to Firebase
  const saveInputTextToFirebase = async (uid, text) => {
    try {
      // Replace new line with pipe
      text = text.replace(/\n/g, '|');
  
      // Query to get the first available document
      const q = query(collection(db, 'diagrams'), where('userId', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      console.log('Save INput logged in user:', uid);
      if (!querySnapshot.empty) {
        // Update the first available document
        console.log('Query has data');
        const docRef = querySnapshot.docs[0].ref;
        await setDoc(docRef, { inputText: text, userId: uid }, { merge: true });
        console.log('Updated inputText in existing document');
      } else {
        // Create a new document if none exists
        console.log('Query is empty, need to create new Document');
        const newDocRef = doc(collection(db, 'diagrams'));
        await setDoc(newDocRef, { inputText: text, userId: uid });
        console.log('Created new document with inputText');
      }
    } catch (error) {
      console.error('Error saving inputText:', error);
    }
  };

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

      // if the line does not contain -> or -}  it's a standalone application name
      if (!trimmedLine.includes('->') && !trimmedLine.includes('-}') && !trimmedLine.includes(',')) {
     // prefix 280, 260 to the application name
        yGlobal = yGlobal + 50;
        const appName = trimmedLine;
        if (!tempNodes[appName]) {
          tempNodes[appName] = {
            id: appName,
            type: 'custom', // Use the custom node type
            data: { label: appName, lineIndex },
            position: { x: 280, y: yGlobal },
          };
        }
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
        // Check for top-bottom connection pattern: Application1 -} Application2
        match = trimmedLine.match(/^(.+?)\s*\-}\s*(.+)$/);
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

  useEffect(() => {
    if (user && inputText !== undefined) {
      saveInputTextToFirebase(user.uid, inputText);
    }
  }, [inputText]);

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
        newLine = `${sourceApp} -} ${targetApp}`;
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
              // **FIX: Update edges state directly instead of using setEdges within the callback**
              setEdges((eds) => addEdge(newEdge, eds)); 
              return [...lines, newLine].join('\n');
            } else {
              // **FIX: Update edges state directly instead of using setEdges within the callback**
              setEdges((eds) => addEdge(newEdge, eds)); 
              return prevText;
            }

    });
  };

  // Parse input when it changes
  useEffect(() => {
    if (!loading && inputText !== undefined) {
      parseInput();
      setLoading(true);
    }
  }, [inputText]);



  // Authentication functions

  // Sign In with Email and Password
  const handleSignInWithEmail = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;
      if (!loggedInUser.emailVerified) {
        await auth.signOut();
        alert('Please verify your email before signing in.');
      }
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        alert('Wrong password, please try again.');
      } else {
        alert('Error signing in: ' + error.message);
        console.error('Error signing in:', error);
      }
    }
  };

  // Sign Up with Email and Password
  const handleSignUpWithEmail = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(auth.currentUser);
      alert('Verification email sent! Please check your inbox. After verification, please sign in.');
      await auth.signOut();
    } catch (error) {
      alert('Error signing up: ' + error.message);
      console.error('Error signing up:', error);
    }
  };

  // Password Reset
  const handlePasswordReset = async () => {
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent, please check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  };

  // Sign In with Google
  const handleSignInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error('Error signing in with Google:', error);
      alert('Error signing in with Google: ' + error.message);
    });
  };

  // Sign Out
  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error);
      alert('Error signing out: ' + error.message);
    });
  };

  return (
    <div>
      {user ? (
        // Render the diagram editor
        //    <button className="signinbutton" onClick={() => saveInputTextToFirebase(user.uid, inputText)}>Save</button>
        <div className="App">
          <div className="left-panel">
          <button className="signinbutton" onClick={parseInput}>Generate</button>
            <button className="signoutbutton" onClick={handleSignOut}>SignOut</button>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
              }}
            />
          </div>
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
      ) : (
        // Render the authentication forms
        <div style={{ fontSize: '22px', width: '100%', margin: '0 auto' }}>
          <br />
          <p>Sign In</p>
          <input
            className="textinput"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <br />
          <br />
          <input
            type="password"
            className="textinput"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />
          <br />
          <button className="signonpagebutton" onClick={handleSignInWithEmail}>
            Sign In
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button className="signuppagebutton" onClick={handleSignUpWithEmail}>
            Sign Up
          </button>
          <br />
          <br />
          <button onClick={handlePasswordReset}>Forgot Password?</button>
          <br />
          <br />
          <br />
          <p> OR </p>
          <br />
          <button className="signgooglepagebutton" onClick={handleSignInWithGoogle}>
            Sign In with Google
          </button>
          <br />
        </div>
      )}
    </div>
  );
}

export default App;