import React from 'react';

interface ShapeRendererProps {
  color: string;
  className?: string;
}

export const getShapeColor = (shape: string) => {
  switch(shape) {
    case 'bone': return 'from-emerald-400 to-emerald-500';
    case 'circle-dark': return 'from-teal-500 to-teal-600';
    case 'circle-light': return 'from-sky-400 to-sky-500';
    case 'star': return 'from-amber-400 to-amber-500';
    case 'heart': return 'from-rose-400 to-rose-500';
    case 'diamond': return 'from-violet-400 to-violet-500';
    case 'square': return 'from-orange-400 to-orange-500';
    case 'triangle': return 'from-red-400 to-red-500';
    default: return 'from-gray-300 to-gray-400';
  }
};

export const getPathColor = (shape: string) => {
  switch(shape) {
    case 'bone': return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    case 'circle-dark': return 'bg-gradient-to-r from-teal-500 to-teal-600';
    case 'circle-light': return 'bg-gradient-to-r from-sky-400 to-sky-500';
    case 'star': return 'bg-gradient-to-r from-amber-400 to-amber-500';
    case 'heart': return 'bg-gradient-to-r from-rose-400 to-rose-500';
    case 'diamond': return 'bg-gradient-to-r from-violet-400 to-violet-500';
    case 'square': return 'bg-gradient-to-r from-orange-400 to-orange-500';
    case 'triangle': return 'bg-gradient-to-r from-red-400 to-red-500';
    default: return 'bg-gray-400';
  }
};

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ color, className = "" }) => {
  return (
    <div className={`w-3/4 h-3/4 bg-gradient-to-br ${getShapeColor(color)} rounded-full shadow-lg relative ${className}`}>
      <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-gradient-to-br from-white/40 to-transparent rounded-full"></div>
    </div>
  );
};

export default ShapeRenderer;
