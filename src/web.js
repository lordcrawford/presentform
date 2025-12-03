import React, { useState, useEffect, useMemo } from 'react';
import './web.css';

function Music() {
  const [nodeRadius, setNodeRadius] = useState(6);
  const [hitboxRadius, setHitboxRadius] = useState(8);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'verses on verses';
    return () => {
      document.title = 'React App'; // Reset on unmount
    };
  }, []);

  // Adjust circle sizes based on screen size
  useEffect(() => {
    const updateSizes = () => {
      if (window.innerWidth <= 480) {
        setNodeRadius(4.5);
        setHitboxRadius(6.5);
      } else if (window.innerWidth <= 768) {
        setNodeRadius(5);
        setHitboxRadius(7);
      } else {
        setNodeRadius(6);
        setHitboxRadius(8);
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Initialize nodes and connections (using useMemo to keep them consistent on mount)
  const initialData = useMemo(() => {
    // Generate 29 nodes total with random positions
    const nodeCount = 15;
    const nodes = [];
    const minDistance = 50; // Minimum distance between nodes
    const svgHeight = 600; // Much larger height to allow scrolling and proper spacing
    const svgWidth = 100; // Keep width at 100 units
    
    // Helper function to generate random number between min and max
    const random = (min, max) => Math.random() * (max - min) + min;
    
    // Helper function to generate random color
    const randomColor = () => {
      const colors = [
        '#FF1493', '#00FFFF', '#FF00FF', '#FFFF00', '#00FF00',
        '#FF4500', '#FF69B4', '#00CED1', '#FFD700', '#32CD32',
        '#FF6347', '#9370DB', '#20B2AA', '#FFA500', '#FF1493',
        '#00FA9A', '#1E90FF', '#FF69B4', '#BA55D3', '#48D1CC'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    };
    
    // Helper function to calculate distance between two nodes
    const getDistance = (node1, node2) => {
      return Math.sqrt(
        Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
      );
    };
    
    // Generate nodes with strict minimum distance enforcement
    // Ensure at least 8 nodes are in the first 300vw (300 units)
    const topSectionHeight = 300;
    const minNodesInTopSection = 8;
    
    for (let i = 1; i <= nodeCount; i++) {
      let attempts = 0;
      let x, y;
      let found = false;
      
      // For first 5 nodes, constrain to top section (first 300vw)
      const mustBeInTopSection = i <= minNodesInTopSection;
      const maxY = mustBeInTopSection ? Math.min(topSectionHeight - 8, svgHeight - 8) : svgHeight - 8;
      
      // Try to find a valid position that respects minDistance
      do {
        // Distribute nodes across the full area (or top section for first 5)
        x = random(8, svgWidth - 8);
        y = random(8, maxY);
        attempts++;
        
        // Check if this position is far enough from all existing nodes
        // Must respect both minimum distance and minimum vertical distance
        const minVerticalDistance = 20;
        let valid = true;
        for (const existingNode of nodes) {
          const distance = getDistance({ x, y }, existingNode);
          const verticalDistance = Math.abs(y - existingNode.y);
          
          if (distance < minDistance || verticalDistance < minVerticalDistance) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          found = true;
        }
      } while (!found && attempts < 1000);
      
      // If we can't find a valid position, try a grid-based approach
      if (!found) {
        // Calculate grid spacing
        const cols = Math.ceil(Math.sqrt(nodeCount * (svgWidth / svgHeight)));
        const rows = Math.ceil(nodeCount / cols);
        const gridX = ((i - 1) % cols) * (svgWidth / cols) + (svgWidth / cols / 2);
        
        // For top section nodes, use a smaller grid area
        let gridY;
        if (mustBeInTopSection) {
          const topRows = Math.ceil(minNodesInTopSection / cols);
          const topRow = Math.floor((i - 1) / cols);
          gridY = 8 + (topRow * (topSectionHeight / topRows)) + ((topSectionHeight / topRows) / 2);
        } else {
          gridY = Math.floor((i - 1) / cols) * (svgHeight / rows) + (svgHeight / rows / 2);
        }
        
        // Add some randomness but keep within grid cell
        const cellWidth = svgWidth / cols;
        const cellHeight = mustBeInTopSection ? topSectionHeight / Math.ceil(minNodesInTopSection / cols) : svgHeight / rows;
        x = Math.max(8, Math.min(svgWidth - 8, gridX + random(-cellWidth * 0.3, cellWidth * 0.3)));
        y = Math.max(8, Math.min(maxY, gridY + random(-cellHeight * 0.3, cellHeight * 0.3)));
      }
      
      // Ensure node is not too far from other nodes (max 70 units from closest)
      const maxDistance = 55;
      if (nodes.length > 0) {
        let minDistToOther = Infinity;
        let nearestNode = null;
        
        for (const existingNode of nodes) {
          const distance = getDistance({ x, y }, existingNode);
          if (distance < minDistToOther) {
            minDistToOther = distance;
            nearestNode = existingNode;
          }
        }
        
        // If too far from nearest node, move closer
        if (minDistToOther > maxDistance && nearestNode) {
          const angle = Math.atan2(y - nearestNode.y, x - nearestNode.x);
          // Place at maxDistance from nearest node
          x = nearestNode.x + Math.cos(angle) * maxDistance;
          y = nearestNode.y + Math.sin(angle) * maxDistance;
          
          // Clamp to boundaries
          x = Math.max(8, Math.min(svgWidth - 8, x));
          y = Math.max(8, Math.min(maxY, y));
        }
      }
      
      nodes.push({
        id: i,
        x: x,
        y: y,
      });
    }

    // Generate connections - connect each node to approximately 4 nearest neighbors
    const connections = [];
    const connectionsPerNode = 10;
    const connectionSet = new Set(); // To avoid duplicate connections
    
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      
      // Calculate distances to all other nodes
      const distances = nodes
        .map((node, index) => ({
          node,
          index,
          distance: getDistance(currentNode, node)
        }))
        .filter(item => item.index !== i) // Exclude self
        .sort((a, b) => a.distance - b.distance); // Sort by distance
      
      // Connect to the 4 nearest nodes (or fewer if not enough nodes)
      const numConnections = Math.min(connectionsPerNode, distances.length);
      for (let j = 0; j < numConnections; j++) {
        const targetNode = distances[j].node;
        // Create connection key to avoid duplicates (smaller id first)
        const connectionKey = currentNode.id < targetNode.id 
          ? `${currentNode.id}-${targetNode.id}`
          : `${targetNode.id}-${currentNode.id}`;
        
        if (!connectionSet.has(connectionKey)) {
          connectionSet.add(connectionKey);
          connections.push({
            from: currentNode.id,
            to: targetNode.id,
            color: randomColor(),
          });
        }
      }
    }

    return { nodes, connections };
  }, []); // Empty dependency array - generate once

  // Initialize nodes with velocity
  useEffect(() => {
    if (initialData.nodes.length > 0) {
      const nodesWithVelocity = initialData.nodes.map(node => ({
        ...node,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
      setNodes(nodesWithVelocity);
      setConnections(initialData.connections);
    }
  }, [initialData]);

  // Fixed height for container
  const fixedHeight = 650;

  // Simple animation - just float around with collision detection
  useEffect(() => {
    if (nodes.length === 0) return;

    const minDistance = 15; // Minimum distance between nodes while moving
    const minVerticalDistance = 20; // Minimum vertical distance between nodes

    const interval = setInterval(() => {
      setNodes(prevNodes => {
        // First, calculate new positions for all nodes
        const newNodes = prevNodes.map(node => {
          let x = node.x + node.vx;
          let y = node.y + node.vy;
          let vx = node.vx;
          let vy = node.vy;

          // Bounce off edges - use fixed height
          if (x < 5 || x > 95) {
            x = node.x; // Keep current position
            vx *= -1;
          }
          const maxY = fixedHeight - 5;
          if (y < 5 || y > maxY) {
            y = node.y; // Keep current position
            vy *= -1;
          }

          return { ...node, x, y, vx, vy };
        });

        // Then, check for collisions and adjust positions
        return newNodes.map((node, i) => {
          let adjustedX = node.x;
          let adjustedY = node.y;
          let adjustedVx = node.vx;
          let adjustedVy = node.vy;

          // Check distance to all other nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            
            const otherNode = newNodes[j];
            const distance = Math.sqrt(
              Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
            );
            const verticalDistance = Math.abs(node.y - otherNode.y);

            // Check both minimum distance and minimum vertical distance
            if ((distance < minDistance || verticalDistance < minVerticalDistance) && distance > 0) {
              // Nodes are too close - push them apart
              // Prioritize vertical separation
              if (verticalDistance < minVerticalDistance) {
                // Push vertically to maintain minimum vertical distance
                if (node.y < otherNode.y) {
                  adjustedY = otherNode.y - minVerticalDistance;
                } else {
                  adjustedY = otherNode.y + minVerticalDistance;
                }
                adjustedVy = (adjustedY - node.y) * 0.1; // Adjust velocity
              } else {
                // Push apart normally
                const angle = Math.atan2(node.y - otherNode.y, node.x - otherNode.x);
                const targetDistance = minDistance;
                
                // Calculate where this node should be to maintain minDistance
                adjustedX = otherNode.x + Math.cos(angle) * targetDistance;
                adjustedY = otherNode.y + Math.sin(angle) * targetDistance;
                
                // Adjust velocity to move away from other node
                adjustedVx = Math.cos(angle) * 0.15;
                adjustedVy = Math.sin(angle) * 0.15;
              }
              
              // Clamp to boundaries
              adjustedX = Math.max(5, Math.min(95, adjustedX));
              adjustedY = Math.max(5, Math.min(fixedHeight - 5, adjustedY));
              
              break; // Only handle one collision at a time
            }
          }

          return {
            ...node,
            x: adjustedX,
            y: adjustedY,
            vx: adjustedVx,
            vy: adjustedVy,
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [nodes.length, fixedHeight]);

  return (
    <div className="music-container">
      <h1 className="music-title">verses on verses</h1>
      
      {/* Network SVG with nodes */}
      <svg 
        className="network-svg" 
        viewBox={`0 0 100 ${fixedHeight}`} 
        preserveAspectRatio="xMidYMin meet"
        style={{ height: '100%' }}
      >
        {/* Draw connections */}
        <g className="connections">
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            return (
              <line
                key={`line-${index}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                className="connection-line"
                style={{ stroke: connection.color }}
              />
            );
          })}
        </g>
        
        {/* Draw nodes (horizontal rectangles) */}
        <g className="nodes">
          {nodes.map(node => {
            const rectWidth = nodeRadius * 3; // Horizontal rectangle width
            const rectHeight = nodeRadius * 1.2; // Horizontal rectangle height
            const hitboxWidth = hitboxRadius * 3;
            const hitboxHeight = hitboxRadius * 1.2;
            
            // Random padding for each side (3 to 10 units)
            // Use node.id as seed for consistent randomness per node
            const random = (seed, min, max) => {
              const x = Math.sin(seed) * 10000;
              return (x - Math.floor(x)) * (max - min) + min;
            };
            let paddingTop = random(node.id * 1, 3, 5);
            const paddingRight = random(node.id * 2, 3, 5);
            const paddingBottom = random(node.id * 3, 3, 5);
            const paddingLeft = random(node.id * 4, 3, 5);
            
            // Ensure top border extends to y=0 if node is near the top
            const nodeTop = node.y - rectHeight / 2;
            const borderTop = nodeTop - paddingTop;
            if (borderTop > 0) {
              // Node is not at the very top, keep random padding
            } else {
              // Node is near or above top, extend border to y=0
              paddingTop = nodeTop; // This will make boxY = 0
            }
            
            const boxWidth = rectWidth + paddingLeft + paddingRight;
            const boxHeight = rectHeight + paddingTop + paddingBottom;
            const boxX = node.x - rectWidth / 2 - paddingLeft;
            const boxY = Math.max(0, node.y - rectHeight / 2 - paddingTop); // Clamp to 0
            
            // Second border padding (3 to 5 units)
            const paddingTop2 = random(node.id * 5, 3, 9);
            const paddingRight2 = random(node.id * 6, 3, 9);
            const paddingBottom2 = random(node.id * 7, 3, 9);
            const paddingLeft2 = random(node.id * 8, 3, 9);
            
            const boxWidth2 = boxWidth + paddingLeft2 + paddingRight2;
            const boxHeight2 = boxHeight + paddingTop2 + paddingBottom2;
            const boxX2 = boxX - paddingLeft2;
            const boxY2 = Math.max(0, boxY - paddingTop2); // Clamp to 0
            
            return (
              <g key={node.id} className="node-group">
                {/* Node rectangle */}
                <rect
                  x={node.x - rectWidth / 2}
                  y={node.y - rectHeight / 2}
                  width={rectWidth}
                  height={rectHeight}
                  className="network-node"
                  style={{ fill: '#ffffff' }}
                />
                {/* Second white border (outer border) */}
                <rect
                  x={boxX2}
                  y={boxY2}
                  width={boxWidth2}
                  height={boxHeight2}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.3"
                />
                {/* First white border (inner border) */}
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxWidth}
                  height={boxHeight}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.3"
                />
                {/* Invisible larger rectangle for better click area */}
                <rect
                  x={node.x - hitboxWidth / 2}
                  y={node.y - hitboxHeight / 2}
                  width={hitboxWidth}
                  height={hitboxHeight}
                  className="network-node-hitbox"
                  onClick={() => {
                    setSelectedNode(node);
                    setIsModalOpen(true);
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Modal box */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="modal-content">
              {selectedNode && (
                <div>
                  {selectedNode.id === 1 ? (
                    <>
                      <h2>avatar</h2>
                      <p>
                        <strong>n.</strong> google's ai overview: "An avatar is a figure that represents a person in a digital space, like a video game or chatroom, but it also has an older meaning from Hinduism, where it refers to the descent of a deity to earth in a physical form"
                      </p>
                      <p>
                        how can we redefine what avatar means in the physical world? Avatars are commonly associated with digital entities, but what if we could bring that avatar into the flesh or some blend of mixed reality? avatars could start to represent the goals we have for ourselves, the person we want to grow into, the person we were, the version of us that died, you name it.
                      </p>
                    </>
                  ) : selectedNode.id === 2 ? (
                    <>
                      <h2>sonder</h2>
                      <p>
                        <strong>n.</strong> The realization that each random passerby is living a life as vivid and complex as your own—populated with their own ambitions, friends, routines, worries and inherited craziness—an epic story that continues invisibly around you like an anthill sprawling deep underground, with elaborate passageways to thousands of other lives that you'll never know existed, in which you might appear only once, as an extra sipping coffee in the background, as a blur of traffic passing on the highway, as a lighted window at dusk.
                      </p>
                      <p>
                        from The Dictionary of Obscure Sorrows, a compendium of invented words for emotions written by John Koeing
                      </p>
                      <p>Varda</p>
                    </>
                  ) : selectedNode.id === 3 ? (
                    <>
                      <h2>group</h2>
                      <p>
                        <strong>n.</strong> (or a verb honestly) there's an innate human desire to categorize and associate entities with one another. we've often done this by religion, ethnicity, background, status… you name it. could this be limiting our ability to connect with people from different corners of the world? what if we could remove this notion to 'group'—rather see yourself as a connection to every human on the planet. you're a part of this giant web and have 8.3 billion connections bouncing off of you. while some of the connections you're naturally closer to, you can be connected to any and everyone imaginable.
                      </p>
                    </>
                  ) : selectedNode.id === 4 ? (
                    <>
                      <h2>sensea</h2>
                      <p>
                        <strong>n.</strong> it's the feeling of sensing another person's energy, soul, 'aura'. we've discretely boxed our senses into 5—sight, smell, hearing, touch, and taste. we also have vocabulary to describe strong emotions such as love, anxiety, melancholy, and more. however, the experience of meeting a new person, and instantly imagining how they live their life, what their values are, what kind of future you envision they'll have—that's an outerbody synergy you're starting to build with another person. it's the basis of any relationship, good or bad.
                      </p>
                    </>
                  ) : selectedNode.id === 5 ? (
                    <>
                      <h2>fluxia</h2>
                      <p>
                        <strong>n.</strong> a state of constant change where you're not experiencing proper time and space to reflect and internalize what's happening. your body is racing as your mind can barely keep up. it can feel exhilarating—life is closest to cinematic in this sensation, where everything feels like a cut scene to the next life-altering interaction. it can also be depressing, where you feel as though you're aimlessly dragging around and not in control of your passions, interests, or values.
                      </p>
                    </>
                  ) : selectedNode.id === 6 ? (
                    <>
                      <h2>ancieno</h2>
                      <p>
                        <strong>n.</strong> a state of operating as if you live in the past. the year is 2025; however, to you it is 1880. you interact with the world as if there's no notion of technology, walking and horses are your main modes of transportation, and you send letters for any long-distance communication. your knowledge base is only filled with inventions, ideologies, and events until the year 1880. in some ways, this could make for some interesting constrained brainstorming?
                      </p>
                    </>
                  ) : selectedNode.id === 7 ? (
                    <>
                      <h2>digiphysis</h2>
                      <p>
                        <strong>n.</strong> the state of existing simultaneously in digital and physical realms, where your consciousness splits between the screen and the flesh. what if we could truly inhabit both spaces at once—feeling the texture of a virtual object while your physical hand remains empty? digiphysis challenges the boundary between what's "real" and what's "simulated," suggesting that presence isn't about location but about the depth of engagement. in this state, you're not just using technology—you're becoming a hybrid entity that transcends traditional spatial limitations.
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : selectedNode.id === 8 ? (
                    <>
                      <h2>synthosia</h2>
                      <p>
                        <strong>n.</strong> the experience of shared consciousness through technology, where multiple minds temporarily merge through digital interfaces. imagine feeling another person's emotional state not through empathy but through direct neural connection facilitated by AI. synthosia could revolutionize how we understand relationships—what if intimacy wasn't about physical proximity but about the depth of shared experience? this raises questions about identity: if you can feel what another feels, where do you end and they begin?
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : selectedNode.id === 9 ? (
                    <>
                      <h2>temporflux</h2>
                      <p>
                        <strong>n.</strong> the distortion of time perception caused by constant digital stimulation, where hours feel like minutes and minutes feel like hours depending on your level of engagement. in a world of infinite scrolls and instant notifications, temporflux describes how we've lost our natural rhythm. what if we could intentionally manipulate this perception—slowing down moments of beauty, speeding through mundane tasks? temporflux suggests that time isn't linear but elastic, shaped by our attention and intention.
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : selectedNode.id === 10 ? (
                    <>
                      <h2>identifluid</h2>
                      <p>
                        <strong>n.</strong> the state of having a fluid, multi-layered identity that shifts between contexts without losing core essence. in digital spaces, you can be anyone—but what if this wasn't deception but expansion? identifluid suggests that we're not single selves but collections of potential selves, each valid in different moments. technology allows us to explore these versions, to try on different ways of being. the question becomes: which version is most "you," or are they all equally authentic?
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : selectedNode.id === 11 ? (
                    <>
                      <h2>connectium</h2>
                      <p>
                        <strong>n.</strong> the fundamental particle of human connection in the digital age—the smallest meaningful unit of interaction that creates bonds between people. a single message, a shared moment, a synchronized experience across screens. connectium suggests that relationships aren't built through grand gestures but through countless micro-interactions. in a world where we're more connected than ever yet feel more isolated, understanding connectium could help us design technologies that foster genuine human bonds rather than superficial engagement.
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : selectedNode.id === 12 ? (
                    <>
                      <h2>reallayer</h2>
                      <p>
                        <strong>n.</strong> the perception that reality exists in multiple overlapping layers, each accessible through different modes of consciousness or technology. augmented reality gives us a glimpse—what if we could peel back layers to see the emotional states of others, the historical context of spaces, or the potential futures branching from each moment? reallayer challenges us to see beyond the surface, to understand that what we perceive is just one frequency in a spectrum of existence. technology becomes a tool not for escape but for deeper engagement with the multi-dimensional nature of being.
                      </p>
                      <p>created by AI</p>
                    </>
                  ) : (
                    <>
                      <h2>Node {selectedNode.id}</h2>
                      <p>Position: ({selectedNode.x.toFixed(2)}, {selectedNode.y.toFixed(2)})</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Music;

