/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, X } from 'lucide-react';

const ConnectorPage = () => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [coins, setCoins] = useState(0);
  const [trophies, setTrophies] = useState(0);
  const [timer, setTimer] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  
  // Level configurations with progressive difficulty
  const levels = [
    // Level 1: 3x3, 3 colors - Very Easy
    { grid: 3, colors: ['bone', 'circle-dark', 'circle-light'], walls: [] },
    // Level 2: 3x3, 3 colors - Easy
    { grid: 3, colors: ['bone', 'circle-dark', 'circle-light'], walls: [] },
    // Level 3: 4x4, 3 colors - Easy-Medium
    { grid: 4, colors: ['bone', 'circle-dark', 'circle-light'], walls: [] },
    // Level 4: 4x4, 4 colors - Medium
    { grid: 4, colors: ['bone', 'circle-dark', 'circle-light', 'star'], walls: [] },
    // Level 5: 4x4, 4 colors with 1 wall - Medium-Hard
    { grid: 4, colors: ['bone', 'circle-dark', 'circle-light', 'star'], walls: [{row: 1, col: 1}] },
    // Level 6: 5x5, 4 colors - Hard
    { grid: 5, colors: ['bone', 'circle-dark', 'circle-light', 'star'], walls: [] },
    // Level 7: 5x5, 5 colors - Hard
    { grid: 5, colors: ['bone', 'circle-dark', 'circle-light', 'star', 'heart'], walls: [] },
    // Level 8: 5x5, 5 colors with walls - Very Hard
    { grid: 5, colors: ['bone', 'circle-dark', 'circle-light', 'star', 'heart'], walls: [{row: 2, col: 2}] },
    // Level 9: 6x6, 5 colors - Expert
    { grid: 6, colors: ['bone', 'circle-dark', 'circle-light', 'star', 'heart'], walls: [] },
    // Level 10: 6x6, 6 colors - Master
    { grid: 6, colors: ['bone', 'circle-dark', 'circle-light', 'star', 'heart', 'diamond'], walls: [] }
  ];

  const currentLevel = levels[Math.min(round - 1, levels.length - 1)];
  const gridSize = currentLevel.grid;
  
  const [paths, setPaths] = useState<Record<string, {row: number, col: number}[]>>({});
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [endPoints, setEndPoints] = useState<Record<string, {row: number, col: number}[]>>({});
  const gridRef = useRef(null);

  // Backtracking solver to generate valid solutions
  const solveFlowPuzzle = (gridSize: number, colors: string[], walls: {row: number, col: number}[]): Record<string, {row: number, col: number}[]> | null => {
    const grid: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    
    // Mark walls
    walls.forEach(wall => {
      grid[wall.row][wall.col] = 'wall';
    });

    const endpoints: Record<string, {row: number, col: number}[]> = {};
    
    // Generate random endpoint pairs
    const availablePositions: {row: number, col: number}[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col] !== 'wall') {
          availablePositions.push({row, col});
        }
      }
    }

    // Shuffle and assign endpoints
    const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);
    colors.forEach((color, index) => {
      const start = shuffled[index * 2];
      const end = shuffled[index * 2 + 1];
      endpoints[color] = [start, end];
    });

    // Try to solve with backtracking
    const solution = backtrackSolve(grid, endpoints, colors, 0);
    return solution ? endpoints : null;
  };

  const backtrackSolve = (
    grid: (string | null)[][], 
    endpoints: Record<string, {row: number, col: number}[]>, 
    colors: string[], 
    colorIndex: number
  ): boolean => {
    if (colorIndex >= colors.length) return true;

    const color = colors[colorIndex];
    const [start, end] = endpoints[color];
    
    // Try to find a path from start to end
    const path = findPath(grid, start, end, color);
    if (path) {
      // Mark the path on the grid
      path.forEach(pos => {
        grid[pos.row][pos.col] = color;
      });
      
      // Recursively solve for next color
      if (backtrackSolve(grid, endpoints, colors, colorIndex + 1)) {
        return true;
      }
      
      // Backtrack: remove the path
      path.forEach(pos => {
        grid[pos.row][pos.col] = null;
      });
    }
    
    return false;
  };

  const findPath = (
    grid: (string | null)[][], 
    start: {row: number, col: number}, 
    end: {row: number, col: number}, 
    color: string
  ): {row: number, col: number}[] | null => {
    const visited = new Set<string>();
    const queue: {pos: {row: number, col: number}, path: {row: number, col: number}[]}[] = [];
    
    queue.push({pos: start, path: [start]});
    visited.add(`${start.row},${start.col}`);

    while (queue.length > 0) {
      const {pos, path} = queue.shift()!;
      
      if (pos.row === end.row && pos.col === end.col) {
        return path;
      }

      // Check all 4 directions
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        const newRow = pos.row + dr;
        const newCol = pos.col + dc;
        const key = `${newRow},${newCol}`;
        
        if (newRow >= 0 && newRow < grid.length && 
            newCol >= 0 && newCol < grid[0].length &&
            !visited.has(key) &&
            (grid[newRow][newCol] === null || grid[newRow][newCol] === color)) {
          
          visited.add(key);
          queue.push({
            pos: {row: newRow, col: newCol},
            path: [...path, {row: newRow, col: newCol}]
          });
        }
      }
    }
    
    return null;
  };

  const generateLevel = () => {
    let attempts = 0;
    let levelEndPoints: Record<string, {row: number, col: number}[]> | null = null;
    
    // Try to generate a solvable level (max 50 attempts)
    while (attempts < 50 && !levelEndPoints) {
      levelEndPoints = solveFlowPuzzle(gridSize, currentLevel.colors, currentLevel.walls);
      attempts++;
    }
    
    // Fallback to predefined levels if generation fails
    if (!levelEndPoints) {
      const fallbackLevels: Record<number, Record<string, {row: number, col: number}[]>> = {
        1: { // 3x3 - Simple horizontal lines
          'bone': [{row: 0, col: 0}, {row: 0, col: 2}],
          'circle-dark': [{row: 1, col: 0}, {row: 1, col: 2}],
          'circle-light': [{row: 2, col: 0}, {row: 2, col: 2}]
        },
        2: { // 3x3 - Different pattern
          'bone': [{row: 0, col: 0}, {row: 2, col: 2}],
          'circle-dark': [{row: 0, col: 2}, {row: 2, col: 0}],
          'circle-light': [{row: 1, col: 0}, {row: 1, col: 2}]
        },
        3: { // 4x4 - Edge pattern
          'bone': [{row: 0, col: 0}, {row: 0, col: 3}],
          'circle-dark': [{row: 3, col: 0}, {row: 3, col: 3}],
          'circle-light': [{row: 1, col: 1}, {row: 2, col: 2}]
        },
        4: { // 4x4 - 4 colors, simple pattern
          'bone': [{row: 0, col: 0}, {row: 0, col: 3}],
          'circle-dark': [{row: 3, col: 0}, {row: 3, col: 3}],
          'circle-light': [{row: 1, col: 0}, {row: 1, col: 3}],
          'star': [{row: 2, col: 0}, {row: 2, col: 3}]
        },
        5: { // 4x4 with wall - solvable pattern
          'bone': [{row: 0, col: 0}, {row: 0, col: 3}],
          'circle-dark': [{row: 3, col: 0}, {row: 3, col: 3}],
          'circle-light': [{row: 1, col: 0}, {row: 1, col: 3}],
          'star': [{row: 2, col: 0}, {row: 2, col: 3}]
        }
      };
      levelEndPoints = fallbackLevels[round] || fallbackLevels[1];
    }

    setEndPoints(levelEndPoints);
    setPaths({});
    setGameWon(false);
    setTimer(60);
    setIsGameActive(false);
  };

  // Generate random endpoints for current level
  useEffect(() => {
    generateLevel();
  }, [round]);

  // Timer countdown
  useEffect(() => {
    if (isGameActive && timer > 0 && !gameWon) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsGameActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGameActive, timer, gameWon]);

  const getShapeColor = (shape: string) => {
    switch(shape) {
      case 'bone': return 'from-green-300 to-green-400';
      case 'circle-dark': return 'from-green-600 to-green-700';
      case 'circle-light': return 'from-cyan-400 to-cyan-500';
      case 'star': return 'from-yellow-400 to-yellow-500';
      case 'heart': return 'from-pink-400 to-pink-500';
      case 'diamond': return 'from-purple-400 to-purple-500';
      case 'square': return 'from-orange-400 to-orange-500';
      case 'triangle': return 'from-red-400 to-red-500';
      default: return 'from-gray-800 to-gray-900';
    }
  };

  const getPathColor = (shape: string) => {
    switch(shape) {
      case 'bone': return 'bg-green-400';
      case 'circle-dark': return 'bg-green-700';
      case 'circle-light': return 'bg-cyan-400';
      case 'star': return 'bg-yellow-400';
      case 'heart': return 'bg-pink-400';
      case 'diamond': return 'bg-purple-400';
      case 'square': return 'bg-orange-400';
      case 'triangle': return 'bg-red-400';
      default: return 'bg-gray-500';
    }
  };

  const isWall = (row: number, col: number) => {
    return currentLevel.walls.some(wall => wall.row === row && wall.col === col);
  };

  const isEndPoint = (row: number, col: number) => {
    for (const [color, points] of Object.entries(endPoints)) {
      if (points.some(p => p.row === row && p.col === col)) {
        return color;
      }
    }
    return null;
  };

  const isAdjacent = (pos1: { row: number; col: number }, pos2: { row: number; col: number }) => {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  const handleCellMouseDown = (row: number, col: number) => {
    if (isWall(row, col)) return;
    const color = isEndPoint(row, col);
    if (color) {
      setIsDrawing(true);
      setCurrentPath(color);
      setPaths(prev => ({...prev, [color]: [{row, col}]}));
      setIsGameActive(true);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isDrawing || !currentPath || isWall(row, col)) return;
    const currentPathArr = paths[currentPath] || [];
    const lastPos = currentPathArr[currentPathArr.length - 1];
    
    if (!isAdjacent(lastPos, {row, col})) return;
    
    const indexInPath = currentPathArr.findIndex(p => p.row === row && p.col === col);
    if (indexInPath >= 0) {
      setPaths(prev => ({
        ...prev,
        [currentPath]: currentPathArr.slice(0, indexInPath + 1)
      }));
      return;
    }
    
    const endPoint = endPoints[currentPath]?.find(p => p.row === row && p.col === col);
    if (endPoint) {
      const newPath = [...currentPathArr, {row, col}];
      setPaths(prev => ({
        ...prev,
        [currentPath]: newPath
      }));
      setIsDrawing(false);
      setCurrentPath(null);
      setTimeout(() => checkWin({...paths, [currentPath]: newPath}), 100);
      return;
    }

    for (const [color, path] of Object.entries(paths)) {
      if (color !== currentPath && path.some(p => p.row === row && p.col === col)) {
        return;
      }
    }

    setPaths(prev => ({
      ...prev,
      [currentPath]: [...currentPathArr, {row, col}]
    }));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const checkWin = (allPaths: Record<string, {row: number, col: number}[]>) => {
    const allComplete = Object.entries(endPoints).every(([clr, endpoints]) => {
      const path = allPaths[clr] || [];
      return path.length > 0 && 
             path.some(p => p.row === endpoints[0].row && p.col === endpoints[0].col) &&
             path.some(p => p.row === endpoints[1].row && p.col === endpoints[1].col);
    });

    if (allComplete) {
      setGameWon(true);
      const timeBonus = timer * 10;
      const levelBonus = round * 100;
      const totalPoints = 500 + timeBonus + levelBonus;
      
      setTimeout(() => {
        setScore(prev => prev + totalPoints);
        setCoins(prev => prev + round * 10);
        if (round % 5 === 0) setTrophies(prev => prev + 1);
        
        if (round < 10) {
          setRound(prev => prev + 1);
        } else {
          alert('🎉 CONGRATULATIONS! You completed all 10 levels! 🏆');
        }
      }, 500);
    }
  };

  const resetGame = () => {
    generateLevel();
  };

  const isInPath = (row: number, col: number) => {
    for (const [color, path] of Object.entries(paths)) {
      if (path.some(p => p.row === row && p.col === col)) {
        return color;
      }
    }
    return null;
  };

  const renderShape = (color: string) => {
    switch(color) {
      case 'bone':
        return (
          <div className="relative w-4/5 h-1/3 flex items-center justify-center">
            <div className={`absolute w-full h-full bg-gradient-to-b ${getShapeColor(color)} rounded-full`}></div>
            <div className={`absolute -left-2 w-7 h-7 bg-gradient-to-b ${getShapeColor(color)} rounded-full`}></div>
            <div className={`absolute -right-2 w-7 h-7 bg-gradient-to-b ${getShapeColor(color)} rounded-full`}></div>
            <div className="absolute inset-1 flex items-center">
              <div className="w-full h-2/3 bg-gradient-to-b from-green-200/30 to-transparent rounded-full"></div>
            </div>
          </div>
        );
      case 'star':
        return (
          <div className="text-4xl">⭐</div>
        );
      case 'heart':
        return (
          <div className="text-4xl">❤️</div>
        );
      case 'diamond':
        return (
          <div className="text-4xl">💎</div>
        );
      case 'square':
        return (
          <div className={`w-3/4 h-3/4 bg-gradient-to-b ${getShapeColor(color)} rounded-lg shadow-lg`}>
            <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-lg"></div>
          </div>
        );
      case 'triangle':
        return (
          <div className="text-4xl">🔺</div>
        );
      default:
        return (
          <div className={`w-3/4 h-3/4 bg-gradient-to-b ${getShapeColor(color)} rounded-full shadow-lg`}>
            <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-500 flex flex-col items-center justify-between p-4 font-sans select-none">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex items-center bg-white rounded-full px-5 py-2.5 shadow-lg border-2 border-gray-200">
          <span className="text-2xl font-bold mr-2 text-gray-800">{trophies}</span>
          <div className="w-9 h-9 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
            <span className="text-lg">🏆</span>
          </div>
        </div>
        
        <div className="flex items-center bg-white rounded-full px-5 py-2.5 shadow-lg border-2 border-gray-200">
          <span className="text-2xl font-bold mr-2 text-gray-800">{coins}</span>
          <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full shadow-inner"></div>
        </div>
        
        <div className="flex items-center bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-full px-5 py-2.5 shadow-lg border-4 border-yellow-500">
          <span className="text-2xl font-bold mr-2 text-gray-800">{score}</span>
          <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-lg">🏆</span>
          </div>
        </div>
        
        <button 
          onClick={resetGame}
          className="w-16 h-16 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95 border-2 border-blue-300"
        >
          <RotateCcw className="w-8 h-8 text-white" strokeWidth={2.5} />
        </button>
        
        <button className="w-16 h-16 bg-gradient-to-b from-gray-700 to-gray-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95 border-2 border-gray-600">
          <X className="w-8 h-8 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Level Info */}
      <div className="text-center mb-4">
        <h2 className="text-3xl font-black text-white drop-shadow-lg">
          Level {round} / 10
        </h2>
        <p className="text-lg text-white/90 mt-1">
          Grid: {gridSize}x{gridSize} | Colors: {currentLevel.colors.length}
        </p>
      </div>

      {/* Game Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-2xl mb-8">
        <div 
          ref={gridRef}
          className="relative grid gap-1.5 bg-gray-900 p-3 rounded-2xl"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {Array.from({length: gridSize}).map((_, rowIndex) => (
            Array.from({length: gridSize}).map((_, colIndex) => {
              const endPointColor = isEndPoint(rowIndex, colIndex);
              const pathColor = isInPath(rowIndex, colIndex);
              const wall = isWall(rowIndex, colIndex);
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square rounded-xl transition-all duration-150 relative overflow-hidden ${
                    wall ? 'bg-gray-600' : pathColor ? getPathColor(pathColor) : 'bg-black'
                  } ${endPointColor ? 'cursor-pointer' : ''}`}
                  style={{ width: `${Math.min(60, 480 / gridSize)}px` }}
                  onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                >
                  {wall && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 text-2xl">
                      ⬛
                    </div>
                  )}
                  {endPointColor && !wall && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {renderShape(endPointColor)}
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Win message */}
      {gameWon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-4xl font-black text-gray-800 mb-2">Level Complete!</h2>
            <p className="text-xl text-gray-600 mb-4">
              +{500 + timer * 10 + round * 100} points
            </p>
            <button 
              onClick={() => setGameWon(false)}
              className="bg-gradient-to-b from-green-400 to-green-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform"
            >
              {round < 10 ? 'Next Level' : 'Play Again'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="w-full max-w-4xl">
        <div className="bg-gradient-to-r from-lime-400 via-lime-500 to-lime-400 rounded-full h-20 flex items-center justify-between px-8 shadow-lg border-4 border-lime-600">
          <div className="w-14 h-14 bg-gradient-to-b from-white to-gray-100 rounded-full flex items-center justify-center shadow-md border-3 border-gray-300">
            <div className="text-2xl font-bold text-gray-800">{timer}s</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white text-3xl font-black tracking-wider drop-shadow-lg">
              ROUND:
            </span>
            <span className="text-white text-4xl font-black tracking-wider drop-shadow-lg">
              {round}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectorPage;