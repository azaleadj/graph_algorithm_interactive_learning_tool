import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import type { EventObject, NodeSingular } from "cytoscape";
//@ts-ignore
import edgehandles from "cytoscape-edgehandles";
import "./edgehandles.css";


cytoscape.use(edgehandles);


type Ele = { data: any; position?: { x: number; y: number } };
type GraphType = "dijkstra_example1" | "dijkstra_example2"| "custom";

type GraphSpec = {
  elements: Ele[];
  directed: boolean;
  layout: { name: "breadthfirst" | "grid" | "circle" | "preset"; rows?: number; cols?: number };
  defaultStart: string;
};

const initial = {
  defaultStart: "A",
  defaultGraphType: "dijkstra_example1",  // connected as default
};

//  threes types  
const makeGraph = (type: GraphType): GraphSpec => {
  switch (type) {

    

    case "dijkstra_example1": {
      const nodes = [
        { id: "A", x: 100, y: 300 },
        { id: "B", x: 300, y: 150 },
        { id: "C", x: 300, y: 450 },
        { id: "D", x: 500, y: 300 },
        { id: "E", x: 700, y: 300 },
      ];
    
      const edges = [
        { id: "A-B", source: "A", target: "B", weight: 3 },
        { id: "A-C", source: "A", target: "C", weight: 1 },
        { id: "B-D", source: "B", target: "D", weight: 3 },
        { id: "C-E", source: "C", target: "E", weight: 4 },
        { id: "A-D", source: "A", target: "D", weight: 2 },
        { id: "D-E", source: "D", target: "E", weight: 1 },
        { id: "C-D", source: "C", target: "D", weight: 5 },
        { id: "B-E", source: "B", target: "E", weight: 2 },
      ];
    
      return {
        elements: [
          ...nodes.map((n) => ({
            data: { id: n.id, label: n.id },
            position: { x: n.x, y: n.y },
          })),
          ...edges.map((e) => ({ data: e })),
        ],
        directed: false,
        layout: { name: "preset" },
        defaultStart: "A",
      };
    }
    

    case "dijkstra_example2": {
      const nodes = [
        { id: "A", x: 200, y: 300 },
        { id: "B", x: 300, y: 100 },
        { id: "C", x: 400, y: 400 },
        { id: "D", x: 600, y: 100 },
        { id: "E", x: 500, y: 200 },
        { id: "F", x: 700, y: 300 },
      ];
    
      const edges = [
        { id: "A-B", source: "A", target: "B", weight: 1 },
        { id: "A-C", source: "A", target: "C", weight: 4 },
        { id: "B-D", source: "B", target: "D", weight: 1 },
        { id: "B-E", source: "B", target: "E", weight: 2 },
        { id: "C-E", source: "C", target: "E", weight: 3 },
        { id: "C-F", source: "C", target: "F", weight: 7 },
        { id: "D-F", source: "D", target: "F", weight: 5 },
        { id: "E-F", source: "E", target: "F", weight: 2 },
        { id: "E-A", source: "E", target: "A", weight: 2 },
        { id: "E-C", source: "E", target: "C", weight: 1 },
      ];

      
    
      return {
        elements: [
          ...nodes.map((n) => ({
            data: { id: n.id, label: n.id },
            position: { x: n.x, y: n.y },
          })),
          ...edges.map((e) => ({ data: e })),
        ],
        directed: true,
        layout: { name: "preset" }, // fixed layout
        defaultStart: "A",
      };
    }
    
    // user defined 
    case "custom": {
      return {
        elements: [],        // initial
        directed: true,      // directed as default
        layout: { name: "preset" },
        defaultStart: "",
      };
    }

    // default —— no error for TypeScript 
    default:
      return {
        elements: [],
        directed: false,
        layout: { name: "preset" },
        defaultStart: "",
      };
    
  }
};



// ---------- Dijkstra main components ----------
const DijkstraDemo: React.FC = () => {
  const [graphType, setGraphType] = useState<GraphType>("dijkstra_example1");
  const [elements, setElements] = useState<Ele[]>(makeGraph("dijkstra_example1").elements);
  const [directed, setDirected] = useState<boolean>(makeGraph("dijkstra_example1").directed);
  const [layoutSpec, setLayoutSpec] = useState(makeGraph("dijkstra_example1").layout);
  const [deleteMode, setDeleteMode] = useState(false);
  const [practiceMinNode, setPracticeMinNode] = useState<string | null>(null);
  
  const [minRedTargets, setMinRedTargets] = useState<string[]>([]);


  const [customElements, setCustomElements] = useState<any[]>([]);



  const [activeEdges, setActiveEdges] = useState<string[]>([]);     // current - red line
  const [confirmedEdges, setConfirmedEdges] = useState<string[]>([]); //  confirmed - green line
  const [isComplete, setIsComplete] = useState(false);
  const [comparisonInfo, setComparisonInfo] = useState<{ target: string; text: string } | null>(null);
  const [startNode, setStartNode] = useState<string>(makeGraph("dijkstra_example1").defaultStart);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [visitedEdges, setVisitedEdges] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);
  const [narration, setNarration] = useState("Choose a graph and click Step/Play to run Dijkstra.");
  const parentRef = useRef<{ [key: string]: string | null }>({});

  const [isEditMode, setIsEditMode] = useState(false);

  const [editMode, setEditMode] = useState(false);

  const editLayout = { name: "preset" };




  const timerRef = useRef<number | null>(null);
  const cyRef = useRef<any>(null);

  function convertCyElements() {
    const json = cyRef.current?.json();
    if (!json || !json.elements) return [];
  
    const nodes = json.elements.nodes ?? [];
    const edges = json.elements.edges ?? [];
  
    const out = [
      ...nodes.map((n: any) => ({
        data: {
          id: n.data.id,
          label: n.data.label,
        },
        position: n.position,
      })),
  
      ...edges.map((e: any) => ({
        data: {
          id: e.data.id,
          source: e.data.source,
          target: e.data.target,
          weight: e.data.weight ?? 1,
        },
      })),
    ];
  
    return out;
  }
  



  const [isPlaying, setIsPlaying] = useState(false);
  const [stepDelay, setStepDelay] = useState(800);

  const getWeight = useCallback(
    (u: string, v: string): number | null => {
      const edge = elements.find(el => {
        const d = el.data;
        if (!d?.source || !d?.target) return false;
  
        return (
          (d.source === u && d.target === v) ||
          (d.source === v && d.target === u)
        );
      });
  
      return edge?.data?.weight ?? null;
    },
    [elements]
  );
  
  
  //practice mode
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [practicePhase, setPracticePhase] =
      useState<"idle" | "front" | "relax" | "done">("idle");

    
  
  const [autoApply, setAutoApply] = useState(false);

  const [challengeCur, setChallengeCur] = useState<string | null>(null);
  const [selectGuess, setSelectGuess] = useState<string | null>(null);
  const [selectFeedback, setSelectFeedback] = useState<string | null>(null);

  
  
  const [taskFlash, setTaskFlash] = useState(false);

  const [hintVisible, setHintVisible] = useState(false);
  const [edgeStartNode, setEdgeStartNode] = useState<string | null>(null);




  const [relaxTargets, setRelaxTargets] = useState<string[]>([]);
  const [frontFeedback, setFrontFeedback] = useState<string | null>(null);

  const [relaxOptions, setRelaxOptions] = useState<string[]>([]);
  const [relaxGuess, setRelaxGuess] = useState<string[]>([]);
  const [relaxFeedback, setRelaxFeedback] =
      useState<{ correct: boolean; missing: string[]; extra: string[] } | null>(null);
  const nodeIds = useMemo(() => elements.filter((el) => !el.data?.source).map((el) => el.data.id as string), [elements]);
  
  const toggleRelaxGuess = (id: string) => {
    setRelaxGuess((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const cyElementsToReactElements = (cyElems: any) => {
    if (!cyElems) return [];
    const { nodes = [], edges = [] } = cyElems;
    return [
      ...nodes.map((n: any) => ({ data: n.data, position: n.position })),
      ...edges.map((e: any) => ({ data: e.data })),
    ];
  };
  
  
  
  
  
  const adjacency = useMemo(() => {
    if (isEditMode) return {};
  
    const adj: Record<string, { target: string; weight: number }[]> = {};
  
    // initialize all nodes
    elements.forEach((el) => {
      if (el.data?.id && !el.data?.source) {
        adj[el.data.id] = [];
      }
    });
  
    // handle edges
    elements.forEach((el) => {
      const d = el.data;
      if (!d?.source || !d?.target) return;
  
      const w = d.weight ?? 1;
  
      // Defensive initialization to avoid crashes when adding nodes or edges
      if (!adj[d.source]) adj[d.source] = [];
      if (!adj[d.target]) adj[d.target] = [];
  
      // directed
      adj[d.source].push({ target: d.target, weight: w });
  
      // undirected 
      if (!directed) {
        adj[d.target].push({ target: d.source, weight: w });
      }
    });
  
    return adj;
  }, [elements, directed, isEditMode]);
  
  



  useEffect(() => {
    
    // 1. user defined mode
    
    if (graphType === "custom") {
      setIsEditMode(true);
      setNarration("Edit Mode: Click to add nodes, drag to move, drag between nodes to create edges.");
      
      
      setElements(customElements);
      // setDirected(true); 
      setLayoutSpec({ name: "preset" });
  
      // Disable Dijkstra state
      setVisited([]);
      setCurrent(null);
      setStartNode("");
      setDistances({});
      setActiveEdges([]);
      setConfirmedEdges([]);
      setHighlightedEdges([]);
      setIsComplete(false);
  
      return; 
    }
  
    
    //  2. not user defined mode - load the default graph
   
    const spec = makeGraph(graphType);
    setIsEditMode(false);
  
    setElements(spec.elements);
    setDirected(spec.directed);
    setLayoutSpec(spec.layout);
  
    // reset algorithm state
    setActiveEdges([]);
    setConfirmedEdges([]);
    setHighlightedEdges([]);
    setVisited([]);
    setCurrent(null);
  
    // pick start node
    const nodes = spec.elements.filter((el) => !el.data?.source).map((el) => el.data.id as string);
    const nextStart = nodes.includes("A") ? "A" : (nodes[0] ?? "");
    setStartNode(nextStart);
  
    const initial: Record<string, number> = {};
    nodes.forEach((n) => (initial[n] = Infinity));
    if (nextStart) initial[nextStart] = 0;
    setDistances(initial);
  
    setNarration(`Graph: ${graphType}. Start from ${nextStart || "(none)"}. Click Step/Play to begin.`);
  
    // layout
    if (cyRef.current) {
      const layout = cyRef.current.layout(spec.layout);
      layout.run();
      cyRef.current.fit();
    }
  }, [graphType]);
  
  


useEffect(() => {
  if (!cyRef.current) return;

  const cy = cyRef.current;

  cy.off("tap", "node");

  if (deleteMode) {
    cy.on("tap", "node", (evt: EventObject) => {
      evt.target.remove();
      // setElements(cy.json().elements);
      const elems = cy.json().elements;
      setElements(cyElementsToReactElements(elems));

    });
  }
}, [deleteMode]);


  // Add a listener for task flashing
  useEffect(() => {
    if (practicePhase === "idle") return;
    setTaskFlash(true);
    const t1 = setTimeout(() => setTaskFlash(false), 400);
    const t2 = setTimeout(() => setTaskFlash(true), 800);
    const t3 = setTimeout(() => setTaskFlash(false), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [practicePhase]);

  {practiceEnabled && (
    <button
      className="px-3 py-1 border border-gray-400 rounded bg-white mt-2"
      onClick={() => setHintVisible(true)}
    >
      Show Hint
    </button>
  )}


const stepOnce = useCallback(() => {

  // clear  Hint
  setHintVisible(false);
 
  // (0) check whether it is the end 
  
  const unvisited = nodeIds.filter(id => !visited.includes(id));
  if (unvisited.length === 0) {
    setNarration("🎉 Dijkstra complete!");
    return false;
  }

  
  //  find minNode
  
  let minNode: string | null = null;
  

  let bestDist = Infinity;

  unvisited.forEach(id => {
    if (distances[id] < bestDist) {
      bestDist = distances[id];
      minNode = id;
    }
  });

  if (!minNode) return false;
  setPracticeMinNode(minNode);

  
  // PHASE 1 — user predict the minNode
  
  if (practiceEnabled && practicePhase === "front") {
    setPracticePhase("front"); 
    setChallengeCur(minNode);
    setNarration(`Predict the next selected node.`);
    return false;
  }

  
  // (2) Front phase passed → finalize minNode selection

  
  setCurrent(minNode);



  
  //  PHASE 2 — user predict relax neighbors（based on minNode）
  //
  if (practiceEnabled && practicePhase === "relax") {

    const allNeighbors = adjacency[minNode].map(n => n.target);

    const predictedTargets = adjacency[minNode]
      .filter(({target, weight}) => {
        const oldDist = distances[target];
        return !visited.includes(target) && bestDist + weight < oldDist;
      })
      .map(n => n.target);

    setRelaxOptions(allNeighbors);
    setRelaxTargets(predictedTargets);
    setChallengeCur(minNode);
    setNarration(`Predict which neighbors of ${minNode} will be relaxed.`);

    return false;
  }

  // 
  // (3) relax predict finished - Perform actual relaxation
  
  const newDist = { ...distances };

  adjacency[minNode].forEach(({ target, weight }) => {
    if (visited.includes(target)) return;

    const oldDist = distances[target];
    const newDistVal = bestDist + weight;

    
    const edge = elements.find(el => {
      const d = el.data;
      if (!d?.source || !d?.target) return false;
    
      if (directed) {
        return d.source === minNode && d.target === target;
      } else {
        return (
          (d.source === minNode && d.target === target) ||
          (d.source === target && d.target === minNode) 
        );
      }
    });
    

    
    if (!edge) return;

    const edgeId = edge.data.id;

    

    // camparing red (current) lines
    setActiveEdges(prev => [...new Set([...prev, edgeId])]);

    



    setComparisonInfo({
      target,
      text: `${bestDist} + ${weight} ${
        newDistVal < oldDist ? "<" : "≥"
      } ${oldDist}`,
    });

    setTimeout(() => {

      if (newDistVal < oldDist) {


        // Direction constraint for directed graphs:
        // Only edges that go OUT from the current node (minNode → target)
        // are allowed to be confirmed (colored green) in practice mode.
        if (directed) {
          const d = edge.data;
          if (d.source !== minNode || d.target !== target) {
            return; // Block incorrect direction updates
          }
        }

        const oldParent = parentRef.current[target];
        if (oldParent) {
          // const oldEdge = elements.find(el =>
          //   el.data &&
          //   ((el.data.source === oldParent && el.data.target === target) ||
          //    (el.data.source === target && el.data.target === oldParent))
          // );
          const oldEdge = elements.find(el => {
            const d = el.data;
            if (!d?.source || !d?.target) return false;
          
            if (directed) {
              // 有向图：只能 oldParent → target
              return d.source === oldParent && d.target === target;
            } else {
              // 无向图：两边都行
              return (
                (d.source === oldParent && d.target === target) ||
                (d.source === target && d.target === oldParent)
              );
            }
          });
          
          if (oldEdge) {
            setConfirmedEdges(prev =>
              prev.filter(id => id !== oldEdge.data.id)
            );
          }
        }

        parentRef.current[target] = minNode;
        newDist[target] = newDistVal;

        setConfirmedEdges(prev => [...new Set([...prev, edgeId])]);
      }

      setActiveEdges(prev => prev.filter(id => id !== edgeId));
      setComparisonInfo(null);
      setDistances({ ...newDist });

    }, 900);
  });

  // finallize relax → marked as visited
  setTimeout(() => {
    setVisited(prev => [...prev, minNode!]);
  }, 1000);

  // Check if finished
  if (visited.length + 1 === nodeIds.length) {
    setTimeout(() => {
      setCurrent(null);
      setIsComplete(true);
      setNarration("🎉 Dijkstra complete! All shortest paths confirmed.");
    }, 1200);
    return false;
  }

  return true;
}, [visited, distances, adjacency, nodeIds, elements]);


  // auto play
  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (visited.length === nodeIds.length) {
      setIsPlaying(false);
      setNarration("🎉 Dijkstra complete!");
      return;
    }
    timerRef.current = window.setTimeout(() => {
      const cont = stepOnce();
      if (!cont) setIsPlaying(false);
    }, stepDelay) as unknown as number;
    return clearTimer;
  }, [isPlaying, visited, stepDelay, stepOnce, nodeIds.length]);


  useEffect(() => {
    if (!isComplete || visitedEdges.length === 0) return;
  
    let i = 0;
    const interval = setInterval(() => {
      // Show one more green edge each step (accumulative, not replacing)
      const visible = visitedEdges.slice(0, i + 1);
      setHighlightedEdges(visible);
      i++;
  
      if (i >= visitedEdges.length) {
        clearInterval(interval);
        
        setTimeout(() => {
          setNarration("✅ All shortest paths highlighted.");
        }, 1000);
      }
    }, 1000); // 
  
    // clear up
    return () => clearInterval(interval);
  }, [isComplete, visitedEdges]);


  const applySelect = useCallback(() => {
    // user predicted right, shift to relax stedge，then continue step
    setPracticePhase("relax");
    stepOnce();
  }, [stepOnce]);


  

  const applyRelaxActual = useCallback(() => {
    if (!challengeCur) return;
  
    const u = challengeCur;    // node being relaxed
    const minDist = distances[u];
    const newDist = { ...distances };
  
    adjacency[u].forEach(({ target, weight }) => {
      if (visited.includes(target)) return;
  
      const edge = elements.find(
        (el) =>
          el.data &&
          el.data.source === u &&
          el.data.target === target
      );


      if (!edge) return;
      const edgeId = edge.data.id;
  
      const oldDist = distances[target];
      const newDistVal = minDist + weight;
  
      // if relax success
      if (newDistVal < oldDist) {
        // update parent
        parentRef.current[target] = u;
        newDist[target] = newDistVal;
  
        // high light  parent edge
        setConfirmedEdges((prev) => [...new Set([...prev, edgeId])]);
      }
    });
  
    // updat distance
    setDistances(newDist);
  
    // current node is visited
    setVisited((prev) => [...prev, u]);
  
    // clear relax state
    setRelaxGuess([]);
    setRelaxFeedback(null);
  }, [challengeCur, adjacency, distances, elements, visited]);

  const applyRelax = useCallback(() => {
    // 1. excute real relax（update green edges,visited nodes）
    applyRelaxActual();
  
    // 2. shift to front stedge，wait for next question
    setPracticePhase("front");
    stepOnce();
    setFrontFeedback(null);
    setChallengeCur(null);
    setRelaxGuess([]);
    setRelaxFeedback(null);
  
    
  }, [applyRelaxActual]);


  const askNextQuestion = useCallback(
    (dist = distances, visitedSet = visited, fallbackStart?: string) => {
      const start = startNode || fallbackStart || "A";
  
      const unvisited = nodeIds.filter((id) => !visitedSet.includes(id));
      if (unvisited.length === 0) {
        setChallengeCur(null);
        setNarration("🎉 Dijkstra complete!");
        return;
      }
  
      let best: string | null = null;
      let bestDist = Infinity;
  
      unvisited.forEach((id) => {
        if (dist[id] < bestDist) {
          bestDist = dist[id];
          best = id;
        }
      });
  
      if (!best || bestDist === Infinity) {
        setChallengeCur(null);
        setNarration("⚠️ Remaining nodes unreachable.");
        return;
      }
  
      setChallengeCur(best);
      setFrontFeedback(null);
      setNarration(`Practice: click the node with the smallest distance from ${start}.`);
    },
    [distances, visited, nodeIds, startNode]
  );

  


  // const applyPracticeStep = useCallback(
  //   (minNode: string) => {
  
  //     const dist0 = distances[minNode];
  //     if (dist0 === Infinity) {
  //       setNarration("⚠️ This node is unreachable.");
  //       setChallengeCur(null);
  //       return;
  //     }
  
  //     setCurrent(minNode);
  //     const newDist = { ...distances };
  
      
  //     adjacency[minNode].forEach(({ target, weight }) => {
  
  //       if (visited.includes(target)) return;
  
  //       const oldDist = distances[target];
  //       const newDistVal = dist0 + weight;
  
      

  //       const edge = elements.find(el => {
  //         const d = el.data;
  //         if (!d?.source || !d?.target) return false;
        
  //         if (directed) {
  //           // Directed graph: only allow outgoing edge
  //           return d.source === minNode && d.target === target;
  //         } else {
  //           // Undirected graph: either direction is valid
  //           return (
  //             (d.source === minNode && d.target === target) ||
  //             (d.source === target && d.target === minNode)
  //           );
  //         }
  //       });
        
        
  
  //       if (!edge) return;
  
  //       const edgeId = edge.data.id;
  //       setActiveEdges((prev) => [...new Set([...prev, edgeId])]);
  
  //       setComparisonInfo({
  //         target,
  //         text: `${dist0} + ${weight} ${
  //           newDistVal < oldDist ? "<" : "≥"
  //         } ${oldDist}`,
  //       });
  
  //       setTimeout(() => {
  //         if (newDistVal < oldDist) {
  //           const oldParent = parentRef.current[target];
  //           if (oldParent) {
              
  //             const oldEdge = elements.find(el => {
  //               const d = el.data;
  //               if (!d?.source || !d?.target) return false;
              
  //               if (directed) {
  //                 // Directed graph: only oldParent → target is valid
  //                 return d.source === oldParent && d.target === target;
  //               } else {
  //                 // Undirected graph: either direction
  //                 return (
  //                   (d.source === oldParent && d.target === target) ||
  //                   (d.source === target && d.target === oldParent)
  //                 );
  //               }
  //             });
              
  //             if (oldEdge) {
  //               setConfirmedEdges((prev) =>
  //                 prev.filter((id) => id !== oldEdge.data.id)
  //               );
  //             }
  //           }
  
  //           parentRef.current[target] = minNode;
  //           newDist[target] = newDistVal;
  //           setConfirmedEdges((prev) => [...new Set([...prev, edgeId])]);
  
  //         }
  
  //         setActiveEdges((prev) => prev.filter((id) => id !== edgeId));
  //         setComparisonInfo(null);
  //         setDistances({ ...newDist });
  
  //       }, 900);
  //     });
  
  //     // visited
  //     setTimeout(() => {
  //       const newVisited = [...visited, minNode];
  //       setVisited(newVisited);
  
        
  //       askNextQuestion({ ...newDist }, newVisited);
  
  //     }, 1000);
  //   },
  //   [adjacency, distances, visited, elements, askNextQuestion]
  // );
  
  const applyPracticeStep = useCallback(
    (minNode: string) => {
  
      const dist0 = distances[minNode];
      if (dist0 === Infinity) {
        setNarration("⚠️ This node is unreachable.");
        setChallengeCur(null);
        return;
      }
  
      setCurrent(minNode);
      const newDist = { ...distances };
  
      // memo all candidate nodes and their tentative distances
      const candidateTargets: { target: string; newDist: number }[] = [];
  
      // 
      // Iterate over all candidate edges (animate in red and collect target nodes)
      // 
      adjacency[minNode].forEach(({ target, weight }) => {
  
        if (visited.includes(target)) return;
  
        const oldDist = distances[target];
        const newDistVal = dist0 + weight;
  
        // find edges（direction-aware，only used in animation）
        const edge = elements.find(el => {
          const d = el.data;
          if (!d?.source || !d?.target) return false;
  
          if (directed) {
            return d.source === minNode && d.target === target;
          } else {
            return (
              (d.source === minNode && d.target === target) ||
              (d.source === target && d.target === minNode)
            );
          }
        });
  
        if (!edge) return;
  
        const edgeId = edge.data.id;
  
        
        setActiveEdges(prev => [...new Set([...prev, edgeId])]);
  
        // collect candidate nodes
        candidateTargets.push({ target, newDist: newDistVal });
  
        // compare distance
        setComparisonInfo({
          target,
          text: `${dist0} + ${weight} ${newDistVal < oldDist ? "<" : "≥"} ${oldDist}`,
        });
  
       
        // relax animation & real Dijkstra update
        
        setTimeout(() => {
          if (newDistVal < oldDist) {
  
            const oldParent = parentRef.current[target];
            if (oldParent) {
              const oldEdge = elements.find(el => {
                const d = el.data;
                if (!d?.source || !d?.target) return false;
  
                if (directed) {
                  return d.source === oldParent && d.target === target;
                } else {
                  return (
                    (d.source === oldParent && d.target === target) ||
                    (d.source === target && d.target === oldParent)
                  );
                }
              });
  
              if (oldEdge) {
                setConfirmedEdges(prev =>
                  prev.filter(id => id !== oldEdge.data.id)
                );
              }
            }
  
            parentRef.current[target] = minNode;
            newDist[target] = newDistVal;
            setConfirmedEdges(prev => [...new Set([...prev, edgeId])]);
          }
  
          setActiveEdges(prev => prev.filter(id => id !== edgeId));
          setComparisonInfo(null);
          setDistances({ ...newDist });
  
        }, 900);
      });
 
      // calculate the set of correct next nodes
      
      if (candidateTargets.length > 0) {
        const minDist = Math.min(...candidateTargets.map(x => x.newDist));
  
        const minTargets = candidateTargets
          .filter(x => x.newDist === minDist)
          .map(x => x.target);
        
        console.log("==== PRACTICE DEBUG ====");
        console.log("Current minNode:", minNode);
        console.log("Distances:", distances);
        console.log("Visited:", visited);
        console.log("Candidate targets:", candidateTargets);
        console.log("Min red targets (correct answers):", minTargets);
        console.log("========================");
  
        // Practice front answer set
        setMinRedTargets([...new Set(minTargets)]);
      } else {
        setMinRedTargets([]);
      }
  
      //
      // marked as visited，ask next question
      // 
      setTimeout(() => {
        const newVisited = [...visited, minNode];
        setVisited(newVisited);
        askNextQuestion({ ...newDist }, newVisited);
      }, 1000);
  
    },
    [adjacency, distances, visited, elements, askNextQuestion, directed]
  );
  
  
  
  useEffect(() => {
    // Automatically hide hints when practice mode starts

    if (practiceEnabled) {
      setHintVisible(false);
    }
  }, [practiceEnabled]);
  

  const handleStart = () => {
    clearTimer();
    setIsPlaying(false);
    setActiveEdges([]);
    setConfirmedEdges([]);
    const s = nodeIds.includes("A") ? "A" : nodeIds[0] ?? "";
    setStartNode(s);
    const initial: Record<string, number> = {};
    nodeIds.forEach((id) => (initial[id] = Infinity));
    if (s) initial[s] = 0;
    setDistances(initial);
    setVisited([]);
    setVisitedEdges([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setIsComplete(false);
    setNarration(`Ready. Starting from ${s || "(none)"}.`);
    cyRef.current?.fit();
  };

  const handleStep = () => {
    if (isPlaying) return;
    stepOnce();
  };

  


  

  // const handlePredictFront = useCallback(
  //   (clickedId: string) => {
  //     if (!practiceMinNode) return;
  
  //     const w = getWeight(practiceMinNode, clickedId);
  //     if (w == null) {
  //       setFrontFeedback("wrong");
  //       return;
  //     }
  
  //     const clickedDist = distances[practiceMinNode] + w;
  
  //     const neighbors = adjacency[practiceMinNode].filter(
  //       ({ target }) => !visited.includes(target)
  //     );
  
  //     const minNewDist = Math.min(
  //       ...neighbors.map(n => distances[practiceMinNode] + n.weight)
  //     );
  
      
  //     if (minRedTargets.includes(clickedId)) {
  //       setFrontFeedback("correct");
      
  //       setPracticePhase("relax"); // 或直接 stepOnce
  //       setRelaxGuess([]);
  //       setRelaxFeedback(null);
      
  //       if (autoApply) {
  //         setTimeout(() => stepOnce(), 500);
  //       }
  //     } else {
  //       setFrontFeedback("wrong");
  //     }
      
  //   },
  //   [
  //     practiceMinNode,
  //     distances,
  //     adjacency,
  //     visited,
  //     getWeight,
  //     autoApply,
  //     stepOnce,
  //   ]
  // );

  const handlePredictFront = useCallback(
    (clickedId: string) => {
      if (!practiceMinNode) return;
  
      const unvisited = nodeIds.filter(
        id => !visited.includes(id)
      );
      if (unvisited.length === 0) return;
  
      const minDist = Math.min(
        ...unvisited.map(id => distances[id])
      );
  
      const correctNodes = unvisited.filter(
        id => distances[id] === minDist
      );
  
      console.log("Clicked:", clickedId);
      console.log("Correct nodes:", correctNodes);
  

      if (correctNodes.includes(clickedId)) {
        setFrontFeedback("correct");
        setHintVisible(false);
      
        // IMPORTANT: store the user's correct choice as the node to apply next
        setPracticeMinNode(clickedId);
      
        if (autoApply) {
          setTimeout(() => {
            // Apply the algorithm step using the node the user selected
            applyPracticeStep(clickedId);
          }, 500);
        }
      } else {
        setFrontFeedback("wrong");
        setNarration(`❌ ${clickedId} is incorrect. Try again.`);
      }
      
    },
    [
      practiceMinNode,
      nodeIds,
      visited,
      distances,
      autoApply,
      stepOnce,
    ]
  );
  
  
  
  
  const handlePlayToggle = () => {
    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
      setNarration((n) => `${n} (Paused)`);
    } else {
      setIsPlaying(true);
      setNarration((n) =>
        n.includes("Ready.") ? "Auto-playing..." : `${n} (Auto-playing...)`
      );
    }
  };

  

  const addNode = () => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
  
    // get all current ID，for example  ["N1", "N3"]
    

    const existingIds = cy.nodes().map((n: cytoscape.NodeSingular) => n.id());

    let maxIndex = 0;
    existingIds.forEach((id: string) => {
      const num = parseInt(id.replace("N", ""));
      if (!isNaN(num)) maxIndex = Math.max(maxIndex, num);
    });
  
    // new node ID = Next unused ID
    const newId = "N" + (maxIndex + 1);
  
    
    // const pos = { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 };
      // Get the current viewport center (screen coordinates)
    const center = cy.extent(); 
    const x = (center.x1 + center.x2) / 2;
    const y = (center.y1 + center.y2) / 2;

    // Add a small random perturbation to avoid overla
    const jitter = 120;
    const pos = {
      x: x + (Math.random() - 0.5) * jitter,
      y: y + (Math.random() - 0.5) * jitter,
    };

  
    cy.add({
      group: "nodes",
      data: { id: newId, label: newId },
      position: pos,
      classes: "user-node"
    });
  
    // cy.layout({ name: "preset" }).run();
    const updated = convertCyElements();
    setElements(updated);
    setElements(convertCyElements());
  };
  
  
  
  

  const handleReset = () => {
    clearTimer();
    setIsPlaying(false);
    setActiveEdges([]);
    setConfirmedEdges([]);
    const s = nodeIds.includes("A") ? "A" : nodeIds[0] ?? "";
    setStartNode(s);
    const initial: Record<string, number> = {};
    nodeIds.forEach((id) => (initial[id] = Infinity));
    if (s) initial[s] = 0;
    setDistances(initial);
    setVisited([]);
    setVisitedEdges([]);
    setCurrent(null);
    setPracticeEnabled(false);
    
    setHighlightedEdges([]);
    setIsComplete(false);
    setNarration(`Reset. Start from ${s || "(none)"}.`);
    cyRef.current?.fit();
  };

  useEffect(() => {
    if (practiceEnabled && practicePhase === "front" && !challengeCur) {
      askNextQuestion();
    }
  }, [practiceEnabled, practicePhase, challengeCur]);

  const stylesheet = [
    
    {
      selector: "node",
      style: {
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 14,
        width: 36,
        height: 36,
        color: "#fff",
    
       
        "background-color": (ele: any) => {
          const id = ele.id();
    
          // visited- green
          if (visited.includes(id)) return "#22c55e";
    
          //now processing -blue
          if (current === id) return "#2563eb";
    
          // Discovered but not visited - yellow
          if (distances[id] < Infinity) return "#eab308";
    
          // Undiscovered nodes (default) - gray
          return "#9ca3af";
        },
    
        "border-width": 2,
        "border-color": "#ffffffaa",
      },
    },

    {
      selector: "node.user-node",
      style: {
        width: 36,
        height: 36,
        "font-size": 14,
      },
    },
    
 
    {
      selector: "edge",
      style: {
        width: 3,
        "curve-style": "bezier",
        "line-color": (ele: any) => {
          const id = ele.id();
          if (activeEdges.includes(id)) return "#ef4444"; // comparing
          if (confirmedEdges.includes(id)) return "#22c55e"; // 
          return "#cbd5e1"; // grey
        },
        "target-arrow-color": (ele: any) => {
          const id = ele.id();
          if (activeEdges.includes(id)) return "#ef4444";
          if (confirmedEdges.includes(id)) return "#22c55e";
          return "#cbd5e1";
        },
        // "target-arrow-shape": directed?"triangle":"none",
        // "target-arrow-shape": (ele: any) =>
        // ele.data("undirected") ? "none" : "triangle",


        "target-arrow-shape": (ele: any) => {
          const d = ele.data();

          // user decide the type of the graph
          if (typeof d.undirected === "boolean") {
            return d.undirected ? "none":"triangle";
          }

          // example1 / example2：back to globle logic
          return directed ? "triangle" : "none";
        },


        "transition-property": "line-color, target-arrow-color",
        "transition-duration": "500ms",
    
        // weight
        label: "data(weight)",
        "font-size": 12,
        color: "#1e293b",
        "font-weight": 600,
    
        // aviod overlap
        "text-margin-y": (ele: any) => {
          const id = ele.id();
          if (["A-B", "C-E", "D-F"].includes(id)) return -10; // 
          if (["B-C", "B-E", "C-F"].includes(id)) return 8;   // 
          return -4; // 
        },
      },
    },
    
    
  ];

  

  const pq = nodeIds
    .filter((id) => !visited.includes(id) && distances[id] < Infinity)
    .sort((a, b) => distances[a] - distances[b]);


  const isFinished =
    visited.length === nodeIds.length ||
    nodeIds.every((id) => visited.includes(id) || distances[id] === Infinity);

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh" }}>
      <div style={{ padding: 10, background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
        <b>Graph Algorithm Visualization — Dijkstra</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 280px", gap: 12, padding: 12 }}>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 6,fontWeight:"800" }}>Graph Type</div>
            {/* <select
              value={graphType}
              onChange={(e) => setGraphType(e.target.value as GraphType)}
              style={{ width: "100%", padding: 8 }}
            > */}

            <select
                value={graphType}
                onChange={(e) => setGraphType(e.target.value as GraphType)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white cursor-pointer"
              >
              <option value="dijkstra_example1">Shortest Path Example (Undirected)</option>
              <option value="dijkstra_example2">Shortest Path Example (Directed)</option>
              <option value="custom">User-Defined Graph (Editable)</option>


              {/* <option value="grid">Grid 3×3 (Undirected)</option> */}
            </select>
          </div>

          

          {!practiceEnabled && (
          <div style={{ fontSize: 13, color: "#334155" }}>
            <div>
              <b>Start node:</b>{" "}
              <span style={{ color: "#2563eb" }}>{startNode || "(none)"}</span>
            </div>

            <div style={{ marginTop: 4 }}>
              👉 Click any node on the graph to set it as the start
              {isPlaying && <span style={{ color: "#ef4444" }}> (pause first)</span>}
            </div>
          </div>
        )}





          <div className="grid gap-2 mt-2">
            <button
              onClick={handleStart}
              disabled={isPlaying}
              className="
                px-3 py-2
                border border-gray-400
                rounded
                bg-gray-50
                hover:bg-gray-100
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Start
            </button>

            <button
              onClick={handleStep}
              disabled={isPlaying || isFinished}
              className="
                px-3 py-2
                border border-gray-400
                rounded
                bg-gray-50
                hover:bg-gray-100
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Step
            </button>

            <button
              onClick={handlePlayToggle}
              disabled={isFinished}
              className="
                px-3 py-2
                border border-gray-400
                rounded
                bg-gray-50
                hover:bg-gray-100
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              onClick={handleReset}
              className="
                px-3 py-2
                border border-gray-400
                rounded
                bg-gray-50
                hover:bg-gray-100
                cursor-pointer
              "
            >
              Reset
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Speed (ms / step)</div>
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={stepDelay}
              onChange={(e) => setStepDelay(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{stepDelay} ms</div>
          </div>
        
       
        {/*  Dijkstra practice mode */}

        {/* <div style={{ marginTop: 12, display: "grid", gap: 8 }}> */}

          {/* switch */}
          <label style={{ fontSize: 13, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={practiceEnabled}
              
              onChange={(e) => {
                const enabled = e.target.checked;
                setPracticeEnabled(enabled);
              
                if (!enabled) {
                  // practice mode off
                  setChallengeCur(null);
                  setFrontFeedback(null);
                  setPracticePhase("idle");
                  setNarration("Practice mode off.");
                  return;
                }
              
                // 
                // practice mode on → auto reset
                //
                const start = startNode || "A";
                setStartNode(start);
              
                const d: Record<string, number> = {};
                nodeIds.forEach((id) => (d[id] = Infinity));
                d[start] = 0;
              
                parentRef.current = {};
                setDistances(d);
                setVisited([]);
                setCurrent(null);
                setActiveEdges([]);
                setConfirmedEdges([]);
                setHighlightedEdges([]);
                setFrontFeedback(null);
                setRelaxGuess([]);
                setRelaxFeedback(null);
                setIsComplete(false);
              
                setPracticePhase("front");
              
                askNextQuestion();
              }}
              
              
              style={{ marginRight: 6 }}
            />
            Practice mode (predict selected node → relaxed neighbors)
          </label>
          {/* Auto-apply step on correct */}
          <label style={{ fontSize: 13, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Auto-apply step on correct
          </label>


          {/* Current task bar */}
          {practiceEnabled && (
            <div
              
              style={{
                  background: taskFlash ? "#c7d2fe" : "#eef2ff",      // 闪烁时更亮
                  borderLeft: "4px solid #6366f1",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 15,
                  color: "#1e3a8a",
                  fontWeight: 600,
                  marginBottom: 6,
                  boxShadow: taskFlash
                  ? "0 0 10px 2px rgba(99,102,241,0.6)"             // 发光
                  : "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
              }}
              // ------
            >
              

              <b>Task:</b>{" "}
              {practicePhase === "front"
                ? "Predict the next selected node (min distance)"
                : practicePhase === "relax"
                ? `Predict neighbors of ${challengeCur} that will be relaxed`
                : "Idle"}


              {practiceEnabled && practicePhase === "front" && (
                <button
                  onClick={() => setHintVisible(true)}
                  className="px-3 py-1 border border-gray-400 rounded bg-white hover:bg-gray-50 mt-2"
                >
                  Show Hint
                </button>
              )}
            </div>

 
            
          )}

          {/*  Phase 1: front  */}
          {practiceEnabled && practicePhase === "front" && challengeCur && (
            <div
              style={{
                padding: 10,
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
              }}
            >
              

              {frontFeedback === "correct" && (
                <div style={{ color: "#16a34a", fontSize: 12, marginTop: 6 }}>
                  ✅ Correct!
                </div>
              )}
              {frontFeedback === "wrong" && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                  ❌ Wrong — try again.
                </div>
              )}
            </div>
          )}

          {/* Phase 2: relax  */}
          {practiceEnabled && practicePhase === "relax" && challengeCur && (
            <div
              style={{
                padding: 10,
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                Predict <b>which neighbors of {challengeCur}</b> will be updated
                (relaxed).
              </div>
              
              

              

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => {
                    const missing = relaxTargets.filter((t) => !relaxGuess.includes(t));
                    const extra = relaxGuess.filter((t) => !relaxTargets.includes(t));

                    if (missing.length === 0 && extra.length === 0) {
                      setRelaxFeedback({ correct: true, missing: [], extra: [] });
                    } else {
                      setRelaxFeedback({ correct: false, missing, extra });
                    }
                  }}
                  style={{ padding: "6px 12px" }}
                >
                  Check
                </button>

                
                {!autoApply && (
                <button
                  onClick={applyRelax}
                  disabled={!relaxFeedback?.correct}
                  style={{ padding: "6px 12px" }}
                >
                  Apply Step
                </button>
              )}

              </div>

              {/* feedback */}
              {relaxFeedback && relaxFeedback.correct && (
                <div style={{ color: "#16a34a", fontSize: 12, marginTop: 6 }}>
                  ✅ Correct: [{relaxTargets.join(", ") || "∅"}]
                </div>
              )}

              {relaxFeedback && !relaxFeedback.correct && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                  ❌ Not correct.
                  {relaxFeedback.missing.length > 0 &&
                    <> Missing: [{relaxFeedback.missing.join(", ")}]</>}
                  {relaxFeedback.extra.length > 0 &&
                    <> Extra: [{relaxFeedback.extra.join(", ")}]</>}
                </div>
              )}
            </div>
          )}

          {/* Priority Queue Panel */}
          
          {(!practiceEnabled || hintVisible) && (
            <div
              style={{
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#f9fafb",
              }}
            >
              <h4 style={{ margin: "0 0 8px" }}>Priority Queue (Min-Heap)</h4>

              {pq.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>(empty)</div>
              ) : (
                <div style={{ lineHeight: 1.6 }}>
                  <div style={{ marginBottom: 6 }}>
                    <b>front → </b>
                    <span style={{ color: "#2563eb", fontWeight: 600 }}>
                      {pq[0]}
                    </span>
                  </div>

                  {pq.slice(1).map((id) => (
                    <div key={id} style={{ fontSize: 13 }}>
                      {id} ({distances[id] === Infinity ? "∞" : distances[id]})
                    </div>
                  ))}

                  <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
                    👉 Node <b>{pq[0]}</b> is selected because it currently has the
                    <b> smallest tentative distance</b> among all unvisited nodes.
                  </div>

                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                    Distance[{pq[0]}] ={" "}
                    <b>{distances[pq[0]] === Infinity ? "∞" : distances[pq[0]]}</b>
                  </div>
                </div>
              )}
            </div>
          )}



          
          
        
        </div>

        

        
        {/*
        * Controls graph visualization and interaction using Cytoscape.js,
        * including layout, visual highlighting, and step-based updates
        * for BFS and Dijkstra algorithm demonstrations.
        */}
        


        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <CytoscapeComponent
            elements={elements as any}
            layout={isEditMode ? { name: "preset" } : layoutSpec}
            stylesheet={stylesheet as any}
            style={{ width: "100%", height: 520 }}
            cy={(cy) => {
              cyRef.current = cy;
              
              cy.off("tap");
              if (!isEditMode) {
                cy.fit();
              }

          
              if (isEditMode) {
                cy.nodes().grabify();
              
                cy.on("tap", "node", (evt) => {
                  const id = evt.target.id();

                  // Deletion mode takes priority
                  if (deleteMode) {
                    evt.target.remove();
                    setElements(convertCyElements());
                    setCustomElements(convertCyElements());
                    setNarration(`Deleted node ${id}`);
                    return;
                  }
              
                  // If no start node is selected, set this node as the start
                  if (!edgeStartNode) {
                    setEdgeStartNode(id);
                    setNarration(`Selected start node: ${id}. Click another node to create an edge.`);
                    return;
                  }
              
                  
                  // Click the second node to create an edge

                  if (edgeStartNode && edgeStartNode !== id) {

                    

                    // Prompt for weight
                    const weightStr = prompt(
                      `Enter weight for edge ${edgeStartNode} → ${id}:`,
                      "1"
                    );
                    const weight = Number(weightStr);

                    if (isNaN(weight)) {
                      alert("Invalid weight.");
                      setEdgeStartNode(null);
                      return;
                    }

                

                    cy.add({
                      group: "edges",
                      data: {
                        id: `${edgeStartNode}-${id}`,
                        source: edgeStartNode,
                        target: id,
                        weight,
                        // undirected: true   
                      }
                    })


                    // Update React version elements
                    

                    const updated = convertCyElements();
                    setElements(updated);
                    setCustomElements(updated);

                    // Clear the first click
                    setEdgeStartNode(null);
                  }

                });
              
                return;
              }
              
              // Non-edit mode — algorithm logic
              
              cy.on("tap", "node", (evt) => {
                const id = evt.target.id();

                if (isPlaying) return;

                
                // Practice mode validation
                if (practiceEnabled) {
                  setHintVisible(false);
                  handlePredictFront(id);
                  return;
                }


                

                // common Dijkstra mode：set start node
                const init: Record<string, number> = {};
                nodeIds.forEach((nid) => (init[nid] = Infinity));
                init[id] = 0;

                setStartNode(id);
                setDistances(init);
                setVisited([]);
                setCurrent(null);
                setActiveEdges([]);
                setConfirmedEdges([]);
                setHighlightedEdges([]);
                setIsComplete(false);

                setNarration(`Start node set to ${id}. Click Step to begin.`);
              });
            }}
          />
      
          {isEditMode && (
            <div 
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: 16,
                marginTop: 12
              }}
            >
              <button
                onClick={addNode}
                style={{
                  padding: "8px 16px",
                  background: "#dbeafe",
                  border: "1px solid #93c5fd",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ➕ Add Node
              </button>

              <button
                onClick={() => setDeleteMode((m) => !m)}
                style={{
                  padding: "8px 16px",
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  color: deleteMode ? "#b91c1c" : "#7f1d1d",
                  fontWeight: deleteMode ? "bold" : "normal",
                }}
              >
                🗑 Delete
              </button>

              <button
                onClick={() => setIsEditMode(false)}
                style={{
                  padding: "8px 16px",
                  background: "#e0e7ff",
                  border: "1px solid #a5b4fc",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ↩ Exit Edit Mode
              </button>
            
              {/* graph direction selection*/}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 13,
                  marginTop: 4,
                }}
                >
                <span style={{ color: "#334155" }}>Graph Type:</span>

                <button
                  onClick={() => setDirected(true)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: directed ? "#dbeafe" : "#f8fafc",
                    fontWeight: directed ? "bold" : "normal",
                    cursor: "pointer",
                  }}
                >
                  Directed
                </button>

                <button
                  onClick={() => setDirected(false)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: !directed ? "#dbeafe" : "#f8fafc",
                    fontWeight: !directed ? "bold" : "normal",
                    cursor: "pointer",
                  }}
                >
                  Undirected
                </button>
              </div>
            </div>
          )}


        
      
        

          {isEditMode && (
            <div 
              style={{
                marginTop: 12,
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ 
                textAlign: "left", 
                maxWidth: 420, 
                color: "#475569", 
                fontSize: 14,
                lineHeight: "1.6"
              }}>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>🟦 How to Edit the Graph</div>

                <div>• Click <b>Add Node</b> to insert a new node.</div>
                <div>• Click <b>Delete</b>, then click a node to remove it.</div>
                <div>• Click <b>two nodes in sequence</b> to create a directed edge.</div>
                <div>• Drag nodes to reposition them freely.</div>

                <div style={{ marginTop: 10, fontStyle: "italic", color: "#334155" }}>
                  ➤ After finishing editing, click <b>Exit Edit Mode</b>  
                  to return to <b>interactive mode</b> and <b>practice mode</b>.
                </div>
              </div>
            </div>
          )}
        </div>

      

      {/* </div> */}



        {/* pannel on the right */}
        <div style={{ display: "grid", alignContent: "start", gap: 12 }}>
          
         

          {/* color legend */}
          <h4 style={{ margin: "16px 0 6px" }}>Color Legend</h4>
            <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: "#2563eb", border: "1px solid #cbd5e1"
                  }}></div>
                  <span>Current node (being visited)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: "#22c55e", border: "1px solid #cbd5e1"
                  }}></div>
                  <span>Visited nodes</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: "#eab308", border: "1px solid #cbd5e1"
                  }}></div>
                  <span>Nodes in queue</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: "#9ca3af", border: "1px solid #cbd5e1"
                  }}></div>
                  <span>Unvisited nodes</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 2, background: "#ef4444",
                  marginRight: 2
                  }}></div>
                  <span>Highlighted edge (enqueued)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                  width: 16, height: 2, background: "#22c55e",
                  marginRight: 2
                  }}></div>
                  <span>Visiteded edge (path taken)</span>
              </div>

            </div>



          {/* Distance Table */}
          <div
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 8,
              background: "#f9fafb",
            }}
          >
            <h4 style={{ margin: "0 0 6px" }}>Distance Table</h4>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "4px" }}>Node</th>
                  <th style={{ textAlign: "left", padding: "4px" }}>Distance</th>
                </tr>
              </thead>
              
              <tbody>
                {nodeIds.map((id) => (
                  <tr
                    key={id}
                    style={{
                      // Change color when the node is being compared
                      color:
                        comparisonInfo?.target === id
                          ? comparisonInfo.text.includes("≥")
                            ? "#9ca3af" // gray- isn't updated
                            : "#16a34a" // green - updated successfully
                          : "#000", // black as default
                      transition: "color 0.3s ease",
                    }}
                  >
                    <td style={{ padding: "4px" }}>{id}</td>
                    <td style={{ padding: "4px" }}>
                      {distances[id] === Infinity ? "∞" : distances[id]}
                      {/* If the current row is the node being compared, show the comparison formula */}
                      {comparisonInfo?.target === id && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          ({comparisonInfo.text})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          {/* Shortest Path Panel */}
          <div
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 8,
              background: "#f9fafb",
            }}
          >
            <h4 style={{ margin: "0 0 6px" }}>Shortest Paths</h4>

            {nodeIds.map((id) => {
              if (id === startNode) return null;

              let path: string[] = [];
              let cur: string | null = id;   

              while (cur && cur !== startNode) {
                path.push(cur);
                cur = parentRef.current[cur] ?? null; // now allowed
                if (!cur) break;
              }

              if (cur === startNode) path.push(startNode);

              path.reverse();

              return (
                <div key={id} style={{ fontSize: 12, marginBottom: 4 }}>
                  <b>{startNode} → {id}:</b>{" "}
                  {distances[id] === Infinity ? "unreachable" : path.join(" → ")}
                </div>
              );
            })}

          </div>

          {/* Color interpretation */}
         

          {/* Explanation module */}
          <div
            style={{
              marginTop: 24,
              padding: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#f9fafb",
            }}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Dijkstra Algorithm Explanation</h4>
            <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
              <ol style={{ marginLeft: 16, paddingLeft: 8 }}>
                <li>Initialize distances: start node = 0, others = ∞.</li>
                <li>Select the unvisited node with the smallest distance.</li>
                <li>Relax (update) all neighbors’ distances.</li>
                <li>Mark the current node as visited.</li>
                <li>Repeat until all nodes are visited or unreachable.</li>
              </ol>
              <p style={{ marginTop: 8 }}>
                📖 Learn more on{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 500 }}
                >
                  Wikipedia – Dijkstra’s algorithm
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DijkstraDemo;

     