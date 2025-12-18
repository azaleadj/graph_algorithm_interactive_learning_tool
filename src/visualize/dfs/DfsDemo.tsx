import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";

type Ele = { data: any; position?: { x: number; y: number } };
type GraphType = "tree" | "cyclic" | "disconnected" | "undirected" | "grid";

type GraphSpec = {
    elements: Ele[];
    directed: boolean;
    layout: {
      name: "breadthfirst" | "grid" | "circle";  // 增加 "circle"
      rows?: number;
      cols?: number;
    };
    defaultStart: string;
  };
  

type PracticePhase = "idle" | "front" | "enqueue";

// ---------- 五种图的定义 ----------
const makeGraph = (type: GraphType): GraphSpec => {
  switch (type) {
    case "tree": {
      const nodes = ["A", "B", "C", "D", "E", "F"];
      const edges = [
        { id: "A-B", source: "A", target: "B" },
        { id: "A-C", source: "A", target: "C" },
        { id: "B-D", source: "B", target: "D" },
        { id: "B-E", source: "B", target: "E" },
        { id: "C-F", source: "C", target: "F" },
      ];
      const elements: Ele[] = [
        ...nodes.map((id) => ({ data: { id, label: id } })),
        ...edges.map((e) => ({ data: e })),
      ];
      return { elements, directed: true, layout: { name: "breadthfirst" }, defaultStart: "A" };
    }
    case "cyclic": {
        const nodes = ["A", "B", "C"];
        const edges = [
          { id: "A-B", source: "A", target: "B" },
          { id: "B-C", source: "B", target: "C" },
          { id: "C-A", source: "C", target: "A" },
        ];
        const elements: Ele[] = [
          ...nodes.map((id) => ({ data: { id, label: id } })),
          ...edges.map((e) => ({ data: e })),
        ];
      
        // ✅ 使用 circle 布局，确保环形排列
        return {
          elements,
          directed: true,
          layout: { name: "circle" }, // ← 改成 circle！
          defaultStart: "A",
        };
    }
      
    case "disconnected": {
      const nodes = ["A", "B", "C", "D", "E"];
      const edges = [
        { id: "A-B", source: "A", target: "B" },
        { id: "B-C", source: "B", target: "C" },
        { id: "D-E", source: "D", target: "E" },
      ];
      const elements: Ele[] = [
        ...nodes.map((id) => ({ data: { id, label: id } })),
        ...edges.map((e) => ({ data: e })),
      ];
      return { elements, directed: true, layout: { name: "breadthfirst" }, defaultStart: "A" };
    }
    case "undirected": {
      const nodes = ["A", "B", "C", "D", "E"];
      const edges = [
        { id: "A-B", source: "A", target: "B" },
        { id: "A-C", source: "A", target: "C" },
        { id: "B-D", source: "B", target: "D" },
        { id: "C-E", source: "C", target: "E" },
      ];
      const elements: Ele[] = [
        ...nodes.map((id) => ({ data: { id, label: id } })),
        ...edges.map((e) => ({ data: e })),
      ];
      return { elements, directed: false, layout: { name: "breadthfirst" }, defaultStart: "A" };
    }
    case "grid": {
      const nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
      const idx = (r: number, c: number) => r * 3 + c;
      const idAt = (r: number, c: number) => nodes[idx(r, c)];
      const edges: { id: string; source: string; target: string }[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (c + 1 < 3) {
            const u = idAt(r, c), v = idAt(r, c + 1);
            edges.push({ id: `${u}-${v}`, source: u, target: v });
          }
          if (r + 1 < 3) {
            const u = idAt(r, c), v = idAt(r + 1, c);
            edges.push({ id: `${u}-${v}`, source: u, target: v });
          }
        }
      }
      const elements: Ele[] = [
        ...nodes.map((id) => ({ data: { id, label: id } })),
        ...edges.map((e) => ({ data: e })),
      ];
      return { elements, directed: false, layout: { name: "grid", rows: 3, cols: 3 }, defaultStart: "A" };
    }
  }
};

// 队列气泡（带练习反馈描边）
const QueueBubble: React.FC<{
  label: string;
  isHead?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  flash?: boolean;
  highlight?: "correct" | "wrong" | null;
}> = ({ label, isHead, clickable, onClick, flash, highlight }) => {
  const baseBg = isHead ? "#e0e7ff" : "#f1f5f9";
  let border = "1px solid #cbd5e1";
  if (flash && highlight === "correct") border = "2px solid #22c55e";
  if (flash && highlight === "wrong") border = "2px solid #ef4444";
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border,
        background: baseBg,
        fontWeight: isHead ? 700 : 500,
        minWidth: 28,
        textAlign: "center",
        cursor: clickable ? "pointer" : "default",
        transition: "transform .12s, border-color .12s",
      }}
    >
      {label}
    </button>
  );
};

// ---------- 组件 ----------
const BfsDemo: React.FC = () => {
  // 图类型
  const [graphType, setGraphType] = useState<GraphType>("tree");

  // 当前图
  const initial = makeGraph("tree");
  const [elements, setElements] = useState<Ele[]>(initial.elements);
  const [directed, setDirected] = useState<boolean>(initial.directed);
  const [layoutSpec, setLayoutSpec] = useState(initial.layout);

  // BFS 状态
  const [startNode, setStartNode] = useState<string>(initial.defaultStart);
  const [queue, setQueue] = useState<string[]>([initial.defaultStart]);
  const [visited, setVisited] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);
  const [narration, setNarration] = useState<string>("Choose a graph and click Step/Play to run BFS.");
  const [parents, setParents] = useState<Record<string, string | null>>({});
  const [visitedEdges, setVisitedEdges] = useState<string[]>([]);
  

  // 播放控制
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepDelay, setStepDelay] = useState(600);
  const timerRef = useRef<number | null>(null);
  const cyRef = useRef<any>(null);

  // 练习模式
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [practicePhase, setPracticePhase] = useState<PracticePhase>("idle");
  // 阶段1（front）
  const [frontScore, setFrontScore] = useState(0);
  const [frontAttempts, setFrontAttempts] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [lastFrontCorrect, setLastFrontCorrect] = useState<boolean | null>(null);
  // 阶段2（enqueue）
  const [enqueueScore, setEnqueueScore] = useState(0);
  const [enqueueAttempts, setEnqueueAttempts] = useState(0);
  const [challengeCur, setChallengeCur] = useState<string | null>(null);
  const [enqueueOptions, setEnqueueOptions] = useState<string[]>([]);
  const [enqueueTargets, setEnqueueTargets] = useState<string[]>([]);
  const [enqueueGuess, setEnqueueGuess] = useState<string[]>([]);
  const [enqueueFeedback, setEnqueueFeedback] = useState<null | {
    correct: boolean;
    missing: string[];
    extra: string[];
  }>(null);
  const [autoApply, setAutoApply] = useState(false);
  // Task 闪烁控制
  const [taskFlash, setTaskFlash] = useState(false);

  // 所有节点 id
  const nodeIds = useMemo(
    () => elements.filter((el) => !el.data?.source).map((el) => el.data.id as string),
    [elements]
  );

  // 邻接表（考虑有向/无向）
  const adjacency = useMemo(() => {
    const adj: Record<string, string[]> = {};
    elements.forEach((el) => {
      if (el.data?.id && !el.data?.source) adj[el.data.id] = [];
    });
    elements.forEach((el) => {
      const d = el.data;
      if (d?.source && d?.target) {
        if (!adj[d.source]) adj[d.source] = [];
        adj[d.source].push(d.target);
        if (!directed) {
          if (!adj[d.target]) adj[d.target] = [];
          adj[d.target].push(d.source);
        }
      }
    });
    return adj;
  }, [elements, directed]);

 // ---------- 当切换图类型时 ----------
useEffect(() => {
    const spec = makeGraph(graphType);
    setElements(spec.elements);
    setDirected(spec.directed);
    setLayoutSpec(spec.layout);
  
    const nodes = spec.elements.filter((el) => !el.data?.source).map((el) => el.data.id as string);
    const nextStart = nodes.includes("A") ? "A" : (nodes[0] ?? "");
    setStartNode(nextStart);
  
    // 重置 BFS 状态
    setQueue(nextStart ? [nextStart] : []);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setVisitedEdges([]);
    setParents({});
    setNarration(`Graph: ${graphType}. Start from ${nextStart || "(none)"}. Click Step/Play to begin.`);
  
    // 关键改动：根据 layoutSpec.name 选择布局
    setTimeout(() => {
      if (!cyRef.current) return;
  
      let layout;
      if (spec.layout.name === "breadthfirst") {
        layout = cyRef.current.layout({
          name: "breadthfirst",
          directed: true,
          roots: nextStart ? `#${nextStart}` : undefined,
          padding: 20,
          spacingFactor: 1.3,
          animate: true,
        });
      } else if (spec.layout.name === "grid") {
        layout = cyRef.current.layout({
          name: "grid",
          rows: spec.layout.rows ?? undefined,
          cols: spec.layout.cols ?? undefined,
          padding: 20,
          animate: true,
        });
      } else if (spec.layout.name === "circle") {
        layout = cyRef.current.layout({
          name: "circle",
          padding: 20,
          animate: true,
        });
      }
  
      layout?.run();
      cyRef.current.fit();
    }, 0);
  }, [graphType]);
  

  // 单步 BFS
  const stepOnce = useCallback(() => {
    if (queue.length === 0) {
      setCurrent(null);
      setHighlightedEdges([]);
      setNarration("🎉 BFS complete. Queue: []");
      setPracticePhase("idle");
      return false;
    }

    const preQueue = [...queue];
    const cur = preQueue.shift()!;
    setCurrent(cur);
    setNarration(`Dequeued ${cur}. Visiting ${cur}...`);

    setTimeout(() => {
      let newVisited = visited;
      if (!visited.includes(cur)) {
        newVisited = [...visited, cur];
        setVisited(newVisited);
      }

      const neighbors = (adjacency[cur] ?? []).filter(
        (n) => !newVisited.includes(n) && !preQueue.includes(n)
      );
      // 发现邻居时记录它们的父亲 = 当前节点 cur（只在没记录过时）
      setParents(prev => {
        const next = { ...prev };
        neighbors.forEach(n => {
          if (!(n in next)) next[n] = cur;
        });
        return next;
      });
      const nextQueue = [...preQueue, ...neighbors];
      setQueue(nextQueue);

      const newEdges: string[] = [];
      neighbors.forEach((n) => {
        const edge =
          elements.find((el) => el.data?.source === cur && el.data?.target === n) ||
          elements.find((el) => el.data?.source === n && el.data?.target === cur);
        if (edge) newEdges.push(edge.data.id);
      });


      // 如果 cur 有父亲 p，则把 p→cur 这条边加入 visitedEdges（绿色）
      const p = parents[cur];
      if (p) {
        const edge =
          elements.find(el => el.data?.source === p && el.data?.target === cur) ||
          elements.find(el => el.data?.source === cur && el.data?.target === p); // 兼容无向
        if (edge) {
          setVisitedEdges(prev => (prev.includes(edge.data.id) ? prev : [...prev, edge.data.id]));
        }
      }

      // 更新红色边集合：保留所有通向未访问节点的边
      setHighlightedEdges((prev) => {
        // 把当前新发现的红边加入
        const combined = [...prev, ...newEdges];
        // 过滤掉那些“目标节点已经访问过”的红边
        const stillActive = combined.filter((edgeId) => {
          const edge = elements.find((el) => el.data?.id === edgeId);
          if (!edge) return false;
          const target = edge.data?.target;
          return !newVisited.includes(target); // 目标节点未访问 => 保留红色
        });
        return [...new Set(stillActive)];
      });
      

      if (nextQueue.length === 0) {
        setCurrent(null);
        setTimeout(() => setNarration("🎉 BFS complete."), 300);
        setPracticePhase("idle");
        return;
      }

      setCurrent(null);
      setNarration(
        `Visited ${cur}. Enqueued [${neighbors.length ? neighbors.join(", ") : "∅"}]. Queue: [${nextQueue.join(", ")}]`
      );
    }, 800);

    return true;
  }, [queue, visited, adjacency, elements]);


  // 自动播放
  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => {
    if (!isPlaying) return;
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      const cont = stepOnce();
      if (!cont) setIsPlaying(false);
    }, stepDelay) as unknown as number;
    return clearTimer;
  }, [isPlaying, queue, stepDelay, stepOnce]);

  useEffect(() => () => clearTimer(), []);

  // 加上 Task 闪烁的监听
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

  // ===== 练习模式：工具函数 =====
  const computeNextEnqueueTargets = useCallback(() => {
    if (queue.length === 0)
      return { cur: null as string | null, targets: [] as string[], options: [] as string[] };
    const cur = queue[0];
    const preQueue = queue.slice(1);
    const neighborAll = [...(adjacency[cur] ?? [])];
    const targets = neighborAll.filter(
      (n) => !visited.includes(n) && !preQueue.includes(n)
    );
    const options = nodeIds.filter((id) => id !== cur); // 除当前点以外的所有节点
    return { cur, targets, options };
  }, [queue, visited, adjacency, nodeIds]);

  // ===== 练习：阶段1（预测出队）=====
  const handlePredictFront = (guessId: string) => {
    if (!practiceEnabled || practicePhase !== "front") return;
    if (isPlaying) {
      setNarration("Pause Play to make a prediction.");
      return;
    }
    if (queue.length === 0) {
      setNarration("🎉 BFS complete.");
      return;
    }
    const correct = queue[0];

    setFrontAttempts((a) => a + 1);
    setLastFrontCorrect(guessId === correct);
    setFlashId(guessId);
    window.setTimeout(() => setFlashId(null), 600);

    if (guessId === correct) {
      setFrontScore((s) => s + 1);
      const { cur, targets, options } = computeNextEnqueueTargets();

      setNarration(
        `✅ Correct! Next dequeued node is ${correct}. Now, which neighbors will be enqueued? (may be ∅)`
      );
      setChallengeCur(cur);
      setEnqueueTargets(targets);
      setEnqueueOptions(options);
      setEnqueueGuess([]);
      setEnqueueFeedback(null);
      setPracticePhase("enqueue");
    } else {
      setNarration(`❌ Not quite. You chose ${guessId}, but the next is ${correct}.`);
    }
  };

  // ===== 练习：阶段2（预测入队集合）=====
  const toggleEnqueueGuess = (id: string) => {
    if (!practiceEnabled || practicePhase !== "enqueue") return;
    setEnqueueGuess((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitEnqueueGuess = () => {
    if (!practiceEnabled || practicePhase !== "enqueue") return;
    const setA = new Set(enqueueGuess);
    const setB = new Set(enqueueTargets);
    const extra = enqueueGuess.filter((x) => !setB.has(x));
    const missing = enqueueTargets.filter((x) => !setA.has(x));
    const correct = extra.length === 0 && missing.length === 0;

    setEnqueueAttempts((a) => a + 1);
    setEnqueueFeedback({ correct, extra, missing });

    if (correct) {
      setEnqueueScore((s) => s + 1);
      setNarration(
        `✅ Correct neighbors: [${enqueueTargets.join(", ") || "∅"}]. ` +
          (autoApply ? "Applying step..." : "Click Apply Step to execute and continue.")
      );
      if (autoApply) {
        setTimeout(() => applyPredictedStep(true), 200);
      }
    } else {
      const parts: string[] = [];
      if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
      if (extra.length) parts.push(`extra: ${extra.join(", ")}`);
      setNarration(`❌ Not quite — ${parts.join("; ")}.`);
    }
  };

  const applyPredictedStep = (fromAuto?: boolean) => {
    if (isPlaying) return;
    const ok = stepOnce();
    if (ok) {
      // 执行后，进入下一轮“预测出队”
      setPracticePhase(practiceEnabled ? "front" : "idle");
      setChallengeCur(null);
      setEnqueueOptions([]);
      setEnqueueTargets([]);
      setEnqueueGuess([]);
      setEnqueueFeedback(null);

      // 给出下一步提示（若未结束）
      setTimeout(() => {
        if (queue.length > 0) {
          setNarration((prev) =>
            fromAuto
              ? `${prev} Next question: which node will be dequeued next?`
              : `Step applied. What is the next dequeued node?`
          );
        }
      }, 10);
    }
  };

  // 控件
  const resetPractice = (spec?: GraphSpec, nextStart?: string) => {
    if (practiceEnabled) setPracticePhase("front");
    else setPracticePhase("idle");
    setFrontScore(0);
    setFrontAttempts(0);
    setLastFrontCorrect(null);
    setEnqueueScore(0);
    setEnqueueAttempts(0);
    setChallengeCur(null);
    setEnqueueOptions([]);
    setEnqueueTargets([]);
    setEnqueueGuess([]);
    setEnqueueFeedback(null);

    // 重新布局（可选）
    if (cyRef.current && (spec || layoutSpec)) {
      const s = nextStart ?? startNode;
      const lay =
        (spec?.layout.name ?? layoutSpec.name) === "breadthfirst"
          ? cyRef.current.layout({
              name: "breadthfirst",
              directed: true,
              roots: s ? `#${s}` : undefined,
              padding: 20,
              spacingFactor: 1.3,
              animate: true,
            })
          : cyRef.current.layout({
              name: "grid",
              rows: spec?.layout.rows ?? layoutSpec.rows,
              cols: spec?.layout.cols ?? layoutSpec.cols,
              padding: 20,
              animate: true,
            });
      lay.run();
      cyRef.current.fit();
    }
  };

  
  // const applyLayout = useCallback(
  //   (start?: string) => {
  //     setTimeout(() => {
  //       if (!cyRef.current) return;

  //       let layout;
  //       // 🧠 智能判断是否树形图（用于 roots 参数）
  //       const isTree = graphType === "tree";
  //       const isUndirected = graphType === "undirected" || graphType === "disconnected";

  //       if (layoutSpec.name === "breadthfirst") {
  //         layout = cyRef.current.layout({
  //           name: "breadthfirst",
  //           directed: true,
  //           roots: isTree ? (start ? `#${start}` : undefined) : undefined, // ✅ 非树图不强制指定 root
  //           direction: isTree ? "downward" : undefined, // ✅ 树向下展开
  //           circle: !isTree, // ✅ 非树图改为环形分布
  //           spacingFactor: 1.3,
  //           padding: 30,
  //           animate: true,
  //         });
  //       } else if (layoutSpec.name === "grid") {
  //         layout = cyRef.current.layout({
  //           name: "grid",
  //           rows: layoutSpec.rows,
  //           cols: layoutSpec.cols,
  //           padding: 20,
  //           animate: true,
  //         });
  //       } else if (layoutSpec.name === "circle") {
  //         layout = cyRef.current.layout({
  //           name: "circle",
  //           padding: 20,
  //           animate: false, // ✅ 去掉动画，防止“抖动”
  //         });
  //       } else {
  //         // 兜底：默认使用 concentric 布局
  //         layout = cyRef.current.layout({
  //           name: "concentric",
  //           padding: 30,
  //           animate: true,
  //         });
  //       }

  //       layout?.run();
  //       cyRef.current.fit();
  //     }, 50);
  //   },
  //   [layoutSpec, graphType]
  // );
  // 通用布局函数：根据 graphType 与 layoutSpec 智能选择布局参数
  // 
  const applyLayout = useCallback(
    (start?: string) => {
      setTimeout(() => {
        if (!cyRef.current) return;
  
        let layout;
        const isTree = graphType === "tree";
        const isUndirected =
          graphType === "undirected" || graphType === "disconnected";
        const isCyclic = graphType === "cyclic";
  
        if (isTree) {
          // 判断当前节点是否为“叶子节点”
          const neighbors = cyRef.current
            ?.nodes(`#${start}`)
            ?.connectedEdges()
            ?.length ?? 0;
          const isLeafRoot = neighbors <= 1; // 度数<=1，视为叶子
        
          layout = cyRef.current.layout({
            name: "breadthfirst",
            directed: true,
            roots: start ? `#${start}` : undefined,
            direction: isLeafRoot ? "upward" : "downward", // ✅ 如果起点是叶子，则反转布局方向
            spacingFactor: 1.4, // 稍微加大间距避免挤压
            padding: 40,
            avoidOverlap: true,
            animate: true,
          });
        }
        
        // 环形图：保持圆形
        else if (isCyclic) {
          layout = cyRef.current.layout({
            name: "circle",
            padding: 20,
            animate: false,
          });
        }
        // 无向或非连通图：使用 "cose" 布局（自然散开）
        else if (isUndirected) {
          layout = cyRef.current.layout({
            name: "cose", // “力导向”布局
            padding: 30,
            animate: true,
            nodeRepulsion: 8000, // 节点间距
            idealEdgeLength: 100,
            gravity: 0.25,
            numIter: 1000,
          });
        }
        // Grid 或其他
        else if (layoutSpec.name === "grid") {
          layout = cyRef.current.layout({
            name: "grid",
            rows: layoutSpec.rows,
            cols: layoutSpec.cols,
            padding: 20,
            animate: true,
          });
        }
        // 兜底 concentric
        else {
          layout = cyRef.current.layout({
            name: "concentric",
            padding: 30,
            animate: true,
          });
        }
  
        layout?.run();
        cyRef.current.fit();
      }, 50);
    },
    [layoutSpec, graphType]
  );
  


  const handleStart = () => {
    clearTimer();
    setIsPlaying(false);
  
    const s = nodeIds.includes("A") ? "A" : nodeIds[0] ?? "";
    setStartNode(s);
  
    setQueue(s ? [s] : []);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setVisitedEdges([]);
    setParents({ [s]: null });
    setNarration(`Ready. Starting from ${s || "(none)"}.`);
    resetPractice?.();
  
    applyLayout(s); // 调用通用布局函数
  };
    
  

  const handleStep = () => {
    if (isPlaying) return;
    // 手动 step：如果在练习中，回到 front 阶段
    setPracticePhase(practiceEnabled ? "front" : "idle");
    setChallengeCur(null);
    setEnqueueOptions([]);
    setEnqueueTargets([]);
    setEnqueueGuess([]);
    setEnqueueFeedback(null);
    stepOnce();
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
      setNarration((n) => `${n} (Paused)`);
    } else {
      // 播放时退出练习阶段，避免冲突
      setPracticePhase("idle");
      setChallengeCur(null);
      setEnqueueOptions([]);
      setEnqueueTargets([]);
      setEnqueueGuess([]);
      setEnqueueFeedback(null);
      setIsPlaying(true);
      setNarration((n) =>
        n.includes("Ready.") ? "Auto-playing..." : `${n} (Auto-playing...)`
      );
    }
  };

  const handleReset = () => {
    setVisitedEdges([]);
    setParents({ [startNode]: null });
    clearTimer();
    setIsPlaying(false);
    const s = nodeIds.includes("A") ? "A" : nodeIds[0] ?? "";
    setStartNode(s);
    setQueue(s ? [s] : []);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Reset. Start from ${s || "(none)"}.`);
    resetPractice();
    cyRef.current?.fit();
  };

  // 布局配置
  const layoutProp = useMemo(() => {
    if (layoutSpec.name === "grid") {
      return {
        name: "grid",
        rows: layoutSpec.rows,
        cols: layoutSpec.cols,
        padding: 20,
        animate: true,
      } as any;
    }
  
    if (layoutSpec.name === "circle") {
      return {
        name: "circle",
        padding: 10,
        animate: true,
      } as any;
    }
  
    // 默认 breadthfirst
    return {
      name: "breadthfirst",
      directed: true,
      // roots: startNode ? `#${startNode}` : undefined,
      roots: undefined,
      padding: 20,
      spacingFactor: 1.3,
      animate: true,
    } as any;
  // }, [layoutSpec, startNode]);
  }, [layoutSpec]);
  
  // 样式表
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
          if (current === id) return "#2563eb";
          if (visited.includes(id)) return "#22c55e";
          if (queue.includes(id)) return "#eab308";
          return "#9ca3af";
        },
        "border-width": 2,
        "border-color": "#ffffffaa",
        "transition-property": "background-color",
        "transition-duration": "200ms",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        label: "data(label)",
        "font-size": 10,
        "text-rotation": "autorotate",
        "text-margin-y": -6,
        // "line-color": (ele: any) =>
        //   highlightedEdges.includes(ele.id()) ? "#ef4444" : "#cbd5e1",
        // "target-arrow-color": (ele: any) =>
        //   highlightedEdges.includes(ele.id()) ? "#ef4444" : "#cbd5e1",
        
        "line-color": (ele: any) => {
        const id = ele.id();
        if (highlightedEdges.includes(id)) return "#ef4444"; // 当前步红色
        if (visitedEdges.includes(id)) return "#22c55e";     // 已走过绿色
        return "#cbd5e1";                                    // 默认灰色
      },
      "target-arrow-color": (ele: any) => {
        const id = ele.id();
        if (highlightedEdges.includes(id)) return "#ef4444";
        if (visitedEdges.includes(id)) return "#22c55e";
        return "#cbd5e1";
      },

        "target-arrow-shape": directed ? "triangle" : "none",
        "curve-style": "bezier",
      },
    },
  ];

  const isFinished = queue.length === 0;

  // UI
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh" }}>
      {/* 顶部栏 */}
      <div style={{ padding: 10, background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
        <b>Graph Algorithm Visualization — BFS</b>
      </div>

      {/* 主体 */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 320px", gap: 12, padding: 12 }}>
        {/* 左侧控制区 */}
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {/* 图选择器 */}
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Graph Type</div>
            <select
              value={graphType}
              onChange={(e) => setGraphType(e.target.value as GraphType)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="tree">Tree (Directed)</option>
              <option value="cyclic">Cyclic (Directed)</option>
              <option value="disconnected">Disconnected (Directed)</option>
              <option value="undirected case 1">Undirected</option>
              <option value="grid">Grid 3×3 (Undirected)</option>
            </select>
          </div>

          {/* 起点信息 */}
          <div style={{ fontSize: 13, color: "#334155" }}>
            <div>
              <b>Start node:</b>{" "}
              <span style={{ color: "#2563eb" }}>{startNode || "(none)"}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              Click any node on the graph to set it as the start
              {isPlaying && <span style={{ color: "#ef4444" }}> (pause first)</span>}
            </div>
          </div>

          {/* 控制按钮 */}
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <button onClick={handleStart} disabled={isPlaying} style={{ padding: "8px 12px" }}>
              Start
            </button>
            <button onClick={handleStep} disabled={isPlaying || isFinished} style={{ padding: "8px 12px" }}>
              Step
            </button>
            <button onClick={handlePlayToggle} disabled={isFinished} style={{ padding: "8px 12px" }}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => applyPredictedStep(false)}
              disabled={
                practicePhase !== "enqueue" ||
                (!!enqueueFeedback && !enqueueFeedback.correct)
              }
              style={{ padding: "8px 12px" }}
            >
              Apply Step
            </button>
            <button onClick={handleReset} style={{ padding: "8px 12px" }}>
              Reset
            </button>
          </div>

          {/* 速度调节 */}
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

          {/* 练习模式 */}
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, userSelect: "none" }}>
              <input
                type="checkbox"
                checked={practiceEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setPracticeEnabled(on);
                  setPracticePhase(on ? "front" : "idle");
                  setChallengeCur(null);
                  setEnqueueOptions([]);
                  setEnqueueTargets([]);
                  setEnqueueGuess([]);
                  setEnqueueFeedback(null);
                }}
                style={{ marginRight: 6 }}
              />
              Practice mode (predict dequeued → enqueued neighbors)
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Auto-apply step on correct
              </label>
            </div>

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
            >

              <b>Task:</b>{" "}
              {practicePhase === "front"
                ? "Predict the next dequeued node"
                : "Predict which neighbors will be enqueued"}
            </div>

            <div style={{ fontSize: 12, color: "#475569" }}>
              Front score: <b>{frontScore}</b> / {frontAttempts}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Enqueue score: <b>{enqueueScore}</b> / {enqueueAttempts}
            </div>

            {/* 阶段2面板 */}
            {practiceEnabled && practicePhase === "enqueue" && challengeCur && (
              <div style={{ marginTop: 6, padding: 8, border: "1px dashed #cbd5e1", borderRadius: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  Predict neighbors of <b>{challengeCur}</b> that will be <b>enqueued now</b>.
                  <div style={{ fontSize: 12, color: "#64748b" }}>(Choose from all nodes except the current one — possibly ∅)</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {enqueueOptions.map((id) => {
                    const selected = enqueueGuess.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleEnqueueGuess(id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: selected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          background: selected ? "#e0e7ff" : "#f8fafc",
                          cursor: "pointer",
                        }}
                      >
                        {id}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={submitEnqueueGuess} style={{ padding: "6px 10px" }}>
                    Check
                  </button>
                  <button
                    onClick={() => applyPredictedStep(false)}
                    disabled={!enqueueFeedback || !enqueueFeedback.correct}
                    style={{ padding: "6px 10px" }}
                  >
                    Apply Step
                  </button>
                </div>
                {enqueueFeedback && (
                  <div style={{ fontSize: 12, marginTop: 6, color: enqueueFeedback.correct ? "#16a34a" : "#b91c1c" }}>
                    {enqueueFeedback.correct ? (
                      <>✅ Correct: [{enqueueTargets.join(", ") || "∅"}].</>
                    ) : (
                      <>
                        ❌ Not quite.&nbsp;
                        {enqueueFeedback.missing.length > 0 && <>Missing: [{enqueueFeedback.missing.join(", ")}]. </>}
                        {enqueueFeedback.extra.length > 0 && <>Extra: [{enqueueFeedback.extra.join(", ")}].</>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 图区域 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <CytoscapeComponent
            elements={elements as any}
            layout={layoutProp}
            stylesheet={stylesheet as any}
            style={{ width: "100%", height: 520 }}
            cy={(cy) => {
              cyRef.current = cy;
              cy.fit();

              // 点击节点：练习或设置起点
              cy.off("tap", "node");
              // cy.on("tap", "node", (evt: any) => {
              //   const id = evt.target.id();
              //   if (isPlaying) {
              //     setNarration("Pause first to interact.");
              //     return;
              //   }
              //   if (practiceEnabled) {
              //     if (practicePhase === "front") {
              //       handlePredictFront(id);
              //       return;
              //     }
              //     if (practicePhase === "enqueue") {
              //       if (enqueueOptions.includes(id)) toggleEnqueueGuess(id);
              //       return;
              //     }
              //   }
              //   // 非练习：设置起点
              //   setStartNode(id);
              //   setQueue([id]);
              //   setVisited([]);
              //   setCurrent(null);
              //   setHighlightedEdges([]);
              //   setNarration(`Start node set to ${id}. Click Step/Play to begin.`);

              //   const lay =
              //     layoutSpec.name === "breadthfirst"
              //       ? cy.layout({
              //           name: "breadthfirst",
              //           directed: true,
              //           roots: [`#${id}`],
              //           padding: 20,
              //           spacingFactor: 1.3,
              //           avoidOverlap: true,
              //           animate: true,
              //         })
              //       : cy.layout({
              //           name: "grid",
              //           rows: layoutSpec.rows,
              //           cols: layoutSpec.cols,
              //           padding: 20,
              //           animate: true,
              //         });
              //   lay.run();
              //   cy.fit();

              //   // 重置练习状态
              //   resetPractice();
              // });
              cy.on("tap", "node", (evt: any) => {
                const id = evt.target.id();
              
                if (isPlaying) {
                  setNarration("Pause first to interact.");
                  return;
                }
              
                // 练习模式
                if (practiceEnabled) {
                  if (practicePhase === "front") return handlePredictFront(id);
                  if (practicePhase === "enqueue" && enqueueOptions.includes(id))
                    return toggleEnqueueGuess(id);
                }
              
                // // 普通模式
                // setStartNode(id);
                // setQueue([id]);
                // setVisited([]);
                // setCurrent(null);
                // setHighlightedEdges([]);
                // setNarration(`Start node set to ${id}. Click Step/Play to begin.`);
                // resetPractice();
                // ✅ 清除 BFS 状态与颜色
                setVisited([]);
                setHighlightedEdges([]);
                setVisitedEdges([]); // ✅ 清空绿色线条
                setParents({});      // ✅ 清空父子关系

                // 普通模式
                setStartNode(id);
                setQueue([id]);
                setCurrent(null);
                setNarration(`Start node set to ${id}. Click Step/Play to begin.`);
                resetPractice();

                // 不再重新布局
                cy.fit(cy.$(`#${id}`), 100);


                // cy.fit();
              });
              
              
            }}
          />
        </div>

        {/* 右侧状态 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h4 style={{ margin: "6px 0 10px" }}>Queue</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {queue.length ? (
              queue.map((q, idx) => {
                const clickable = practiceEnabled && !isPlaying && !isFinished && practicePhase === "front";
                const isFlash = flashId === q;
                const flashType =
                  isFlash && lastFrontCorrect != null
                    ? lastFrontCorrect
                      ? "correct"
                      : "wrong"
                    : null;

                return (
                  <React.Fragment key={`${q}-${idx}`}>
                    {idx === 0 && (
                      <span style={{ fontSize: 12, color: "#64748b", marginRight: 4 }}>front</span>
                    )}
                    <QueueBubble
                      label={q}
                      isHead={idx === 0}
                      clickable={clickable}
                      onClick={() => handlePredictFront(q)}
                      flash={isFlash}
                      highlight={flashType as any}
                    />
                    {idx < queue.length - 1 && <span style={{ opacity: 0.5 }}>→</span>}
                  </React.Fragment>
                );
              })
            ) : (
              <span style={{ color: "#94a3b8" }}>(empty)</span>
            )}
          </div>

          <h4 style={{ margin: "16px 0 6px" }}>Visited</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {visited.length ? (
              visited.map((v) => <QueueBubble key={v} label={v} />)
            ) : (
              <span style={{ color: "#94a3b8" }}>(none)</span>
            )}
          </div>

          <h4 style={{ margin: "16px 0 6px" }}>Current</h4>
          <div>{current ?? <span style={{ color: "#94a3b8" }}>(none)</span>}</div>

          {/* ===== 颜色解读 ===== */}
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

          {/* BFS Algorithm Explanation */}
          {/* BFS Algorithm Explanation */}
          <div
            style={{
              marginTop: 24,
              padding: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#f9fafb",
            }}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>BFS Algorithm Explanation</h4>
            <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
              <p>
                <b>Breadth-First Search (BFS)</b> explores the graph level by level:
              </p>
              <ol style={{ marginLeft: 16, paddingLeft: 8 }}>
                <li>Start from the selected node and enqueue it.</li>
                <li>While the queue is not empty:</li>
                <ul style={{ marginLeft: 16 }}>
                  <li>Dequeue the front node and visit it.</li>
                  <li>Enqueue all its unvisited neighbors.</li>
                </ul>
                <li>Repeat until all reachable nodes are visited.</li>
              </ol>
              <p style={{ marginTop: 8, color: "#64748b" }}>
                The queue ensures nodes are processed in order of discovery,
                forming a shortest-path tree in unweighted graphs.
              </p>
              <p style={{ marginTop: 8 }}>
                📖 Learn more on{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Breadth-first_search"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#2563eb",
                    textDecoration: "underline",
                    fontWeight: 500,
                  }}
                >
                  Wikipedia – Breadth-first search
                </a>
                .
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* Narration */}
      <div style={{ background: "#f9fafb", padding: 10, borderTop: "1px solid #e5e7eb" }}>
        {narration}
      </div>
    </div>
  );
};

export default BfsDemo;

