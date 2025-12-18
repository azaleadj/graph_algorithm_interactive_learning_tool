// import React from 'react';
// import BfsDemo from './BfsDemo';

// function App() {
//   return <BfsDemo />;
// }

// export default App;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AlgorithmSelection from "./AlgorithmSelection";
import BfsDemo from "./BfsDemo";
// import DfsDemo from "./DfsDemo";
import DijkstraDemo from "./DijkstraDemo";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AlgorithmSelection />} />
        <Route path="/visualize/bfs" element={<BfsDemo />} />
        {/* <Route path="/visualize/dfs" element={<DfsDemo />} /> */}
        <Route path="/visualize/dijkstra" element={<DijkstraDemo />} />
      </Routes>
    </Router>
  );
}

export default App;
