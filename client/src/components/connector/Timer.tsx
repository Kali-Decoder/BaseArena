import React from 'react';

interface TimerProps {
  timer: number;
  round: number;
}

const Timer: React.FC<TimerProps> = ({ timer, round }) => {
  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-lg border border-white/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
            <div className="text-xl font-black text-white">{timer}s</div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-semibold uppercase">Time Left</span>
            <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000"
                style={{ width: `${(timer / 60) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-sm text-gray-500 font-semibold uppercase">Round</span>
          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            {round}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
