/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Music2, Zap } from 'lucide-react';

// Type definitions
type GameState = 'ready' | 'playing' | 'paused' | 'gameover';

interface Tile {
  id: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  live: boolean;
}

interface Column {
  key: string;
  keyCode: number;
  x: number;
  color: string;
}

const PianoTilesGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const scoreBarRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState<number>(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [eachState, setEachState] = useState<boolean[]>([false, false, false, false, false]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  
  const numOfTiles = 5;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const geneRef = useRef<NodeJS.Timeout | null>(null);
  const currentKeyRef = useRef<number | null>(null);

  const columns: Column[] = [
    { key: 'A', keyCode: 65, x: 0, color: '#3B82F6' },
    { key: 'S', keyCode: 83, x: 75, color: '#60A5FA' },
    { key: 'D', keyCode: 68, x: 152, color: '#93C5FD' },
    { key: 'F', keyCode: 70, x: 228, color: '#DBEAFE' }
  ];

  // Paint background
  useEffect(() => {
    if (backgroundRef.current) {
      const ctx = backgroundRef.current.getContext('2d');
      if (!ctx) return;
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 600);
      gradient.addColorStop(0, 'rgba(147, 197, 253, 0.3)');
      gradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.4)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 600);

      // Draw column lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      [72, 148, 226].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      });

      // Draw hitting zone line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 470);
      ctx.lineTo(300, 470);
      ctx.stroke();
    }
  }, []);

  // Paint score bar
  useEffect(() => {
    if (scoreBarRef.current) {
      const ctx = scoreBarRef.current.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, 300, 70);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 70);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 70);
      
      ctx.font = 'bold 32px Arial';
      ctx.fillStyle = '#1E40AF';
      ctx.textAlign = 'center';
      ctx.fillText(score.toString(), 150, 48);
    }
  }, [score]);

  // Audio setup
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.preload = 'auto';
      
      // Add error event listener
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Audio error details:', audioRef.current?.error);
      });
      
      // Add load event listener
      audioRef.current.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully');
      });
      
      // Add canplay event listener
      audioRef.current.addEventListener('canplay', () => {
        console.log('Audio can play');
      });
    }
  }, []);

  // Enable audio on user interaction
  const enableAudio = async (): Promise<void> => {
    if (audioRef.current && !audioEnabled) {
      try {
        await audioRef.current.play();
        setAudioEnabled(true);
        console.log('Audio started successfully');
      } catch (error) {
        console.error('Audio play failed:', error);
      }
    }
  };

  // Auto-start audio when game starts
  const startAudio = async (): Promise<void> => {
    if (audioRef.current && !audioEnabled) {
      try {
        await audioRef.current.play();
        setAudioEnabled(true);
        console.log('Audio started automatically');
      } catch (error) {
        console.error('Auto audio start failed:', error);
      }
    }
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      currentKeyRef.current = e.keyCode;
    };
    const handleKeyUp = () => {
      currentKeyRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Generate blocks
  const geneBlock = (): void => {
    setEachState(prevState => {
      const allTrue = prevState.every(state => state);
      if (allTrue) return prevState;

      let myRand = Math.floor(Math.random() * numOfTiles);
      while (prevState[myRand]) {
        myRand = Math.floor(Math.random() * numOfTiles);
      }

      const appearPos = Math.floor(Math.random() * 4);
      const newTile: Tile = {
        id: Date.now() + Math.random(),
        index: myRand,
        x: columns[appearPos].x,
        y: -120,
        width: 70,
        height: 120,
        live: true
      };

      setTiles(prev => [...prev, newTile]);
      
      const newState = [...prevState];
      newState[myRand] = true;
      return newState;
    });
  };

  // Update game
  const update = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setTiles(prevTiles => {
      const updatedTiles: Tile[] = [];

      prevTiles.forEach((tile) => {
        if (tile.live) {
          // Clear old position
          ctx.clearRect(tile.x, tile.y - 2, 70, 122);
          
          // Update position
          tile.y += 1;

          // Draw tile with blockchain theme
          const gradient = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + 120);
          gradient.addColorStop(0, '#1E40AF');
          gradient.addColorStop(1, '#3B82F6');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(tile.x, tile.y, 70, 120);
          
          // Add cartoonish border
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.strokeRect(tile.x, tile.y, 70, 120);
          
          // Add blockchain-style icon
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('⬢', tile.x + 35, tile.y + 70);

          // Check if tile reached bottom
          if (tile.y > 470) {
            ctx.clearRect(tile.x, tile.y, 70, 120);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fillRect(tile.x, tile.y, 70, 120);
            
            setGameState('gameover');
            stopGame();
            return;
          }

          // Check keyboard hit
          if (tile.y >= 0 && tile.y < 470) {
            let shouldHit = false;
            const keyCode = currentKeyRef.current;

            columns.forEach(col => {
              if (keyCode === col.keyCode && tile.x === col.x) {
                shouldHit = true;
              }
            });

            if (shouldHit) {
              // Check if it's the closest tile in this column
              const isClosest = !prevTiles.some(other => 
                other.live && 
                other !== tile && 
                other.x === tile.x && 
                Math.abs(other.y - 410) < Math.abs(tile.y - 410)
              );

              if (isClosest) {
                ctx.clearRect(tile.x, tile.y, 70, 120);
                tile.live = false;
                setScore(s => s + 1);
                setEachState(prev => {
                  const newState = [...prev];
                  newState[tile.index] = false;
                  return newState;
                });
                currentKeyRef.current = null;
                return;
              }
            }
          }

          updatedTiles.push(tile);
        }
      });

      return updatedTiles;
    });
  };

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let column = -1;
    if (clickX >= 0 && clickX < 75) column = 0;
    else if (clickX >= 75 && clickX < 152) column = 1;
    else if (clickX >= 152 && clickX < 228) column = 2;
    else if (clickX >= 228 && clickX < 300) column = 3;

    if (column === -1) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setTiles(prevTiles => {
      for (let i = 0; i < prevTiles.length; i++) {
        const tile = prevTiles[i];
        if (tile.live && tile.x === columns[column].x) {
          const tileTop = tile.y;
          const tileBottom = tile.y + 120;
          
          if (clickY >= tileTop && clickY <= tileBottom) {
            ctx.clearRect(tile.x, tile.y, 70, 120);
            tile.live = false;
            setScore(s => s + 1);
            setEachState(prev => {
              const newState = [...prev];
              newState[tile.index] = false;
              return newState;
            });
            break;
          }
        }
      }
      return prevTiles.filter(t => t.live);
    });
  };

  const startGame = (): void => {
    setGameState('playing');
    setScore(0);
    setTiles([]);
    setEachState([false, false, false, false, false]);
    
    // Clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 300, 600);
    
    // Start audio automatically when game starts
    startAudio();
    
    intervalRef.current = setInterval(update, 16); // ~60 FPS instead of 200 FPS
    geneRef.current = setInterval(geneBlock, 1000); // Slower tile generation
  };

  const stopGame = (): void => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (geneRef.current) clearInterval(geneRef.current);
    
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioEnabled(false);
    }
  };

  const pauseGame = (): void => {
    if (gameState === 'playing') {
      stopGame();
      setGameState('paused');
    } else if (gameState === 'paused') {
      intervalRef.current = setInterval(update, 16); // ~60 FPS instead of 200 FPS
      geneRef.current = setInterval(geneBlock, 1000); // Slower tile generation
      
      // Resume audio
      if (audioRef.current && audioEnabled) {
        audioRef.current.play().catch((error) => {
          console.error('Audio resume failed:', error);
        });
      }
      
      setGameState('playing');
    }
  };

  const resetGame = (): void => {
    stopGame();
    setGameState('ready');
    setScore(0);
    setTiles([]);
    setEachState([false, false, false, false, false]);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 300, 600);
  };

  useEffect(() => {
    return () => stopGame();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Background Audio */}
      <audio ref={audioRef} loop preload="auto">
        <source src="/assets/MUSIC.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      
      <div className="relative">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg transform rotate-12">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black text-blue-900" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              Piano Tiles
            </h1>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transform -rotate-12">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-blue-600 font-semibold text-sm">Use A, S, D, F keys or tap tiles!</p>
        </div>

        {/* Score Bar */}
        <div className="relative mb-4">
          <canvas 
            ref={scoreBarRef}
            width="300" 
            height="70"
            className="rounded-t-3xl shadow-lg border-4 border-white"
          />
        </div>

        {/* Game Area */}
        <div className="relative">
          <canvas 
            ref={backgroundRef}
            width="300" 
            height="600"
            className="absolute top-0 left-0 rounded-b-3xl"
          />
          <canvas 
            ref={canvasRef}
            width="300" 
            height="600"
            className="relative rounded-b-3xl shadow-2xl border-4 border-white cursor-pointer"
            onClick={handleCanvasClick}
          />
          
          {/* Key hints at bottom - properly aligned with columns */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-start px-0">
            {columns.map((col, idx) => (
              <div 
                key={idx}
                className="w-[70px] h-8 bg-white/80 rounded-lg shadow-md flex items-center justify-center border border-blue-400"
                style={{ marginLeft: idx === 0 ? '2px' : '4px' }}
              >
                <span className="text-sm font-bold text-blue-600">{col.key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Control Buttons - moved to top */}
        <div className="flex gap-3 justify-center mb-4 mt-3">
          {gameState === 'ready' && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-black text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              <Play className="w-5 h-5" fill="white" />
              START
            </button>
          )}
          
          {(gameState === 'playing' || gameState === 'paused') && (
            <>
              <button
                onClick={pauseGame}
                className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full font-black text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
                style={{ fontFamily: 'Comic Sans MS, cursive' }}
              >
                {gameState === 'playing' ? (
                  <>
                    <Pause className="w-4 h-4" fill="white" />
                    PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="white" />
                    RESUME
                  </>
                )}
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-black text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
                style={{ fontFamily: 'Comic Sans MS, cursive' }}
              >
                <RotateCcw className="w-4 h-4" />
                RESET
              </button>
            </>
          )}
          
          {/* Audio Status Indicator
          <div
            className={`px-3 py-3 rounded-full font-bold text-xs shadow-lg flex items-center gap-1 ${
              audioEnabled 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            <Music2 className="w-3 h-3" />
            {audioEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
          </div> */}
        </div>

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-blue-900/90 backdrop-blur-sm rounded-3xl flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-8xl mb-4">😢</div>
              <h2 className="text-5xl font-black text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                Game Over!
              </h2>
              <div className="bg-white/20 rounded-2xl p-6 mb-6">
                <p className="text-white/80 text-lg mb-2">Final Score</p>
                <p className="text-6xl font-black text-white">{score}</p>
              </div>
              <button
                onClick={resetGame}
                className="px-8 py-4 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full font-black text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                style={{ fontFamily: 'Comic Sans MS, cursive' }}
              >
                <RotateCcw className="w-6 h-6" />
                TRY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PianoTilesGame;