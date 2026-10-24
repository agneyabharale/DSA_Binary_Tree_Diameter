import type { TreeNode } from './tree';

export const CPP_LINES = [
  'int diameter = 0;',
  '',
  'int height(Node* root) {',
  '    if (root == nullptr) {',
  '        return -1;',
  '    }',
  '',
  '    int leftHeight = height(root->left);',
  '    int rightHeight = height(root->right);',
  '',
  '    diameter = max(diameter, leftHeight + rightHeight + 2);',
  '',
  '    return 1 + max(leftHeight, rightHeight);',
  '}',
  '',
  'int diameterOfBinaryTree(Node* root) {',
  '    diameter = 0;',
  '    height(root);',
  '    return diameter;',
  '}',
];

export const SOURCE_LINE = { resetGlobal: 1, heightStart: 3, nullCheck: 4, nullReturn: 5, leftCall: 8, rightCall: 9, diameterUpdate: 11, heightReturn: 13, publicStart: 16, publicReset: 17, publicCall: 18, publicReturn: 19 } as const;
export type Variable = { name: string; value: string | number; state: 'pending' | 'calculating' | 'computed' | 'returned' };
export type Frame = { key: string; nodeId: string | null; value: number | null; leftHeight: Variable; rightHeight: Variable; candidate: Variable; returnHeight: Variable };
export type ExecutionEvent = { type: string; line: number; activeId: string | null; functionName: string; stack: Frame[]; heights: Record<string, number>; diameter: number; candidate: number | null; bestNodeId: string | null; returned: number | null; explanation: string };

const variable = (name: string, value: string | number = 'Not evaluated', state: Variable['state'] = 'pending'): Variable => ({ name, value, state });
const copyStack = (stack: Frame[]) => stack.map(frame => ({ ...frame, leftHeight: { ...frame.leftHeight }, rightHeight: { ...frame.rightHeight }, candidate: { ...frame.candidate }, returnHeight: { ...frame.returnHeight } }));

/** Deterministic event trace for the exact postorder height(root) algorithm in CPP_LINES. */
export function generateExecutionTrace(root: TreeNode | null): ExecutionEvent[] {
  const events: ExecutionEvent[] = [], stack: Frame[] = [], heights: Record<string, number> = {};
  let diameter = 0, bestNodeId: string | null = null, frameSerial = 0;
  const emit = (type: string, line: number, activeId: string | null, functionName: string, explanation: string, candidate: number | null = null, returned: number | null = null) => {
    events.push({ type, line, activeId, functionName, stack: copyStack(stack), heights: { ...heights }, diameter, candidate, bestNodeId, returned, explanation });
  };
  emit('enter-public', SOURCE_LINE.publicStart, root?.id ?? null, 'diameterOfBinaryTree', 'Enter the public method with the selected root.');
  diameter = 0; bestNodeId = null;
  emit('reset-public', SOURCE_LINE.publicReset, root?.id ?? null, 'diameterOfBinaryTree', 'Reset the shared diameter before this run.');
  emit('call-root', SOURCE_LINE.publicCall, root?.id ?? null, 'diameterOfBinaryTree', root ? 'Call height(root) and begin the recursive traversal.' : 'Call height(nullptr); the empty tree returns -1.');
  function height(n: TreeNode | null): number {
    const frame: Frame = { key: `frame-${++frameSerial}`, nodeId: n?.id ?? null, value: n?.value ?? null, leftHeight: variable('leftHeight'), rightHeight: variable('rightHeight'), candidate: variable('candidateDiameter'), returnHeight: variable('return height') };
    stack.push(frame);
    emit('enter-height', SOURCE_LINE.heightStart, n?.id ?? null, 'height', n ? `Enter height for node ${n.value}.` : 'Enter height with a null child.');
    emit('check-null', SOURCE_LINE.nullCheck, n?.id ?? null, 'height', n ? `Check whether node ${n.value} is null: it is not.` : 'Check the base case: this child is null.');
    if (!n) {
      emit('return-null', SOURCE_LINE.nullReturn, null, 'height', 'This child is null, so its edge-height is -1.', null, -1);
      stack.pop();
      emit('pop-null', SOURCE_LINE.nullReturn, stack[stack.length - 1]?.nodeId ?? null, 'height', 'Return -1 to the calling frame and pop this null call.', null, -1);
      return -1;
    }
    frame.leftHeight = variable('leftHeight', 'Calculating', 'calculating');
    emit('call-left', SOURCE_LINE.leftCall, n.id, 'height', `Explore the left subtree of node ${n.value}.`);
    const left = height(n.left);
    frame.leftHeight = variable('leftHeight', left, 'computed');
    emit('receive-left', SOURCE_LINE.leftCall, n.id, 'height', `The left subtree of node ${n.value} returned height ${left}.`);
    frame.rightHeight = variable('rightHeight', 'Calculating', 'calculating');
    emit('call-right', SOURCE_LINE.rightCall, n.id, 'height', `Now explore the right subtree of node ${n.value}.`);
    const right = height(n.right);
    frame.rightHeight = variable('rightHeight', right, 'computed');
    emit('receive-right', SOURCE_LINE.rightCall, n.id, 'height', `The right subtree of node ${n.value} returned height ${right}.`);
    const candidate = left + right + 2;
    frame.candidate = variable('candidateDiameter', candidate, 'calculating');
    emit('calculate-candidate', SOURCE_LINE.diameterUpdate, n.id, 'height', `Calculate this node's candidate: ${left} + ${right} + 2 = ${candidate} edges.`, candidate);
    if (bestNodeId === null) bestNodeId = n.id;
    if (candidate > diameter) {
      diameter = candidate; bestNodeId = n.id;
      emit('update-diameter', SOURCE_LINE.diameterUpdate, n.id, 'height', `Candidate ${candidate} exceeds the previous maximum, so diameter becomes ${diameter}.`, candidate);
    } else {
      emit('compare-diameter', SOURCE_LINE.diameterUpdate, n.id, 'height', `Candidate ${candidate} does not exceed the current maximum of ${diameter}.`, candidate);
    }
    frame.candidate = variable('candidateDiameter', candidate, 'computed');
    const h = 1 + Math.max(left, right);
    frame.returnHeight = variable('return height', h, 'returned'); heights[n.id] = h;
    emit('calculate-height', SOURCE_LINE.heightReturn, n.id, 'height', `Return 1 + max(${left}, ${right}) = ${h} to this node's caller.`, candidate, h);
    stack.pop();
    emit('return-height', SOURCE_LINE.heightReturn, stack[stack.length - 1]?.nodeId ?? n.id, 'height', `Node ${n.value} returns height ${h}${stack.length ? ' to its parent' : ' to diameterOfBinaryTree'}.`, candidate, h);
    return h;
  }
  height(root);
  emit('return-diameter', SOURCE_LINE.publicReturn, root?.id ?? null, 'diameterOfBinaryTree', `Return the final diameter: ${diameter} edges.`, null, diameter);
  return events;
}
