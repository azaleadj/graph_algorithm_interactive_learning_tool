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
  // ===== 1) 图元素 =====
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

  // ===== 2) 邻接表（从 elements 推导，避免手写不同步）=====
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

  // ===== 3) BFS 状态 =====
  const [queue, setQueue] = useState<string[]>(["A"]);
  const [visited, setVisited] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);
  const [narration, setNarration] = useState("Click 'Start' or 'Step' to begin.");

  // 播放控制
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepDelay, setStepDelay] = useState(600); // ms/步

  // 计时器 & Cytoscape 引用
  const timerRef = useRef<number | null>(null);
  const cyRef = useRef<any>(null);

  // ===== 4) 单步逻辑（useCallback 确保拿到最新状态）=====
  const stepOnce = useCallback(() => {
    if (queue.length === 0) {
      setCurrent(null);
      setHighlightedEdges([]);
      setNarration("BFS complete. Queue: []");
      return false;
    }
  
    // 出队一个节点
    const preQueue = [...queue];
    const cur = preQueue.shift()!;
    setCurrent(cur);
  
    // 更新叙述：当前节点访问中
    setNarration(`Dequeued ${cur}. Visiting ${cur}...`);
  
    // 🔵 1. 让当前节点停留为蓝色 1 秒，然后再执行访问逻辑
    setTimeout(() => {
      let newVisited = visited;
      if (!visited.includes(cur)) {
        newVisited = [...visited, cur];
        setVisited(newVisited);
      }
  
      // 邻居入队
      const neighbors = (adjacency[cur] ?? []).filter(
        (n) => !newVisited.includes(n) && !preQueue.includes(n)
      );
      const nextQueue = [...preQueue, ...neighbors];
      setQueue(nextQueue);
  
      // 高亮当前 -> 入队 的边
      const newEdges: string[] = [];
      neighbors.forEach((n) => {
        const edge = elements.find(
          (el) => el.data?.source === cur && el.data?.target === n
        );
        if (edge) newEdges.push(edge.data.id);
      });
      setHighlightedEdges(newEdges);
  
      // 更新叙述
      setNarration(
        `Visited ${cur}. Enqueued [${neighbors.length ? neighbors.join(", ") : "∅"}]. Queue: [${nextQueue.join(", ")}]`
      );
  
      // 🟢 2. 如果这是最后一个节点，延时后变绿 + 清空 current
      if (nextQueue.length === 0) {
        setTimeout(() => {
          setCurrent(null);
          setNarration("BFS complete.");
        }, 500); // 绿色显示后再结束
        return;
      }
  
      // 更新 current 为 null（蓝色结束）
      setCurrent(null);
    }, 800); // 蓝色停留时间 800ms
  
    return true;
  }, [queue, visited, adjacency, elements]);
  
  

  // ===== 5) 计时器管理：用 setTimeout + useEffect 自递归，避免旧闭包 =====
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

  // 卸载清理
  useEffect(() => {
    return () => clearTimer();
  }, []);

  // ===== 6) 控件处理 =====
  const handleStart = () => {
    clearTimer();
    setIsPlaying(false);
    setQueue(["A"]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration("Ready. Starting from A.");
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
    setQueue(["A"]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration("Reset to start from A.");
    cyRef.current?.fit();
  };

  // ===== 7) 布局 & 样式 =====
  const layout = {
    name: "breadthfirst",
    directed: true,
    roots: "#A",
    padding: 20,
    spacingFactor: 1.3,
    animate: true,
  };

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
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": (ele: any) =>
          highlightedEdges.includes(ele.id()) ? "#ef4444" : "#9ca3af",
        "target-arrow-color": (ele: any) =>
          highlightedEdges.includes(ele.id()) ? "#ef4444" : "#9ca3af",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];

  // ===== 8) 队列气泡组件 =====
  const QueueBubble = ({ label, isHead }: { label: string; isHead?: boolean }) => (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #cbd5e1",
        background: isHead ? "#e0e7ff" : "#f1f5f9",
        fontWeight: isHead ? 700 : 500,
        minWidth: 28,
        textAlign: "center",
        transition: "transform .15s",
      }}
    >
      {label}
    </div>
  );

  const isFinished = queue.length === 0;

  // ===== 9) UI =====
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh" }}>
      {/* 顶部栏 */}
      <div style={{ padding: 10, background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
        <b>Graph Algorithm Visualization — BFS</b>
      </div>

      {/* 主体 */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 260px", gap: 12, padding: 12 }}>
        {/* 控制区 */}
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ display: "grid", gap: 8 }}>
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

          {/* Legend */}
          <div style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
            <div>Legend</div>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#2563eb", marginRight: 8 }} /> Current</div>
              <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#eab308", marginRight: 8 }} /> In Queue</div>
              <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#22c55e", marginRight: 8 }} /> Visited</div>
              <div><span style={{ display: "inline-block", width: 12, height: 2, background: "#ef4444", marginRight: 8, verticalAlign: "middle" }} /> Enqueued edges</div>
            </div>
          </div>
        </div>

        {/* 图 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <CytoscapeComponent
            elements={elements as any}
            layout={layout}
            stylesheet={stylesheet as any}
            style={{ width: "100%", height: 480 }}
            cy={(cy) => {
              cyRef.current = cy;
              cy.fit();
            }}
          />
        </div>

        {/* 右侧状态 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h4 style={{ margin: "6px 0 10px" }}>Queue</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {queue.length ? (
              queue.map((q, idx) => (
                <React.Fragment key={`${q}-${idx}`}>
                  {idx === 0 && (
                    <span style={{ fontSize: 12, color: "#64748b", marginRight: 4 }}>front</span>
                  )}
                  <QueueBubble label={q} isHead={idx === 0} />
                  {idx < queue.length - 1 && <span style={{ opacity: 0.5 }}>→</span>}
                </React.Fragment>
              ))
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
