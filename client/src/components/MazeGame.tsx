"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMazeTransactions } from "@/hooks/useMazeTransactions";
import { useUniversalWalletClient } from "@/hooks/useWalletClient";
import { baseSepolia } from "viem/chains";
import { useSwitchChain } from "wagmi";

type Point = { x: number; y: number };

function rndElem<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}
function key(x: number, y: number): string {
  return x + "," + y;
}

export default function MazeGame(): React.ReactElement {
  const [grid, setGrid] = useState<number[][]>([]);
  const [N, setN] = useState<number>(41);
  const [start, setStart] = useState<Point>({ x: 1, y: 1 });
  const [end, setEnd] = useState<Point>({ x: 39, y: 39 });
  const [player, setPlayer] = useState<Point>({ x: 1, y: 1 });
  const [moves, setMoves] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [shortestPathCount, setShortestPathCount] = useState<number>(0);

  const [gridSizeInput, setGridSizeInput] = useState<number>(41);
  const [solutionsInput, setSolutionsInput] = useState<number>(1);

  const [isWinModalOpen, setIsWinModalOpen] = useState<boolean>(false);
  const { playMove } = useMazeTransactions();
  const { chainId } = useUniversalWalletClient();
  const { switchChain } = useSwitchChain();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0Ref = useRef<number | null>(null);
  const shortestParentRef = useRef<Array<Array<[number, number] | null>> | null>(
    null
  );
  const touchStartRef = useRef<Point | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const txInFlightRef = useRef<boolean>(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrap = canvas.parentElement?.getBoundingClientRect();
    if (!wrap) return;
    const S = Math.floor(Math.min(Math.max(100, wrap.width), Math.max(100, wrap.height)));
    // Choose an integer cell size and set canvas to exact grid size to avoid gaps
    const cellSize = Math.floor(S / N);
    const gridSize = cellSize * N;
    canvas.width = gridSize;
    canvas.height = gridSize;

    (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0c12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = grid[y]?.[x];
        let color = "#0a0c12";
        if (v === 0) color = "#222d3a";
        else if (v === -1) color = "#7cf18f";
        else if (v === -2) color = "#ff6b6b";
        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    if (showSolution && shortestParentRef.current) {
      let x = end.x,
        y = end.y;
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

  const generate = useCallback((n: number, targetSolutions: number) => {
    n = Math.max(5, n | 0);
    if (n % 2 === 0) n++;

    const newGrid: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
    const newStart: Point = { x: 1, y: 1 };
    const newEnd: Point = { x: n - 2, y: n - 2 };

    for (let y = 1; y < n; y += 2) {
      for (let x = 1; x < n; x += 2) {
        newGrid[y][x] = 0;
      }
    }
    const stack: [number, number][] = [[1, 1]];
    const visited = new Set<string>([key(1, 1)]);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const dirs = (
        [
          [0, -2],
          [2, 0],
          [0, 2],
          [-2, 0],
        ] as [number, number][]
      ).filter(([dx, dy]) => {
        const nx = cx + dx,
          ny = cy + dy;
        return (
          nx > 0 &&
          ny > 0 &&
          nx < n - 1 &&
          ny < n - 1 &&
          newGrid[ny][nx] === 0 &&
          !visited.has(key(nx, ny))
        );
      });
      if (dirs.length === 0) {
        stack.pop();
        continue;
      }
      const [dx, dy] = rndElem(dirs);
      const nx = cx + dx,
        ny = cy + dy;
      newGrid[cy + dy / 2][cx + dx / 2] = 0;
      visited.add(key(nx, ny));
      stack.push([nx, ny]);
    }

    const countPaths = (currentGrid: number[][]): number => {
      const q: [number, number][] = [];
      const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
      const ways: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      shortestParentRef.current = Array.from({ length: n }, () => Array(n).fill(null));

      q.push([newStart.x, newStart.y]);
      dist[newStart.y][newStart.x] = 0;
      ways[newStart.y][newStart.x] = 1;

      while (q.length) {
        const [x, y] = q.shift()!;
        const neighbors: [number, number][] = [
          [x, y - 1],
          [x + 1, y],
          [x, y + 1],
          [x - 1, y],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || currentGrid[ny][nx] === 1) continue;
          const nd = dist[y][x] + 1;
          if (nd < dist[ny][nx]) {
            dist[ny][nx] = nd;
            ways[ny][nx] = ways[y][x];
            q.push([nx, ny]);
            shortestParentRef.current![ny][nx] = [x, y];
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
      while (pathCount < targetSolutions && tries < 5000) {
        const candidates: [number, number][] = [];
        for (let y = 1; y < n - 1; y++) {
          for (let x = 1; x < n - 1; x++) {
            if (newGrid[y][x] !== 1) continue;
            if (newGrid[y][x - 1] !== 1 && newGrid[y][x + 1] !== 1) candidates.push([x, y]);
            else if (newGrid[y - 1][x] !== 1 && newGrid[y + 1][x] !== 1) candidates.push([x, y]);
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
      if (t0Ref.current == null) return;
      setTime((performance.now() - t0Ref.current) / 1000);
    }, 100);
  }, []);

  const move = useCallback(
    (dx: number, dy: number) => {
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (nx < 0 || ny < 0 || nx >= N || grid[ny]?.[nx] === 1) return;

      setPlayer({ x: nx, y: ny });
      setMoves((prev) => prev + 1);

      // Fire a contract call per move (guard to avoid overlapping txs)
      if (!txInFlightRef.current) {
        console.log("Maze move -> sending playMove tx", { to: `${end.x},${end.y}`, next: `${nx},${ny}` });
        txInFlightRef.current = true;
        Promise.resolve(playMove())
          .catch((e) => {
            console.error("playMove tx failed", e);
          })
          .finally(() => {
            console.log("playMove tx done (or failed)");
            txInFlightRef.current = false;
          });
      }

      if (nx === end.x && ny === end.y) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsWinModalOpen(true);
        // Also ensure a call on win (guard will prevent overlap if already sent)
        if (!txInFlightRef.current) {
          console.log("Reached goal -> sending additional playMove tx");
          txInFlightRef.current = true;
          Promise.resolve(playMove())
            .catch((e) => {
              console.error("goal playMove tx failed", e);
            })
            .finally(() => {
              console.log("goal playMove tx done (or failed)");
              txInFlightRef.current = false;
            });
        }
      }
    },
    [player, N, grid, end, playMove]
  );

  useEffect(() => {
    generate(41, 1);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generate]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Touch controls: swipe to move on mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const threshold = 24; // px minimal swipe distance

    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      touchMovedRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      // Prevent page scroll when interacting with the canvas
      e.preventDefault();
      touchMovedRef.current = true;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < threshold && ay < threshold) return;
      if (ax > ay) {
        move(dx > 0 ? 1 : -1, 0);
      } else {
        move(0, dy > 0 ? 1 : -1);
      }
      touchStartRef.current = null;
      touchMovedRef.current = false;
    };

    // Use non-passive to allow preventDefault on touchmove
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart as EventListener);
      canvas.removeEventListener("touchmove", onTouchMove as EventListener);
      canvas.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, [move]);

  useEffect(() => {
    draw();
  }, [showSolution, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWinModalOpen) return;
      const keyLower = e.key.toLowerCase();
      if (e.key === "ArrowUp" || keyLower === "w") move(0, -1);
      if (e.key === "ArrowDown" || keyLower === "s") move(0, 1);
      if (e.key === "ArrowLeft" || keyLower === "a") move(-1, 0);
      if (e.key === "ArrowRight" || keyLower === "d") move(1, 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      if (t0Ref.current == null) return;
      setTime((performance.now() - t0Ref.current) / 1000);
    }, 100);
  };

  const handleSaveJson = () => {
    const data = {
      grid,
      meta: {
        size: N,
        start,
        end,
        legend: { passage: 0, wall: 1, start: -1, end: -2 },
      },
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

  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const obj = JSON.parse(text);
        if (!obj.grid || !Array.isArray(obj.grid)) throw new Error("Invalid JSON");
        const newGrid: number[][] = obj.grid;
        const newN = newGrid.length;
        let newStart: Point = { x: 1, y: 1 },
          newEnd: Point = { x: newN - 2, y: newN - 2 };
        for (let y = 0; y < newN; y++) {
          for (let x = 0; x < newN; x++) {
            if (newGrid[y][x] === -1) newStart = { x, y };
            if (newGrid[y][x] === -2) newEnd = { x, y };
          }
        }
        setGrid(newGrid);
        setN(newN);
        setStart(newStart);
        setEnd(newEnd);
        setPlayer(newStart);
        setMoves(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert("Could not load JSON: " + message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "secondary";
  };
  const Button = ({ children, onClick, variant = "primary", ...props }: ButtonProps) => {
    const baseStyle =
      "px-3 py-1.5 text-sm font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors";
    const variants: Record<string, string> = {
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      outline:
        "border border-slate-500 text-slate-300 hover:bg-slate-700 focus:ring-slate-500",
      secondary:
        "border border-slate-500 text-slate-300 hover:bg-slate-700 focus:ring-slate-500",
    };
    return (
      <button onClick={onClick} className={`${baseStyle} ${variants[variant]}`} {...props}>
        {children}
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 w-full h-screen max-w-7xl mx-auto">
      <div className="flex-1 min-w-0 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg min-h-[50vh] md:min-h-0">
        <canvas ref={canvasRef} className="touch-none"></canvas>
      </div>

      <aside className="w-full md:w-80 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg p-4 h-fit">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-bold text-lg">Maze Generator</h5>
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-200">Tailwind</span>
        </div>

        {chainId !== baseSepolia.id && (
          <div className="mb-4 p-3 rounded-md bg-amber-900/30 border border-amber-700 text-amber-200">
            <p className="text-sm mb-2">You are on chain {chainId}. Switch to Base Sepolia to play on-chain.</p>
            <button
              onClick={() => switchChain({ chainId: baseSepolia.id })}
              className="px-3 py-1.5 text-sm font-semibold rounded-md bg-amber-600 hover:bg-amber-500 text-white"
            >
              Switch to Base Sepolia
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 my-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300">Grid size (odd)</label>
            <input
              type="number"
              min={5}
              step={2}
              value={gridSizeInput}
              onChange={(e) => setGridSizeInput(parseInt(e.target.value, 10))}
              className="w-full p-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">e.g. 31, 41, 61…</p>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300"># solutions</label>
            <input
              type="number"
              min={1}
              step={1}
              value={solutionsInput}
              onChange={(e) => setSolutionsInput(parseInt(e.target.value, 10))}
              className="w-full p-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Shortest paths.</p>
          </div>
          <div className="col-span-2 flex gap-2">
            <Button onClick={handleGenerateClick}>Generate</Button>
            <Button onClick={handleSaveJson} variant="outline">
              Save JSON
            </Button>
            <label className="cursor-pointer px-3 py-1.5 text-sm font-semibold rounded-md border border-slate-500 text-slate-300 hover:bg-slate-700">
              Load JSON
              <input
                type="file"
                accept="application/json"
                onChange={handleLoadJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <hr className="border-slate-700 my-4" />
        <div className="space-y-1 text-sm text-slate-400">
          <div>
            Cells: <span className="font-semibold text-white">{N}×{N}</span>
          </div>
          <div>
            Shortest paths: <span className="font-semibold text-white">{shortestPathCount}</span>
          </div>
          <div>
            Time: <span className="font-semibold text-white">{time.toFixed(1)}s</span> · Moves: <span className="font-semibold text-white">{moves}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-2 my-4 select-none">
          <button
            className="col-start-2 row-start-1 bg-slate-700 hover:bg-slate-600 rounded p-4 text-xl md:p-2 md:text-base"
            onClick={() => move(0, -1)}
          >
            ▲
          </button>
          <button
            className="col-start-1 row-start-2 bg-slate-700 hover:bg-slate-600 rounded p-4 text-xl md:p-2 md:text-base"
            onClick={() => move(-1, 0)}
          >
            ◀
          </button>
          <button
            className="col-start-3 row-start-2 bg-slate-700 hover:bg-slate-600 rounded p-4 text-xl md:p-2 md:text-base"
            onClick={() => move(1, 0)}
          >
            ▶
          </button>
          <button
            className="col-start-2 row-start-3 bg-slate-700 hover:bg-slate-600 rounded p-4 text-xl md:p-2 md:text-base"
            onClick={() => move(0, 1)}
          >
            ▼
          </button>
        </div>

        <div className="grid gap-2">
          <Button onClick={() => setShowSolution((s) => !s)} variant="outline">
            Show shortest path (toggle)
          </Button>
          <Button onClick={handleResetPlayer} variant="outline">
            Reset player to start
          </Button>
        </div>
      </aside>

      {isWinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h5 className="text-xl font-bold mb-2">🎉 You escaped the maze!</h5>
            <p className="text-slate-300 mb-4">
              Time: <strong className="text-white">{time.toFixed(1)}s</strong> · Moves: <strong className="text-white">{moves}</strong>
            </p>
            <Button onClick={() => setIsWinModalOpen(false)}>Nice!</Button>
          </div>
        </div>
      )}
    </div>
  );
}


