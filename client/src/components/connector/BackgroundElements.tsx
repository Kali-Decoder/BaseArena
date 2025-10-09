import React from 'react';

const BackgroundElements: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-10 w-32 h-32 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
      <div 
        className="absolute bottom-20 right-10 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl animate-pulse" 
        style={{animationDelay: '1s'}}
      ></div>
      <div 
        className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-200/30 rounded-full blur-2xl animate-pulse" 
        style={{animationDelay: '2s'}}
      ></div>
    </div>
  );
};

export default BackgroundElements;
