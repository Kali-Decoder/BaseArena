"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Utility functions (remain unchanged)
function rndElem(arr) {
  return arr[Math.random() * arr.length | 0];
}
function key(x, y) {
  return x + "," + y;
}

export default function MazeGame() {
  // State for game logic (mostly unchanged)
  const [grid, setGrid] = useState([]);
  const [N, setN] = useState(41);
  const [start, setStart] = useState({ x: 1, y: 1 });
  const [end, setEnd] = useState({ x: 39, y: 39 });
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [shortestPathCount, setShortestPathCount] = useState(0);

  // State for UI inputs
  const [gridSizeInput, setGridSizeInput] = useState(41);
  const [solutionsInput, setSolutionsInput] = useState(1);

  // State for the modal visibility
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);

  // Refs (unchanged, but modal instance ref is no longer needed)
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const t0Ref = useRef(null);
  const shortestParentRef = useRef(null);
  
  // The drawing function and other game logic functions (generate, move, etc.)
  // are almost identical. The only change is in the `move` function to set
  // the modal state instead of calling a Bootstrap method.

  const draw = useCallback(() => {
    // ... (Canvas drawing logic remains exactly the same)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const wrap = canvas.parentElement.getBoundingClientRect();
    const pad = 8;
    const S = Math.min(
        Math.max(100, Math.floor(wrap.width - pad)),
        Math.max(100, Math.floor(wrap.height - pad))
    );
    canvas.width = S;
    canvas.height = S;
    const cellSize = Math.floor(S / N);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0c12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = grid[y]?.[x];
        let color;
        if (v === 1) color = "#0a0c12";      // wall
        else if (v === 0) color = "#222d3a"; // passage
        else if (v === -1) color = "#7cf18f"; // start
        else if (v === -2) color = "#ff6b6b"; // end
        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    if (showSolution && shortestParentRef.current) {
      let x = end.x, y = end.y;
      ctx.fillStyle = "#89a7ff";
      while (!(x === start.x && y === start.y)) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        const p = shortestParentRef.current[y][x];
        if (!p) break;
        [x, y] = p;
      }
      ctx.fillRect(start.x * cellSize, start.y * cellSize, cellSize, cellSize);
    }
    
    ctx.fillStyle = "#e3b341";
    const playerPad = Math.max(1, Math.floor(cellSize * 0.2));
    ctx.fillRect(
      player.x * cellSize + playerPad,
      player.y * cellSize + playerPad,
      cellSize - 2 * playerPad,
      cellSize - 2 * playerPad
    );
  }, [N, grid, player, showSolution, start, end]);

  const generate = useCallback((n, targetSolutions) => {
    // ... (Generate logic is the same)
    n = Math.max(5, n | 0);
    if (n % 2 === 0) n++;

    let newGrid = Array.from({ length: n }, () => Array(n).fill(1));
    const newStart = { x: 1, y: 1 };
    const newEnd = { x: n - 2, y: n - 2 };

    // Carve Maze (DFS)
    for (let y = 1; y < n; y += 2) {
      for (let x = 1; x < n; x += 2) {
        newGrid[y][x] = 0;
      }
    }
    const stack = [[1, 1]];
    const visited = new Set([key(1, 1)]);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]].filter(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return nx > 0 && ny > 0 && nx < n - 1 && ny < n - 1 && newGrid[ny][nx] === 0 && !visited.has(key(nx, ny));
      });
      if (dirs.length === 0) {
        stack.pop();
        continue;
      }
      const [dx, dy] = rndElem(dirs);
      const nx = cx + dx, ny = cy + dy;
      newGrid[cy + dy / 2][cx + dx / 2] = 0;
      visited.add(key(nx, ny));
      stack.push([nx, ny]);
    }
    
    // Path counting and adding loops
    const countPaths = (currentGrid) => {
        const q = [];
        const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
        const ways = Array.from({ length: n }, () => Array(n).fill(0));
        shortestParentRef.current = Array.from({ length: n }, () => Array(n).fill(null));

        q.push([newStart.x, newStart.y]);
        dist[newStart.y][newStart.x] = 0;
        ways[newStart.y][newStart.x] = 1;

        while(q.length) {
            const [x,y] = q.shift();
            const neighbors = [[x,y-1], [x+1,y], [x,y+1], [x-1,y]];
            for(const [nx,ny] of neighbors) {
                if (nx < 0 || ny < 0 || nx >= n || ny >= n || currentGrid[ny][nx] === 1) continue;
                const nd = dist[y][x] + 1;
                if(nd < dist[ny][nx]) {
                    dist[ny][nx] = nd;
                    ways[ny][nx] = ways[y][x];
                    q.push([nx,ny]);
                    shortestParentRef.current[ny][nx] = [x,y];
                } else if (nd === dist[ny][nx]) {
                    ways[ny][nx] += ways[y][x];
                }
            }
        }
        return ways[newEnd.y][newEnd.x];
    };
    
    let pathCount = countPaths(newGrid);
    if (targetSolutions > 1) {
        let tries = 0;
        while(pathCount < targetSolutions && tries < 5000) {
            const candidates = [];
            for (let y = 1; y < n-1; y++) {
                for(let x = 1; x < n-1; x++) {
                    if (newGrid[y][x] !== 1) continue;
                    if(newGrid[y][x-1] !== 1 && newGrid[y][x+1] !== 1) candidates.push([x,y]);
                    else if(newGrid[y-1][x] !== 1 && newGrid[y+1][x] !== 1) candidates.push([x,y]);
                }
            }
            if (!candidates.length) break;
            const [wx, wy] = rndElem(candidates);
            newGrid[wy][wx] = 0;
            pathCount = countPaths(newGrid);
            tries++;
        }
    }
    
    newGrid[newStart.y][newStart.x] = -1;
    newGrid[newEnd.y][newEnd.x] = -2;
    
    setN(n);
    setGrid(newGrid);
    setStart(newStart);
    setEnd(newEnd);
    setPlayer(newStart);
    setMoves(0);
    setShortestPathCount(countPaths(newGrid));
    
    if (timerRef.current) clearInterval(timerRef.current);
    t0Ref.current = performance.now();
    timerRef.current = setInterval(() => {
        setTime((performance.now() - t0Ref.current) / 1000);
    }, 100);
  }, []);

  const move = useCallback((dx, dy) => {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (nx < 0 || ny < 0 || nx >= N || grid[ny]?.[nx] === 1) return;

    setPlayer({ x: nx, y: ny });
    setMoves(prev => prev + 1);
    
    if (nx === end.x && ny === end.y) {
      if (timerRef.current) clearInterval(timerRef.current);
      // **MODAL CHANGE**: Set state to true to show the modal
      setIsWinModalOpen(true);
    }
  }, [player, N, grid, end]);

  useEffect(() => {
    generate(41, 1);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [generate]);

  useEffect(() => { draw(); }, [draw]);
  
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Redraw when showSolution changes to update the canvas
  useEffect(() => {
    draw();
  }, [showSolution, draw]);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isWinModalOpen) return; // Don't move if modal is open
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') move(0, -1);
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') move(0, 1);
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') move(-1, 0);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') move(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, isWinModalOpen]);
  
  const handleGenerateClick = () => {
    generate(gridSizeInput, solutionsInput);
  };
  
  const handleResetPlayer = () => {
    setPlayer(start);
    setMoves(0);
    t0Ref.current = performance.now();
    if (timerRef.current) clearInterval(timerRef.current);
     timerRef.current = setInterval(() => {
        setTime((performance.now() - t0Ref.current) / 1000);
    }, 100);
  };

  const handleSaveJson = () => {
    // ... (Save logic is the same)
      const data = {
          grid,
          meta: { size: N, start, end, legend: { passage: 0, wall: 1, start: -1, end: -2 } }
      };
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maze_${N}x${N}.json`;
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
  };
  
  const handleLoadJson = (e) => {
    // ... (Load logic is the same)
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
          try {
              const obj = JSON.parse(reader.result);
              if (!obj.grid || !Array.isArray(obj.grid)) throw new Error("Invalid JSON");
              const newGrid = obj.grid;
              const newN = newGrid.length;
              let newStart = {x: 1, y: 1}, newEnd = {x: newN-2, y: newN-2};
              for (let y = 0; y < newN; y++) {
                  for (let x = 0; x < newN; x++) {
                      if (newGrid[y][x] === -1) newStart = {x,y};
                      if (newGrid[y][x] === -2) newEnd = {x,y};
                  }
              }
              setGrid(newGrid);
              setN(newN);
              setStart(newStart);
              setEnd(newEnd);
              setPlayer(newStart);
              setMoves(0);
          } catch(err) {
              alert("Could not load JSON: " + err.message);
          }
      };
      reader.readAsText(file);
      e.target.value = "";
  };
  
  // Custom button component for consistent styling
  const Button = ({ children, onClick, variant = 'primary', ...props }) => {
    const baseStyle = "px-3 py-1.5 text-sm font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors";
    const variants = {
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      outline: "border border-slate-500 text-slate-300 hover:bg-slate-700 focus:ring-slate-500",
      secondary: "border border-slate-500 text-slate-300 hover:bg-slate-700 focus:ring-slate-500" // For load button
    };
    return <button onClick={onClick} className={`${baseStyle} ${variants[variant]}`} {...props}>{children}</button>;
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 w-full h-screen max-w-7xl mx-auto">
      <div className="flex-1 min-w-0 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg">
        <canvas ref={canvasRef}></canvas>
      </div>

      <aside className="w-full md:w-80 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg p-4 h-fit">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-bold text-lg">Maze Generator</h5>
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-200">Tailwind</span>
        </div>

        <div className="grid grid-cols-2 gap-4 my-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300">Grid size (odd)</label>
            <input type="number" min="5" step="2" value={gridSizeInput} onChange={(e) => setGridSizeInput(parseInt(e.target.value, 10))} className="w-full p-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
            <p className="mt-1 text-xs text-slate-500">e.g. 31, 41, 61…</p>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300"># solutions</label>
            <input type="number" min="1" step="1" value={solutionsInput} onChange={(e) => setSolutionsInput(parseInt(e.target.value, 10))} className="w-full p-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            <p className="mt-1 text-xs text-slate-500">Shortest paths.</p>
          </div>
          <div className="col-span-2 flex gap-2">
            <Button onClick={handleGenerateClick}>Generate</Button>
            <Button onClick={handleSaveJson} variant="outline">Save JSON</Button>
            <label className="cursor-pointer px-3 py-1.5 text-sm font-semibold rounded-md border border-slate-500 text-slate-300 hover:bg-slate-700">
              Load JSON <input type="file" accept="application/json" onChange={handleLoadJson} className="hidden" />
            </label>
          </div>
        </div>
        <hr className="border-slate-700 my-4" />
        <div className="space-y-1 text-sm text-slate-400">
          <div>Cells: <span className="font-semibold text-white">{N}×{N}</span></div>
          <div>Shortest paths: <span className="font-semibold text-white">{shortestPathCount}</span></div>
          <div>Time: <span className="font-semibold text-white">{time.toFixed(1)}s</span> · Moves: <span className="font-semibold text-white">{moves}</span></div>
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-1 my-4">
            <button className="col-start-2 row-start-1 bg-slate-700 hover:bg-slate-600 rounded p-2" onClick={() => move(0, -1)}>▲</button>
            <button className="col-start-1 row-start-2 bg-slate-700 hover:bg-slate-600 rounded p-2" onClick={() => move(-1, 0)}>◀</button>
            <button className="col-start-3 row-start-2 bg-slate-700 hover:bg-slate-600 rounded p-2" onClick={() => move(1, 0)}>▶</button>
            <button className="col-start-2 row-start-3 bg-slate-700 hover:bg-slate-600 rounded p-2" onClick={() => move(0, 1)}>▼</button>
        </div>

        <div className="grid gap-2">
            <Button onClick={() => setShowSolution(s => !s)} variant="outline">Show shortest path (toggle)</Button>
            <Button onClick={handleResetPlayer} variant="outline">Reset player to start</Button>
        </div>
      </aside>

      {/* Winner modal */}
      {isWinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h5 className="text-xl font-bold mb-2">🎉 You escaped the maze!</h5>
            <p className="text-slate-300 mb-4">Time: <strong className="text-white">{time.toFixed(1)}s</strong> · Moves: <strong className="text-white">{moves}</strong></p>
            <Button onClick={() => setIsWinModalOpen(false)}>Nice!</Button>
          </div>
        </div>
      )}
    </div>
  );
}