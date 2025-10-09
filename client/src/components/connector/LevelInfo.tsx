import React from 'react';

interface LevelInfoProps {
  round: number;
  gridSize: number;
  colorsCount: number;
}

const LevelInfo: React.FC<LevelInfoProps> = ({ round, gridSize, colorsCount }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl px-8 py-4 shadow-xl border border-white/40">
      <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 text-center">
        Level {round} / 10
      </h2>
      <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-600 font-semibold">
        <span className="bg-purple-100 px-3 py-1 rounded-full">Grid: {gridSize}×{gridSize}</span>
        <span className="bg-pink-100 px-3 py-1 rounded-full">Colors: {colorsCount}</span>
      </div>
    </div>
  );
};

export default LevelInfo;
