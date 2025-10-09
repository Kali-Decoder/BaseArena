/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import React from 'react';
import { useGameLogic } from '../../hooks/useGameLogic';
import GameHUD from '../../components/GameHUD';
import LevelInfo from '../../components/LevelInfo';
import GameGrid from '../../components/GameGrid';
import Timer from '../../components/Timer';
import WinModal from '../../components/WinModal';
import BackgroundElements from '../../components/BackgroundElements';
import GameAnimations from '../../components/GameAnimations';

const ConnectorPage = () => {
  const {
    gameState,
    currentLevel,
    gridSize,
    gridRef,
    isWall,
    isEndPoint,
    isInPath,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    resetGame,
    setGameWon
  } = useGameLogic();


  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans select-none relative overflow-hidden">
      <BackgroundElements />

      {/* Container for all game content */}
      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center gap-4">
        
        {/* Top Bar - Glassmorphism HUD */}
        <GameHUD 
          trophies={gameState.trophies}
          coins={gameState.coins}
          score={gameState.score}
          onReset={resetGame}
        />

        {/* Level Info Card */}
        <LevelInfo 
          round={gameState.round}
          gridSize={gridSize}
          colorsCount={currentLevel.colors.length}
        />

        {/* Game Grid */}
        <GameGrid
          gridSize={gridSize}
          gridRef={gridRef}
          isWall={isWall}
          isEndPoint={isEndPoint}
          isInPath={isInPath}
          handleCellMouseDown={handleCellMouseDown}
          handleCellMouseEnter={handleCellMouseEnter}
          handleMouseUp={handleMouseUp}
        />

        {/* Timer Bar */}
        <Timer 
          timer={gameState.timer}
          round={gameState.round}
        />
      </div>

      {/* Win Modal */}
      <WinModal 
        isVisible={gameState.gameWon}
        round={gameState.round}
        timer={gameState.timer}
        onClose={() => setGameWon(false)}
      />

      <GameAnimations />
    </div>
  );
};

export default ConnectorPage;