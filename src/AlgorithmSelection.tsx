import React from "react";
import { useNavigate } from "react-router-dom";


export default function AlgorithmSelection() {
  const navigate = useNavigate();

  const handleSelect = (algo: string) => {
    navigate(`/visualize/${algo}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center text-center gap-6">
      <h1 className="text-3xl font-bold">Interactive Graph Algorithm Visualization & Learning Platform</h1>
      <p className="text-gray-600">Select an algorithm to start:</p>
      <div className="flex gap-4">
        <button
          onClick={() => handleSelect("bfs")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          BFS
        </button>

        <button
          onClick={() => handleSelect("dijkstra")}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          Dijkstra
        </button>
      </div>
    </div>
  );
}




// export default function AlgorithmSelection() {
//   const navigate = useNavigate();

//   const handleSelect = (algo: string) => {
//     navigate(`/visualize/${algo}`);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center h-screen w-full gap-6">
//       <h1 className="text-3xl font-bold">Graph Algorithm Visualization</h1>
//       <p className="text-gray-600">Select an algorithm to start:</p>
//       <div className="flex gap-4">
//         <button onClick={() => handleSelect("bfs")} className="px-4 py-2 bg-blue-500 text-white rounded-lg">BFS</button>
//         {/* <button onClick={() => handleSelect("dfs")} className="px-4 py-2 bg-green-500 text-white rounded-lg">DFS</button> */}
//         <button onClick={() => handleSelect("dijkstra")} className="px-4 py-2 bg-purple-500 text-white rounded-lg">Dijkstra</button>
//       </div>
//     </div>
//   );
// }