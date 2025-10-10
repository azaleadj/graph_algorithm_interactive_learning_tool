import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CytoscapeComponent from "react-cytoscapejs";

type Ele = { data: any; position?: { x: number; y: number } };

const BfsDemo: React.FC = () => {
  // ===== 图元素 =====
  const elements: Ele[] = [
    { data: { id: "A", label: "A" } },
    { data: { id: "B", label: "B" } },
    { data: { id: "C", label: "C" } },
    { data: { id: "D", label: "D" } },
    { data: { id: "E", label: "E" } },
    { data: { id: "F", label: "F" } },
    { data: { id: "A-B", source: "A", target: "B" } },
    { data: { id: "A-C", source: "A", target: "C" } },
    { data: { id: "B-D", source: "B", target: "D" } },
    { data: { id: "B-E", source: "B", target: "E" } },
    { data: { id: "C-F", source: "C", target: "F" } },
  ];

  // ===== 邻接表（从 elements 推导）=====
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
      }
    });
    return adj;
  }, [elements]);

  // ===== 起点（可点击选择）+ BFS 状态 =====
  const [startNode, setStartNode] = useState<string>("A");
  const [queue, setQueue] = useState<string[]>([startNode]);
  const [visited, setVisited] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);
  const [narration, setNarration] = useState(
    "Click a node to choose a start, then Step/Play."
  );

  // 播放控制
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepDelay, setStepDelay] = useState(600); // ms/步

  // === 练习（预测下一步）状态 ===
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastGuess, setLastGuess] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // 为了给队列气泡短暂的视觉反馈
  const [flashId, setFlashId] = useState<string | null>(null);

  // 计时器 & Cytoscape 引用
  const timerRef = useRef<number | null>(null);
  const cyRef = useRef<any>(null);

  // ===== 单步逻辑（支持“蓝色停留→变绿”）=====
  const stepOnce = useCallback(() => {
    if (queue.length === 0) {
      setCurrent(null);
      setHighlightedEdges([]);
      setNarration("BFS complete. Queue: []");
      return false;
    }

    // 出队当前
    const preQueue = [...queue];
    const cur = preQueue.shift()!;
    setCurrent(cur);
    setNarration(`Dequeued ${cur}. Visiting ${cur}...`);

    // 蓝色停留（访问中）
    setTimeout(() => {
      let newVisited = visited;
      if (!visited.includes(cur)) {
        newVisited = [...visited, cur];
        setVisited(newVisited);
      }

      // 仅将未访问且不在 preQueue 中的邻居入队
      const neighbors = (adjacency[cur] ?? []).filter(
        (n) => !newVisited.includes(n) && !preQueue.includes(n)
      );
      const nextQueue = [...preQueue, ...neighbors];
      setQueue(nextQueue);

      // 高亮“cur -> 入队邻居”的边
      const newEdges: string[] = [];
      neighbors.forEach((n) => {
        const edge = elements.find(
          (el) => el.data?.source === cur && el.data?.target === n
        );
        if (edge) newEdges.push(edge.data.id);
      });
      setHighlightedEdges(newEdges);

      setNarration(
        `Visited ${cur}. Enqueued [${neighbors.length ? neighbors.join(", ") : "∅"}]. Queue: [${nextQueue.join(", ")}]`
      );

      // 如果队列空了，稍后清空 current 并宣布完成
      if (nextQueue.length === 0) {
        setTimeout(() => {
          setCurrent(null);
          setNarration("BFS complete.");
        }, 500);
        return;
      }

      // 结束本步访问
      setCurrent(null);
    }, 800); // 蓝色停留时间

    return true;
  }, [queue, visited, adjacency, elements]);

  // ===== 用户预测下一步（猜测将要出队的节点）=====
  const handlePredict = (guessId: string) => {
    if (!practiceEnabled) return;
    if (isPlaying) {
      setNarration("Pause or stop Play to make a prediction.");
      return;
    }
    if (queue.length === 0) {
      setNarration("BFS complete. No next node to predict.");
      return;
    }

    const correct = queue[0];
    setAttempts((a) => a + 1);
    setLastGuess(guessId);
    setLastCorrect(guessId === correct);

    // 短暂闪烁反馈
    setFlashId(guessId);
    window.setTimeout(() => setFlashId(null), 600);

    if (guessId === correct) {
      setScore((s) => s + 1);
      setNarration(`✅ Correct! Next dequeued node is ${correct}.`);
    } else {
      setNarration(`❌ Not quite. You chose ${guessId}, but the next is ${correct}.`);
    }
  };

  // ===== setTimeout 调度自动播放（避免旧闭包）=====
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

  useEffect(() => {
    return () => clearTimer();
  }, []);

  // ===== 起点变化时：重置 BFS 并重排布局 =====
  useEffect(() => {
    // 仅在非播放时允许切换
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Start node set to ${startNode}. Click Step/Play to begin.`);

    // 切换起点时，重置练习反馈与分数（可按需保留）
    setScore(0);
    setAttempts(0);
    setLastGuess(null);
    setLastCorrect(null);

    // 重新按起点布局
    if (cyRef.current) {
      const layout = cyRef.current.layout({
        name: "breadthfirst",
        directed: true,
        roots: `#${startNode}`,
        padding: 20,
        spacingFactor: 1.3,
        animate: true,
      });
      layout.run();
      cyRef.current.fit();
    }
  }, [startNode]);

  // ===== 控件处理 =====
  const handleStart = () => {
    clearTimer();
    setIsPlaying(false);
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Ready. Starting from ${startNode}.`);
    // 重置预测统计
    setScore(0);
    setAttempts(0);
    setLastGuess(null);
    setLastCorrect(null);
    cyRef.current?.fit();
  };

  const handleStep = () => {
    if (isPlaying) return;
    stepOnce();
  };

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

  const handleReset = () => {
    clearTimer();
    setIsPlaying(false);
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Reset. Start from ${startNode}.`);
    // 重置预测统计
    setScore(0);
    setAttempts(0);
    setLastGuess(null);
    setLastCorrect(null);
    cyRef.current?.fit();
  };

  // ===== 布局 & 样式 =====
  const baseLayout = useMemo(
    () => ({
      name: "breadthfirst",
      directed: true,
      roots: `#${startNode}`,
      padding: 20,
      spacingFactor: 1.3,
      animate: true,
    }),
    [startNode]
  );

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
          if (current === id) return "#2563eb"; // 当前：蓝
          if (visited.includes(id)) return "#22c55e"; // 已访问：绿
          if (queue.includes(id)) return "#eab308"; // 队列：琥珀
          return "#9ca3af"; // 其他：灰
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
        "line-color": (ele: any) =>
          highlightedEdges.includes(ele.id()) ? "#ef4444" : "#cbd5e1",
        "target-arrow-color": (ele: any) =>
          highlightedEdges.includes(ele.id()) ? "#ef4444" : "#cbd5e1",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];

  // ===== 队列气泡（增加可点击预测时的视觉反馈）=====
  const QueueBubble = ({
    label,
    isHead,
    clickable,
    onClick,
    flash,
    correct,
  }: {
    label: string;
    isHead?: boolean;
    clickable?: boolean;
    onClick?: () => void;
    flash?: boolean;           // 是否闪烁
    correct?: boolean | null;  // 上一次是否正确（仅用于被点击的那个气泡）
  }) => {
    const baseBg = isHead ? "#e0e7ff" : "#f1f5f9";
    let outline = "1px solid #cbd5e1";
    if (flash && correct === true) outline = "2px solid #22c55e";
    if (flash && correct === false) outline = "2px solid #ef4444";

    return (
      <button
        onClick={onClick}
        disabled={!clickable}
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: outline,
          background: baseBg,
          fontWeight: isHead ? 700 : 500,
          minWidth: 28,
          textAlign: "center",
          cursor: clickable ? "pointer" : "default",
          opacity: clickable ? 1 : 0.9,
          transition: "transform .12s, border-color .12s",
        }}
      >
        {label}
      </button>
    );
  };

  const isFinished = queue.length === 0;

  // ===== UI =====
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh" }}>
      {/* 顶部栏 */}
      <div style={{ padding: 10, background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
        <b>Graph Algorithm Visualization — BFS</b>
      </div>

      {/* 主体 */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 260px", gap: 12, padding: 12 }}>
        {/* 控制区 */}
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ fontSize: 13, color: "#334155" }}>
            <div><b>Start node:</b> <span style={{ color: "#2563eb" }}>{startNode}</span></div>
            <div style={{ marginTop: 4 }}>
              👉 Click any node on the graph to set it as the start
              {isPlaying && <span style={{ color: "#ef4444" }}> (pause first)</span>}
            </div>
          </div>

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
            <button onClick={handleReset} style={{ padding: "8px 12px" }}>
              Reset
            </button>
          </div>

          {/* 练习开关 + 计分板 */}
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, userSelect: "none" }}>
              <input
                type="checkbox"
                checked={practiceEnabled}
                onChange={(e) => setPracticeEnabled(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Practice: predict next dequeued node
            </label>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Score: <b>{score}</b> / {attempts}{attempts>0 ? ` (${Math.round((score/Math.max(1,attempts))*100)}%)` : ""}
            </div>
            {lastGuess && lastCorrect !== null && (
              <div style={{ fontSize: 12, color: lastCorrect ? "#16a34a" : "#b91c1c" }}>
                {lastCorrect ? "✅ Correct" : "❌ Wrong"} — You chose {lastGuess}, {lastCorrect ? "nice!" : "try again!"}
              </div>
            )}
          </div>

        </div>

        {/* 图 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <CytoscapeComponent
            elements={elements as any}
            layout={baseLayout}
            stylesheet={stylesheet as any}
            style={{ width: "100%", height: 480 }}
            cy={(cy) => {
              cyRef.current = cy;
              cy.fit();

              // 点击节点选择起点
              cy.off("tap", "node"); // 避免重复绑定
              cy.on("tap", "node", (evt: any) => {
                const id = evt.target.id();
                if (isPlaying) {
                  setNarration("Pause first to change start node.");
                  return;
                }
                if (practiceEnabled) {
                  // 预测入口（可选：也允许在图上点节点来猜）
                  handlePredict(id);
                } else {
                  // 正常：改起点
                  setStartNode(id);
                }
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
                const clickable = practiceEnabled && !isPlaying && !isFinished;
                const isFlash = flashId === q;
                const isCorrect = lastCorrect ?? null;
                return (
                  <React.Fragment key={`${q}-${idx}`}>
                    {idx === 0 && (
                      <span style={{ fontSize: 12, color: "#64748b", marginRight: 4 }}>front</span>
                    )}
                    <QueueBubble
                      label={q}
                      isHead={idx === 0}
                      clickable={clickable}
                      onClick={() => handlePredict(q)}
                      flash={isFlash}
                      correct={isFlash ? isCorrect : null}
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

