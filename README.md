# Graph Algorithm Interactive Learning Tool

An interactive web-based learning tool for graph algorithms, focusing on **Breadth-First Search (BFS)** and **Dijkstra’s algorithm**.  
The system is designed to support **step-by-step visualization**, **practice-based prediction**, and **user interaction** to help learners better understand algorithmic processes.

---

## Live Demo

- BFS Visualization & Practice Mode:  
  https://graph-algorithm-interactive-learnin.vercel.app/visualize/bfs
  
- Dijkstra Visualization & Practice Mode:  
  https://graph-algorithm-interactive-learnin.vercel.app/visualize/dijkstra
  

> Note: This is a single-page application. Direct links are supported via server-side routing configuration.

---

## Key Features

- Interactive visualization of BFS and Dijkstra’s algorithm
- Step-by-step execution with animation
- **Practice mode**: users predict the next node selection and receive immediate feedback
- Support for **directed and undirected graphs**
- User-defined graph construction and editing
- Clear visual distinction between:
  - undiscovered nodes,
  - active nodes,
  - visited nodes,
  - candidate edges and confirmed paths

---

##  Educational Design

- The practice mode focuses on **global decision-making**, rather than local edge comparisons.
> Note: Please select a start node before enabling Practice Mode.
> Practice Mode assumes that the algorithm has already been initialized.


- For Dijkstra’s algorithm, the next node is selected based on the **global minimum distance among all unvisited nodes**.
- Defensive initialization is used to ensure robustness during dynamic node and edge creation.

---

### Known Issue

For user-defined graphs, Practice Mode should be enabled only after the algorithm has been executed once using Play in the deployed version. This issue does not occur in local development and is under investigation.


## Implementation

- Frontend: React + TypeScript
- Graph visualization: Cytoscape.js
- State management: React hooks
- Routing: React Router
- Deployment: Vercel

Key implementation files:
- `src/BfsDemo.tsx`
- `src/DijkstraDemo.tsx`

---

## Running Locally

```bash
npm install
npm start
