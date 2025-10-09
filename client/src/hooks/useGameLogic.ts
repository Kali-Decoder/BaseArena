import { useState, useEffect, useRef } from 'react';

export interface GameLevel {
  grid: number;
  colors: string[];
  walls: {row: number, col: number}[];
}

export interface GameState {
  score: number;
  round: number;
  coins: number;
  trophies: number;
  timer: number;
  isGameActive: boolean;
  gameWon: boolean;
}

export interface PathData {
  [color: string]: {row: number, col: number}[];
}

export interface EndPointData {
  [color: string]: {row: number, col: number}[];
}

export const useGameLogic = () => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [coins, setCoins] = useState(0);
  const [trophies, setTrophies] = useState(0);
  const [timer, setTimer] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  
  // Level configurations with progressive difficulty
  const levels: GameLevel[] = [
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
  
  const [paths, setPaths] = useState<PathData>({});
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [endPoints, setEndPoints] = useState<EndPointData>({});
  const gridRef = useRef<HTMLDivElement>(null);

  // Backtracking solver to generate valid solutions
  const solveFlowPuzzle = (gridSize: number, colors: string[], walls: {row: number, col: number}[]): EndPointData | null => {
    const grid: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    
    // Mark walls
    walls.forEach(wall => {
      grid[wall.row][wall.col] = 'wall';
    });

    const endpoints: EndPointData = {};
    
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
    endpoints: EndPointData, 
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
    let levelEndPoints: EndPointData | null = null;
    
    // Try to generate a solvable level (max 50 attempts)
    while (attempts < 50 && !levelEndPoints) {
      levelEndPoints = solveFlowPuzzle(gridSize, currentLevel.colors, currentLevel.walls);
      attempts++;
    }
    
    // Fallback to predefined levels if generation fails
    if (!levelEndPoints) {
      const fallbackLevels: Record<number, EndPointData> = {
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

  const checkWin = (allPaths: PathData) => {
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

  const gameState: GameState = {
    score,
    round,
    coins,
    trophies,
    timer,
    isGameActive,
    gameWon
  };

  return {
    gameState,
    currentLevel,
    gridSize,
    paths,
    endPoints,
    gridRef: gridRef as React.RefObject<HTMLDivElement | null>,
    isWall,
    isEndPoint,
    isInPath,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    resetGame,
    setGameWon
  };
};
