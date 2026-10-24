import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, GitBranch, Info } from 'lucide-react';
import { analyze, clone, find, maxDepth, node, presets, type TreeNode } from './tree';
import { generateExecutionTrace, type ExecutionEvent } from './execution';

type Point = { n: TreeNode; x: number; y: number };
export function TreeDiagram({ root, selectedId, onSelect, path = [], visited = [], context = [], subtree = [], compact = false }: { root: TreeNode | null; selectedId?: string; onSelect?: (id: string) => void; path?: string[]; visited?: string[]; context?: string[]; subtree?: string[]; compact?: boolean }) {
  const layout = useMemo(() => {
    const nodes: Point[] = [], edges: [Point, Point][] = [];
    const leaves = (n: TreeNode | null): number => !n ? 0 : !n.left && !n.right ? 1 : leaves(n.left) + leaves(n.right);
    const gap = compact ? 44 : 108, row = compact ? 58 : 100;
    const leafCount = leaves(root), width = Math.max(compact ? 190 : 560, (leafCount - 1) * gap + (compact ? 58 : 160)), start = (width - (leafCount - 1) * gap) / 2;
    let index = 0;
    const points = new Map<string, Point>();
    const walk = (n: TreeNode | null, depth: number): Point | null => {
      if (!n) return null;
      const left=walk(n.left,depth+1),right=walk(n.right,depth+1);
      const x=left&&right?(left.x+right.x)/2:left?.x??right?.x??start+index++*gap;
      const p={n,x,y:45+depth*row};nodes.push(p);points.set(n.id,p);return p;
    };
    walk(root,0);for(const p of points.values())for(const child of [p.n.left,p.n.right])if(child)edges.push([p,points.get(child.id)!]);
    return { nodes, edges, width, height: compact ? Math.max(190, 65 + maxDepth(root) * row) : Math.max(400, 100 + maxDepth(root) * row), radius: compact ? 16 : 20, font: compact ? 16 : 18 };
  }, [root,compact]);
  if (!root) return <div className="lesson-tree-empty">No tree loaded yet.</div>;
  return <div className={`lesson-tree-viewport ${compact?'compact-tree-viewport':''}`}><svg style={{ width: `${layout.width}px`, height: `${layout.height}px` }} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Binary tree diagram">
    <g>{layout.edges.map(([a,b])=><line key={`${a.n.id}-${b.n.id}`} className={path.includes(a.n.id)&&path.includes(b.n.id)?'lesson-edge lesson-path-edge':'lesson-edge'} x1={a.x} y1={a.y+layout.radius} x2={b.x} y2={b.y-layout.radius}/>)}</g>
    {layout.nodes.map(({n,x,y})=><g key={n.id} tabIndex={onSelect?0:undefined} role={onSelect?'button':undefined} aria-label={`Node ${n.value}, id ${n.id}`} onClick={()=>onSelect?.(n.id)} onKeyDown={e=>e.key==='Enter'&&onSelect?.(n.id)} className={`lesson-tree-node ${selectedId===n.id?'lesson-selected':''} ${path.includes(n.id)?'lesson-on-path':''} ${visited.includes(n.id)?'lesson-visited':''} ${context.includes(n.id)?'lesson-context':''} ${subtree.includes(n.id)?'lesson-in-subtree':''}`}><circle cx={x} cy={y} r={layout.radius}/><text x={x} y={y+layout.font*.34} style={{fontSize:layout.font}}>{n.value}</text></g>)}
  </svg></div>;
}

const treeTypes: [string,string,TreeNode][] = [
  ['Full','Every node has either 0 or 2 children.',node(1,node(2,node(4),node(5)),node(3))],
  ['Complete','All levels are full except possibly the last, which fills left to right.',node(1,node(2,node(4),node(5)),node(3,node(6)))],
  ['Perfect','Every internal node has 2 children; all leaves share one depth.',node(1,node(2,node(4),node(5)),node(3,node(6),node(7)))],
  ['Balanced','At each node, left and right subtree heights differ by at most 1.',node(1,node(2,node(4)),node(3,node(6)))],
  ['Skewed','Each node has one child, forming a chain.',node(1,node(2,node(3,node(4))))],
];

function parentOf(root: TreeNode | null, id: string, parent: TreeNode | null = null): TreeNode | null {
  if (!root) return null; if (root.id === id) return parent;
  return parentOf(root.left,id,root) ?? parentOf(root.right,id,root);
}
function collect(root: TreeNode | null, ids: string[] = []): string[] { if (root) { ids.push(root.id); collect(root.left,ids); collect(root.right,ids); } return ids; }
function depthOf(root: TreeNode | null, id: string, depth = 0): number | null { if (!root) return null; if (root.id===id) return depth; return depthOf(root.left,id,depth+1) ?? depthOf(root.right,id,depth+1); }

export function FundamentalsLesson({ tree }: { tree: TreeNode | null }) {
  const [selected,setSelected]=useState(tree?.id ?? '');
  useEffect(()=>{setSelected(tree?.id ?? '')},[tree]);
  const n=find(tree,selected), parent=parentOf(tree,selected), siblingIds=parent?[parent.left,parent.right].filter((x):x is TreeNode=>!!x&&x.id!==selected).map(x=>x.id):[];
  const childIds=[n?.left?.id,n?.right?.id].filter((x):x is string=>!!x), subtreeIds=collect(n), related=[...childIds,...siblingIds,...(parent?[parent.id]:[])];
  const h=analyze(tree).heights.get(selected), depth=depthOf(tree,selected);
  return <section className="section fundamentals wrap" id="fundamentals">
    <div className="section-kicker"><span>01 / START WITH THE BASICS</span><span className="rule"/><span className="kicker-note">FOUNDATIONS</span></div>
    <div className="section-head"><h2>First, learn to<br/><em>read a tree.</em></h2><p>A tree is a connected hierarchy with no cycles. Each connection is an edge; relationships flow from parent to child, starting at the root.</p></div>
    <div className="fundamentals-intro"><div className="fundamental-definition"><span className="fundamental-symbol"><GitBranch size={20}/></span><div><b>Binary tree</b><p>A tree where each node has at most two children, named <i>left</i> and <i>right</i>.</p></div></div><div className="fundamental-definition"><span className="fundamental-symbol blue-symbol">01</span><div><b>Rooted hierarchy</b><p>Every node except the root has exactly one parent. Following edges never loops back.</p></div></div></div>
    <div className="anatomy-layout"><div className="anatomy-diagram panel"><div className="lesson-panel-heading"><div><span className="card-index">INTERACTIVE ANATOMY</span><h3>Select a node to inspect its relationships.</h3></div><span className="anatomy-count">{tree?collect(tree).length:0} nodes</span></div><TreeDiagram root={tree} selectedId={selected} onSelect={setSelected} context={related} subtree={subtreeIds}/><div className="anatomy-legend"><span><i className="anatomy-key selected-key"/>Selected node</span><span><i className="anatomy-key relation-key"/>Related nodes</span><span><i className="anatomy-key subtree-key"/>Selected subtree</span></div></div>
      <aside className="anatomy-readout"><div className="card-index">NODE RELATIONSHIPS</div><h3>{n?<>Node <em>{n.value}</em></>:'Select a node'}</h3><small className="node-id">{n?`ID ${n.id} · duplicate values remain distinct`:''}</small><div className="role-tags">{n&&<><span className={parent?'':'role-active'}>{parent?'Descendant':'Root'}</span>{parent&&<span>Child of {parent.value}</span>}{childIds.length>0&&<span>Parent</span>}{siblingIds.map(id=><span key={id}>Sibling of {find(tree,id)?.value}</span>)}{!n.left&&!n.right&&<span>Leaf</span>}</>}</div><div className="anatomy-facts">{[['Parent',parent?`Node ${parent.value}`:'None · this is the root'],['Children',[n?.left,n?.right].filter(Boolean).map(c=>String(c!.value)).join(', ')||'None · leaf node'],['Sibling',siblingIds.map(id=>String(find(tree,id)?.value)).join(', ')||'None'],['Depth',depth===null?'—':`${depth} edges from root`],['Height',h===undefined?'—':`${h} edges to deepest leaf`]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div><p className="subtree-callout"><Info size={14}/>The selected node roots a subtree of <b>{subtreeIds.length}</b> node{subtreeIds.length===1?'':'s'}.</p></aside></div>
    <div className="types-heading"><h3>FIVE STRUCTURAL SHAPES</h3><p>These names describe different properties. A tree can satisfy more than one.</p></div><div className="tree-type-grid">{treeTypes.map(([title,desc,t])=><details className="tree-type" key={title}><summary><div className="type-mini"><TreeDiagram root={t} compact/></div><h3>{title}</h3><span className="type-details-label"><span className="type-open-label">View details</span><span className="type-close-label">Hide details</span><i aria-hidden="true">⌄</i></span></summary><p>{desc}</p></details>)}</div>
    <div className="terminology-row">{[['Node count','How many nodes the tree contains.'],['Depth','Edges from the root down to a node.'],['Height','Longest downward edge path from a node to a leaf.'],['Path','A sequence of connected nodes and edges.'],['Level','Nodes grouped by depth; the root is level 0.']].map(([a,b])=><div key={a}><span>{a}</span><p>{b}</p></div>)}</div>
  </section>;
}

type PathMode='root-height'|'diameter'|'subtree';
export function HeightDiameterLesson({ tree }: { tree: TreeNode | null }) {
  const [mode,setMode]=useState<PathMode>('root-height'),[selected,setSelected]=useState(tree?.id??'');
  useEffect(()=>{setSelected(tree?.id??'')},[tree]);
  const result=useMemo(()=>analyze(tree),[tree]),target=find(tree,selected);
  const rootPath:string[]=[];let cursor=tree;
  while(cursor){rootPath.push(cursor.id);if(!cursor.left&&!cursor.right)break;const lh=cursor.left?result.heights.get(cursor.left.id)??-1:-1,rh=cursor.right?result.heights.get(cursor.right.id)??-1:-1;cursor=lh>=rh?cursor.left:cursor.right;}
  const subResult=target?analyze(target):null;
  const path=mode==='root-height'?rootPath:mode==='diameter'?result.path:subResult?.path??[];
  const length=mode==='root-height'?Math.max(0,rootPath.length-1):mode==='diameter'?result.diameter:subResult?.diameter??0;
  const copyValues=path.map(id=>find(tree,id)?.value).join(' → ')||'No nodes in this tree';
  return <section className="section height-diameter wrap" id="height-diameter">
    <div className="section-kicker"><span>03 / HEIGHT VS DIAMETER</span><span className="rule"/><span className="kicker-note">SAME TREE · DIFFERENT QUESTIONS</span></div>
    <div className="section-head"><h2>Height goes down.<br/><em>Diameter can wander.</em></h2><p>Height starts at one node and descends to a leaf. Diameter connects any two nodes, so it can pass through the root—or stay entirely inside a subtree.</p></div>
    <div className="height-lesson panel"><div className="height-lesson-toolbar"><div className="path-mode-tabs">{[['root-height','Root height'],['diameter','Whole-tree diameter'],['subtree','Subtree diameter']].map(([key,label])=><button key={key} className={mode===key?'active':''} onClick={()=>setMode(key as PathMode)}>{label}</button>)}</div>{mode==='subtree'&&<label className="subtree-picker">Subtree root<select value={selected} onChange={e=>setSelected(e.target.value)}>{collect(tree).map(id=><option key={id} value={id}>Node {find(tree,id)?.value} · {id}</option>)}</select></label>}</div>
      <div className="height-lesson-body"><TreeDiagram root={tree} selectedId={mode==='subtree'?selected:undefined} onSelect={mode==='subtree'?setSelected:undefined} path={path}/><aside className="path-explanation"><span className="card-index">{mode==='root-height'?'DOWNWARD PATH':mode==='diameter'?'LONGEST PATH ANYWHERE':'LONGEST PATH IN SUBTREE'}</span><b className="path-length">{length} <small>edges</small></b><p className="path-sequence">{copyValues}</p><p>{mode==='root-height'?'This is the longest path that begins at the root and ends at one of its leaves.':mode==='diameter'?'The endpoints are free to lie in either subtree. This path does not have to include the root.':'Only nodes below the selected subtree root are considered. Its diameter may also sit below that root.'}</p><div className="edge-convention">Empty subtree = −1 <i/> leaf height = 0 <i/> empty or single-node diameter = 0</div></aside></div>
    </div>
  </section>;
}

export function WorkedExample() {
  const example=useMemo(()=>clone(presets['Diameter inside subtree']),[]);
  const events=useMemo(()=>generateExecutionTrace(example),[example]);
  const result=useMemo(()=>analyze(example),[example]);
  const milestones=useMemo(()=>{
    const rootId=example?.id;
    const inspect=events.find(e=>e.type==='enter-height'&&e.activeId!==rootId&&!!find(example,e.activeId??'')?.left);
    const receive=events.find(e=>e.type==='receive-right'&&!!find(example,e.activeId??'')?.left);
    const candidate=events.find(e=>e.type==='calculate-candidate'&&(e.candidate??0)>0);
    const best=events.find(e=>e.type==='update-diameter'&&e.diameter===result.diameter)||events.find(e=>e.type==='compare-diameter');
    const rootReturn=[...events].reverse().find(e=>e.type==='return-height'&&e.activeId===rootId);
    const selected=[events[0],inspect,receive,candidate,best,rootReturn,events[events.length-1]].filter((e):e is ExecutionEvent=>!!e);
    return selected.filter((event,i)=>selected.findIndex(other=>other.type===event.type&&other.activeId===event.activeId)===i);
  },[events,example,result.diameter]);
  const [step,setStep]=useState(0);useEffect(()=>setStep(0),[milestones.length]);
  const current=milestones[Math.min(step,milestones.length-1)];
  const pathVisible=step===milestones.length-1;
  const pathNodes=pathVisible?result.path:[];
  const explanation=current?.explanation??'Start at the root. The recursive function will descend to the leaves, then return heights upward.';
  return <section className="section worked-example wrap" id="worked-example">
    <div className="section-kicker"><span>04 / WALK THROUGH AN EXAMPLE</span><span className="rule"/><span className="kicker-note">DIAMETER STAYS INSIDE A SUBTREE</span></div>
    <div className="section-head"><h2>See the recursion<br/><em>earn the answer.</em></h2><p>This example’s longest route is below the root. Step through milestones selected from the same instrumented algorithm used in the live C++ execution lesson.</p></div>
    <div className="worked-workspace panel"><div className="worked-topline"><span>PRESET TREE · {example?collect(example).length:0} NODES</span><span>STEP {step+1} / {milestones.length}</span></div><div className="worked-progress"><i style={{width:`${milestones.length>1?step/(milestones.length-1)*100:0}%`}}/></div><div className="worked-content"><div className="worked-tree"><TreeDiagram root={example} selectedId={current?.activeId??undefined} path={pathNodes} visited={current?Object.keys(current.heights):[]}/><div className="worked-stats"><span>LEFT HEIGHT <b>{current?.stack[current.stack.length-1]?.leftHeight.value??'—'}</b></span><span>RIGHT HEIGHT <b>{current?.stack[current.stack.length-1]?.rightHeight.value??'—'}</b></span><span>CANDIDATE <b>{current?.candidate??'—'}</b></span><span>BEST SO FAR <b>{current?.diameter??0}</b></span></div></div><aside className="worked-narration"><span className="card-index">{current?.type.replace(/-/g,' ').toUpperCase()??'START'}</span><p>{explanation}</p>{current?.bestNodeId&&<small>Best candidate currently comes from node #{current.bestNodeId}.</small>}{pathVisible&&<div className="worked-final"><b>Diameter: {result.diameter} edges</b><span>{result.path.map(id=>find(example,id)?.value).join(' → ')}</span></div>}<div className="worked-controls"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}><ArrowLeft size={14}/> Previous</button><button disabled={step===milestones.length-1} onClick={()=>setStep(s=>Math.min(milestones.length-1,s+1))}>Next <ArrowRight size={14}/></button></div></aside></div></div>
  </section>;
}


