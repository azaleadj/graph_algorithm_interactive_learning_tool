import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CytoscapeComponent from "react-cytoscapejs";

type Ele = { data: any; position?: { x: number; y: number } };
type PracticePhase = "idle" | "front" | "enqueue";

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

  // 所有“节点 id”列表
  const nodeIds = useMemo(
    () => elements.filter(el => !el.data?.source).map(el => el.data.id as string),
    [elements]
  );

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

  // ===== 练习（两阶段） =====
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [practicePhase, setPracticePhase] = useState<PracticePhase>("idle");

  // 阶段1（预测出队）
  const [frontScore, setFrontScore] = useState(0);
  const [frontAttempts, setFrontAttempts] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [lastFrontCorrect, setLastFrontCorrect] = useState<boolean | null>(null);

  // 阶段2（预测入队）
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

  // 练习：答对是否自动执行一步
  const [autoApply, setAutoApply] = useState(false);

  // 计时器 & Cytoscape 引用
  const timerRef = useRef<number | null>(null);
  const cyRef = useRef<any>(null);

  // ===== 单步逻辑（支持“蓝色停留→变绿”）=====
  const stepOnce = useCallback(() => {
    if (queue.length === 0) {
      setCurrent(null);
      setHighlightedEdges([]);
      setNarration("🎉 Congratulations! BFS complete.");
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
      const nextQueue = [...preQueue, ...neighbors];
      setQueue(nextQueue);

      const newEdges: string[] = [];
      neighbors.forEach((n) => {
        const edge = elements.find(
          (el) => el.data?.source === cur && el.data?.target === n
        );
        if (edge) newEdges.push(edge.data.id);
      });
      setHighlightedEdges(newEdges);

      if (nextQueue.length === 0) {
        setCurrent(null);
        setTimeout(() => {
          setNarration("🎉 Congratulations! BFS complete.");
          // 练习结束
          setPracticePhase("idle");
        }, 300);
        return;
      }

      setCurrent(null);
      setNarration(
        `Visited ${cur}. Enqueued [${neighbors.length ? neighbors.join(", ") : "∅"}]. Queue: [${nextQueue.join(", ")}]`
      );
    }, 800);

    return true;
  }, [queue, visited, adjacency, elements]);

  // === 工具：若现在出队 front，将入队哪些邻居（并给出“除了当前点以外的所有节点”作为候选）
  const computeNextEnqueueTargets = useCallback(() => {
    if (queue.length === 0)
      return { cur: null as string | null, targets: [] as string[], options: [] as string[] };
    const cur = queue[0];
    const preQueue = queue.slice(1);
    const neighborAll = [...(adjacency[cur] ?? [])];
    const targets = neighborAll.filter(
      (n) => !visited.includes(n) && !preQueue.includes(n)
    ); // 真正会入队的集合
    const options = nodeIds.filter(id => id !== cur); // ★ 需求：列出除了当前点的所有节点
    return { cur, targets, options };
  }, [queue, visited, adjacency, nodeIds]);

  // ===== 预测：阶段1（出队 front）=====
  const handlePredictFront = (guessId: string) => {
    if (!practiceEnabled || practicePhase !== "front") return;
    if (isPlaying) {
      setNarration("Pause Play to make a prediction.");
      return;
    }
    if (queue.length === 0) {
      setNarration("🎉 Congratulations! BFS complete.");
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

      // 进入阶段2（即使 targets 为空，也让学生“提交空集”为正确答案）
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

  // ===== 预测：阶段2（入队集合）=====
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
          setNarration(prev =>
            fromAuto
              ? `${prev} Next question: which node will be dequeued next?`
              : `Step applied. What is the next dequeued node?`
          );
        }
      }, 10);
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
      setNarration("🎉 Congratulations! BFS complete.");
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
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Start node set to ${startNode}. Click Step/Play to begin.`);

    // 重置练习状态
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
  }, [startNode, practiceEnabled]);

  // ===== 控件处理 =====
  const handleStart = () => {
    clearTimer();
    setIsPlaying(false);
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Ready. Starting from ${startNode}.`);

    // 重置练习计分与阶段
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

    cyRef.current?.fit();
  };

  const handleStep = () => {
    if (isPlaying) return;
    // 手动 step：练习阶段回到 front
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
      // 播放时退出练习阶段
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
    clearTimer();
    setIsPlaying(false);
    setQueue([startNode]);
    setVisited([]);
    setCurrent(null);
    setHighlightedEdges([]);
    setNarration(`Reset. Start from ${startNode}.`);

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

  // ===== 队列气泡（预测时可点击 + 闪烁反馈）=====
  const QueueBubble = ({
    label,
    isHead,
    clickable,
    onClick,
    flash,
    highlight,
  }: {
    label: string;
    isHead?: boolean;
    clickable?: boolean;
    onClick?: () => void;
    flash?: boolean;
    highlight?: "correct" | "wrong" | null;
  }) => {
    const baseBg = isHead ? "#e0e7ff" : "#f1f5f9";
    let outline = "1px solid #cbd5e1";
    if (flash && highlight === "correct") outline = "2px solid #22c55e";
    if (flash && highlight === "wrong") outline = "2px solid #ef4444";

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
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 280px", gap: 12, padding: 12 }}>
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

          {/* 练习开关 + 计分板 */}
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

            {/* Auto-apply 选项 */}
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

            {/* 阶段 & 计分 */}
            <div style={{ display: "grid", gap: 8 }}>
              {/* 高亮任务块 */}
              <div
                style={{
                  background: "#eef2ff",          // 淡紫蓝背景
                  borderLeft: "4px solid #6366f1",// 蓝紫色左边框
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 15,
                  color: "#1e3a8a",               // 深蓝字
                  fontWeight: 600,
                  marginBottom: 10,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <b>Task:</b>{" "}
                {practicePhase === "front"
                  ? "Predict the next dequeued node"
                  : "Predict which neighbors will be enqueued"}
              </div>

              {/* 计分行 */}
              <div style={{ fontSize: 12, color: "#475569" }}>
                Front score: <b>{frontScore}</b> / {frontAttempts}
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Enqueue score: <b>{enqueueScore}</b> / {enqueueAttempts}
              </div>
            </div>


            {/* 阶段2 面板 */}
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

              // 点击节点：练习 or 设置起点
              cy.off("tap", "node");
              cy.on("tap", "node", (evt: any) => {
                const id = evt.target.id();
                if (isPlaying) {
                  setNarration("Pause first to interact.");
                  return;
                }
                if (practiceEnabled) {
                  if (practicePhase === "front") {
                    handlePredictFront(id);
                    return;
                  }
                  if (practicePhase === "enqueue") {
                    if (enqueueOptions.includes(id)) toggleEnqueueGuess(id);
                    return;
                  }
                }
                setStartNode(id);
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
                const clickable =
                  practiceEnabled && !isPlaying && !isFinished && practicePhase === "front";
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
                      highlight={flashType}
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

