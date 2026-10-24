export type TreeNode = { id: string; value: number; left: TreeNode | null; right: TreeNode | null };
export type TraceEvent = { id: string | null; phase: 'enter' | 'left' | 'right' | 'return'; leftHeight: number | null; rightHeight: number | null; height: number | null; candidate: number | null; best: number; stack: string[]; line: number };
let serial = 0;
export const node = (value: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode => ({ id: `n${++serial}`, value, left, right });
export const clone = (n: TreeNode | null): TreeNode | null => n ? ({ ...n, id: `n${++serial}`, left: clone(n.left), right: clone(n.right) }) : null;
export const find = (n: TreeNode | null, id: string): TreeNode | null => !n ? null : n.id === id ? n : find(n.left, id) ?? find(n.right, id);
export const replace = (n: TreeNode | null, id: string, side: 'left' | 'right', child: TreeNode | null): TreeNode | null => !n ? null : n.id === id ? { ...n, [side]: child } : { ...n, left: replace(n.left, id, side, child), right: replace(n.right, id, side, child) };
export const remove = (n: TreeNode | null, id: string): TreeNode | null => !n || n.id === id ? null : { ...n, left: remove(n.left, id), right: remove(n.right, id) };
export const values = (n: TreeNode | null): number[] => n ? [n.value, ...values(n.left), ...values(n.right)] : [];
export const maxDepth = (n: TreeNode | null): number => n ? 1 + Math.max(maxDepth(n.left), maxDepth(n.right)) : 0;
export function analyze(root: TreeNode | null) {
  let best = 0, endpoints: [string | null, string | null] = [null, null];
  const heights = new Map<string, number>(), parent = new Map<string, string | null>();
  const deepest = (x: TreeNode): string => { if (!x.left && !x.right) return x.id; if (!x.right) return deepest(x.left!); if (!x.left) return deepest(x.right); return deepest(depth(x.left) >= depth(x.right) ? x.left : x.right); };
  const depth = (n: TreeNode | null): number => n ? 1 + Math.max(depth(n.left), depth(n.right)) : 0;
  function walk(n: TreeNode | null, p: string | null = null): number {
    if (!n) return -1;
    parent.set(n.id, p); const l = walk(n.left, n.id), r = walk(n.right, n.id), candidate = l + r + 2;
    if (candidate > best || endpoints[0] === null) { best = Math.max(best, candidate); endpoints = [n.left ? deepest(n.left) : n.id, n.right ? deepest(n.right) : n.id]; }
    const h = 1 + Math.max(l, r); heights.set(n.id, h); return h;
  }
  walk(root); const path: string[] = [];
  if (endpoints[0] && endpoints[1]) {
    const a: string[] = []; let x: string | null = endpoints[0]; while (x) { a.push(x); x = parent.get(x) ?? null; }
    const b: string[] = []; x = endpoints[1]; while (x && !a.includes(x)) { b.push(x); x = parent.get(x) ?? null; }
    path.push(...a.slice(0, a.indexOf(x!) + 1), ...b.reverse());
  } else if (root) path.push(root.id);
  return { diameter: best, heights, path, endpoints };
}
export function trace(root: TreeNode | null): TraceEvent[] {
  const events: TraceEvent[] = [], stack: string[] = []; let best = 0;
  function walk(n: TreeNode | null): number {
    if (!n) return -1;
    stack.push(n.id); events.push({ id: n.id, phase: 'enter', leftHeight: null, rightHeight: null, height: null, candidate: null, best, stack: [...stack], line: 9 });
    events.push({ id: n.id, phase: 'left', leftHeight: null, rightHeight: null, height: null, candidate: null, best, stack: [...stack], line: 12 }); const l = walk(n.left);
    events.push({ id: n.id, phase: 'right', leftHeight: l, rightHeight: null, height: null, candidate: null, best, stack: [...stack], line: 13 }); const r = walk(n.right);
    const candidate = l + r + 2, h = 1 + Math.max(l, r); best = Math.max(best, candidate);
    events.push({ id: n.id, phase: 'return', leftHeight: l, rightHeight: r, height: h, candidate, best, stack: [...stack], line: 15 }); stack.pop(); return h;
  }
  walk(root); return events;
}
export const presets: Record<string, TreeNode | null> = {
  'Balanced tree': node(1, node(2, node(4), node(5)), node(3, node(6), node(7))),
  'Diameter through root': node(1, node(2, node(4), node(5)), node(3)),
  'Diameter inside subtree': node(1, node(2, node(4, node(7), node(8)), node(5, null, node(9))), node(3)),
  'Left-skewed': node(1, node(2, node(3, node(4)))),
  'Right-skewed': node(1, null, node(2, null, node(3, null, node(4)))),
  'Single node': node(1), 'Empty tree': null,
};
