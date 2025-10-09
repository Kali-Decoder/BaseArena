import React, { RefObject } from 'react';
import ShapeRenderer, { getPathColor } from './ShapeRenderer';

interface GameGridProps {
  gridSize: number;
  gridRef: RefObject<HTMLDivElement | null>;
  isWall: (row: number, col: number) => boolean;
  isEndPoint: (row: number, col: number) => string | null;
  isInPath: (row: number, col: number) => string | null;
  handleCellMouseDown: (row: number, col: number) => void;
  handleCellMouseEnter: (row: number, col: number) => void;
  handleMouseUp: () => void;
}

const GameGrid: React.FC<GameGridProps> = ({
  gridSize,
  gridRef,
  isWall,
  isEndPoint,
  isInPath,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleMouseUp
}) => {
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;
    const target = (element as HTMLElement).closest('[data-row][data-col]') as HTMLElement | null;
    if (!target) return;
    const row = parseInt(target.getAttribute('data-row') || '', 10);
    const col = parseInt(target.getAttribute('data-col') || '', 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    e.preventDefault();
    handleCellMouseEnter(row, col);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 md:p-6 shadow-2xl border border-white/50">
      <div 
        ref={gridRef}
        className="relative grid gap-2 bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-2xl shadow-inner"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, touchAction: 'none' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
        onTouchCancel={(e) => { e.preventDefault(); handleMouseUp(); }}
        onTouchMove={handleTouchMove}
      >
        {Array.from({length: gridSize}).map((_, rowIndex) => (
          Array.from({length: gridSize}).map((_, colIndex) => {
            const endPointColor = isEndPoint(rowIndex, colIndex);
            const pathColor = isInPath(rowIndex, colIndex);
            const wall = isWall(rowIndex, colIndex);
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                className={`aspect-square rounded-2xl transition-all duration-200 relative overflow-hidden ${
                  wall 
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-inner' 
                    : pathColor 
                    ? `${getPathColor(pathColor)} shadow-lg` 
                    : 'bg-white shadow-sm hover:shadow-md'
                } ${endPointColor ? 'cursor-pointer hover:scale-105' : ''}`}
                style={{ 
                  width: `${Math.min(70, 400 / gridSize)}px`,
                  boxShadow: pathColor ? '0 4px 12px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.3)' : undefined
                }}
                onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                onTouchStart={(e) => { e.preventDefault(); handleCellMouseDown(rowIndex, colIndex); }}
              >
                {wall && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xl opacity-50">
                    ⬛
                  </div>
                )}
                {endPointColor && !wall && (
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <ShapeRenderer color={endPointColor} />
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default GameGrid;
