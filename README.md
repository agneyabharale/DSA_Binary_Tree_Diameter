# TreeLab

An interactive binary tree diameter learning app built with React, Vite, TypeScript, and custom SVG tree rendering.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

The tree algorithm uses edge-count heights: an empty subtree is `-1`, a leaf is `0`, and diameter is measured in edges. The visualizer, result panel, and traversal trace all operate on the same tree state.
