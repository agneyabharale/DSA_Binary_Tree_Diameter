import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { analyze, maxDepth, type TreeNode } from './tree';
import { CPP_LINES, generateExecutionTrace, type ExecutionEvent } from './execution';

function placeTree(root: TreeNode | null) {
  const nodes: { node: TreeNode; x: number; y: number }[] = [], edges: { from: string; to: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  const leafCount = (n: TreeNode | null): number => !n ? 0 : !n.left && !n.right ? 1 : leafCount(n.left) + leafCount(n.right);
  const gap = 60, row = 78, leaves = leafCount(root), width = Math.max(320, (leaves - 1) * gap + 100), firstLeaf = (width - (leaves - 1) * gap) / 2;
  let leafIndex = 0;
  const points = new Map<string, { node: TreeNode; x: number; y: number }>();
  const visit = (n: TreeNode | null, depth: number): { node: TreeNode; x: number; y: number } | null => {
    if (!n) return null;
    const left = visit(n.left, depth + 1), right = visit(n.right, depth + 1);
    const x = left && right ? (left.x + right.x) / 2 : left?.x ?? right?.x ?? firstLeaf + leafIndex++ * gap;
    const point = { node: n, x, y: 42 + depth * row };
    points.set(n.id, point); nodes.push(point); return point;
  };
  visit(root, 0);
  for (const p of points.values()) for (const child of [p.node.left, p.node.right]) {
    if (!child) continue; const c = points.get(child.id)!;
    edges.push({ from: p.node.id, to: child.id, x1: p.x, y1: p.y + 19, x2: c.x, y2: c.y - 19 });
  }
  return { nodes, edges, width, height: Math.max(140, 90 + maxDepth(root) * row) };
}
function CodeLine({ text }: { text: string }) {
  const tokens = text.split(/(\b(?:int|max|return|if|nullptr)\b|\b(?:diameter|height|leftHeight|rightHeight|root)\b|\d+)/g);
  return <>{tokens.map((token, i) => <span key={i} className={/^(int|max|return|if|nullptr)$/.test(token) ? 'cpp-keyword' : /^(diameter|height|leftHeight|rightHeight|root)$/.test(token) ? 'cpp-variable' : /^\d+$/.test(token) ? 'cpp-number' : ''}>{token || ' '}</span>)}</>;
}

export default function LiveExecutionLab({ tree }: { tree: TreeNode | null }) {
  const events = useMemo(() => generateExecutionTrace(tree), [tree]);
  const result = useMemo(() => analyze(tree), [tree]);
  const layout = useMemo(() => placeTree(tree), [tree]);
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(700), [copied, setCopied] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const current: ExecutionEvent | undefined = events[index];
  const complete = index === events.length - 1;
  useEffect(() => { setIndex(0); setPlaying(false); }, [tree, events.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex(i => {
      if (i >= events.length - 1) { setPlaying(false); return i; }
      return i + 1;
    }), speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, speed, events.length]);
  useEffect(() => {
    const editor = editorRef.current, line = activeLineRef.current;
    if (!editor || !line) return;
    const box = editor.getBoundingClientRect(), row = line.getBoundingClientRect();
    if (row.top < box.top) editor.scrollTo({ top: editor.scrollTop - (box.top - row.top), behavior: 'smooth' });
    else if (row.bottom > box.bottom) editor.scrollTo({ top: editor.scrollTop + (row.bottom - box.bottom), behavior: 'smooth' });
  }, [current?.line]);
  const visited = new Set(events.slice(0, index + 1).map(e => e.activeId).filter((id): id is string => !!id));
  const copy = async () => { try { await navigator.clipboard.writeText(CPP_LINES.join('\n')); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { setCopied(false); } };
  const restart = () => { setPlaying(false); setIndex(0); };

  return <section className="section live-execution wrap" id="live-execution">
    <div className="section-kicker"><span>04 / LIVE C++ EXECUTION</span><span className="rule"/><span className="kicker-note">INSTRUMENTED C++ TRACE</span></div>
    <div className="section-head live-execution-heading"><div><h2>Watch the Algorithm<br/><em>Think.</em></h2></div><p>Every recursive call. Every height. Every decision. Follow the code as it executes.</p></div>
    <div className="execution-controls panel">
      <div className="execution-buttons">
        <button title="Restart" onClick={restart}><RotateCcw size={15}/></button>
        <button title="Previous step" disabled={index <= 0} onClick={() => { setPlaying(false); setIndex(i => Math.max(0, i - 1)); }}><SkipBack size={16}/></button>
        <button className="execution-play" onClick={() => { if (complete) setIndex(0); setPlaying(p => !p); }}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'Pause' : 'Play'}</button>
        <button title="Next step" disabled={complete} onClick={() => { setPlaying(false); setIndex(i => Math.min(events.length - 1, i + 1)); }}><SkipForward size={16}/></button>
      </div>
      <input aria-label="Execution progress" className="execution-range" type="range" min="0" max={Math.max(events.length - 1, 0)} value={index} onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }}/>
      <span className="execution-step">STEP <b>{index + 1}</b> / {events.length}</span>
      <label className="execution-speed">Speed <select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1400">0.5×</option><option value="700">1×</option><option value="350">2×</option><option value="175">4×</option></select></label>
    </div>
    <div className="execution-grid">
      <article className="execution-panel execution-tree panel">
        <div className="execution-panel-head"><div><span className="execution-index">01</span><b>Tree traversal</b></div><span className="execution-state"><i className="execution-dot"/>{complete ? 'COMPLETE' : 'LIVE'}</span></div>
        <div className="execution-tree-content"><div className="execution-tree-viewport">{tree ? <svg style={{ width: `${layout.width}px`, height: `${layout.height}px` }} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Tree traversal synchronized with code execution">
          {layout.edges.map(edge => <line key={`${edge.from}-${edge.to}`} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className={complete && result.path.includes(edge.from) && result.path.includes(edge.to) ? 'exec-edge exec-path-edge' : 'exec-edge'}/>)}
          {layout.nodes.map(({ node, x, y }) => <g key={node.id} className={`exec-node ${current?.activeId === node.id ? 'exec-active' : ''} ${visited.has(node.id) ? 'exec-visited' : ''} ${complete && result.path.includes(node.id) ? 'exec-on-path' : ''}`}>
            <circle cx={x} cy={y} r="17"/><text x={x} y={y + 4}>{node.value}</text>
            {current?.heights[node.id] !== undefined && <text className="exec-height" x={x} y={y + 31}>h={current.heights[node.id]}</text>}
          </g>)}
        </svg> : <div className="execution-empty">Empty tree · height(null) returns −1</div>}</div>
        <div className="execution-tree-legend"><span><i className="legend-dot visiting"/>Active</span><span><i className="legend-dot done"/>Completed</span><span><i className="legend-line"/>Diameter path</span></div>
        {complete && <div className="execution-final-result"><span>FINAL DIAMETER</span><b>{result.diameter} <small>edges</small></b><p>{result.endpoints[0] ? <>{result.endpoints.map((id, i) => <span key={id}>{i ? ' ↔ ' : ''}#{id} · {layout.nodes.find(n => n.node.id === id)?.node.value}</span>)}</> : 'No endpoint nodes'}</p><small>{result.path.map(id => layout.nodes.find(n => n.node.id === id)?.node.value).join(' → ') || 'Empty path'}{current?.bestNodeId ? ` · max candidate at node #${current.bestNodeId}` : ''}</small></div>}
        </div>
      </article>

      <article className="execution-panel execution-code panel">
        <div className="execution-function">EXECUTING <b>{current?.functionName ?? 'height'}</b><span>· C++17</span><button className="execution-copy" onClick={copy}>{copied ? <Check size={13}/> : <Clipboard size={13}/>} {copied ? 'Copied' : 'Copy code'}</button></div>
        <div ref={editorRef} className="execution-editor" aria-label="C++ code editor">{CPP_LINES.map((line, i) => <div key={i} ref={current?.line === i + 1 ? activeLineRef : null} className={`execution-code-line ${current?.line === i + 1 ? 'line-running' : ''}`}><span className="execution-line-number">{i + 1}</span><code><CodeLine text={line}/></code></div>)}</div>
        <div className="execution-editor-foot"><span><i className="execution-dot"/> {current ? `Line ${current.line} · ${current.type}` : 'Ready'}</span><span>EDGE-COUNT HEIGHTS</span></div>
      </article>
    </div>
  </section>;
}


