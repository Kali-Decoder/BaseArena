import React from 'react';
import { RotateCcw, X } from 'lucide-react';

interface GameHUDProps {
  trophies: number;
  coins: number;
  score: number;
  onReset: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ trophies, coins, score, onReset }) => {
  return (
    <div className="w-full flex flex-wrap justify-between items-center gap-3">
      <div className="flex items-center bg-white/80 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-white/40 hover:bg-white/90 transition-all">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
          <span className="text-sm">🏆</span>
        </div>
        <span className="text-xl font-bold text-gray-800">{trophies}</span>
      </div>
      
      <div className="flex items-center bg-white/80 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-white/40 hover:bg-white/90 transition-all">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mr-2 shadow-sm flex items-center justify-center">
          <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
        </div>
        <span className="text-xl font-bold text-gray-800">{coins}</span>
      </div>
      
      <div className="flex items-center bg-gradient-to-br from-amber-300 to-orange-400 rounded-2xl px-4 py-2 shadow-lg border-2 border-amber-400/50 hover:scale-105 transition-transform">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-2 shadow-md">
          <span className="text-sm">⭐</span>
        </div>
        <span className="text-xl font-black text-white drop-shadow-sm">{score}</span>
      </div>
      
      <button 
        onClick={onReset}
        className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95 border border-indigo-300/50"
      >
        <RotateCcw className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>
      
      <button className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95 border border-gray-500/50">
        <X className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default GameHUD;
