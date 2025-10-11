"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useRef, useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import { SessionParamsContext } from "./layout";
import { 
  useConnectedUsers, 
  useStateTogether, 
  useStateTogetherWithPerUserValues, 
  useMyId, 
  useJoinUrl, 
  useLeaveSession, 
  useFunctionTogether 
} from "react-together";

type Coordinate = { row: number; col: number };
type GameRoute = "home" | "lobby" | "game";

type GameState = {
  route: GameRoute;
  dotCount: number;
  firstDot: Coordinate | null;
  secondDot: Coordinate | null;
  isMuted: boolean;
};

type GameAction =
  | { type: "routeTo"; route: GameRoute }
  | { type: "setFirstDot"; dot: Coordinate }
  | { type: "setSecondDot"; dot: Coordinate }
  | { type: "resetFirstDot" }
  | { type: "changeGameSize"; size: number }
  | { type: "changeVolume"; volume: 0 | 1 };

const FIXED_PASSWORD = process.env.NEXT_PUBLIC_MULTISYNQ_SESSION_PASSWORD || 'kalidecoder';

// Random name generator for players
const RANDOM_NAMES = [
  "Tiger", "Lion", "Bear", "Wolf", "Fox", "Eagle", "Hawk", "Dragon",
  "Phoenix", "Shark", "Panther", "Falcon", "Viper", "Cobra", "Raven"
];

function generatePlayerName(userId: string): string {
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return RANDOM_NAMES[index % RANDOM_NAMES.length] + userId.slice(0, 3);
}

function getRoomIdFromJoinUrl(joinUrl: string | null): string {
  if (!joinUrl) return '';
  const match = joinUrl.match(/[?&]rtName=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : joinUrl;
}

function squareNodeId(row: number, col: number): string {
  return `r${row}c${col}`;
}

function normalizeEdge(a: Coordinate, b: Coordinate): [Coordinate, Coordinate] {
  if (a.col < b.col) return [a, b];
  if (a.col > b.col) return [b, a];
  if (a.row <= b.row) return [a, b];
  return [b, a];
}

function squareEdgeId(a: Coordinate, b: Coordinate): string {
  const [first, second] = normalizeEdge(a, b);
  return `${squareNodeId(first.row, first.col)}-${squareNodeId(second.row, second.col)}`;
}

function squareFaceId(nodes: Coordinate[]): string {
  const sep = ",";
  return (
    squareEdgeId(nodes[0], nodes[1]) +
    sep +
    squareEdgeId(nodes[1], nodes[2]) +
    sep +
    squareEdgeId(nodes[2], nodes[3]) +
    sep +
    squareEdgeId(nodes[3], nodes[0])
  );
}

function squareGraphEdges(size: number): Record<string, boolean> {
  const edges: Record<string, boolean> = {};
  for (let row = 1; row <= size; row++) {
    for (let col = 1; col <= size; col++) {
      if (col < size) {
        const horizontal = squareEdgeId({ row, col }, { row, col: col + 1 });
        edges[horizontal] = false;
      }
      if (row < size) {
        const vertical = squareEdgeId({ row, col }, { row: row + 1, col });
        edges[vertical] = false;
      }
    }
  }
  return edges;
}

function squareGraphFaces(size: number): Record<string, number> {
  const faces: Record<string, number> = {};
  for (let row = 1; row < size; row++) {
    for (let col = 1; col < size; col++) {
      const id = squareFaceId([
        { row, col },
        { row, col: col + 1 },
        { row: row + 1, col: col + 1 },
        { row: row + 1, col },
      ]);
      faces[id] = 0;
    }
  }
  return faces;
}

function adjacentSquareFacesOfEdge(a: Coordinate, b: Coordinate, dotCount: number): Coordinate[][] {
  const faces: Coordinate[][] = [];
  if (a.row === b.row) {
    const topRow = a.row - 1;
    const leftCol = Math.min(a.col, b.col);
    if (topRow > 0) {
      faces.push([
        { row: topRow, col: leftCol },
        { row: topRow, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol },
      ]);
    }
    if (topRow <= dotCount) {
      faces.push([
        { row: topRow + 1, col: leftCol },
        { row: topRow + 1, col: leftCol + 1 },
        { row: topRow + 2, col: leftCol + 1 },
        { row: topRow + 2, col: leftCol },
      ]);
    }
  } else {
    const topRow = Math.min(a.row, b.row);
    const leftCol = a.col - 1;
    if (leftCol > 0) {
      faces.push([
        { row: topRow, col: leftCol },
        { row: topRow, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol },
      ]);
    }
    if (leftCol <= dotCount) {
      faces.push([
        { row: topRow, col: leftCol + 1 },
        { row: topRow, col: leftCol + 2 },
        { row: topRow + 1, col: leftCol + 2 },
        { row: topRow + 1, col: leftCol + 1 },
      ]);
    }
  }
  return faces;
}

function isAdjacent(a: Coordinate, b: Coordinate): boolean {
  return (
    (a.row === b.row && (a.col === b.col - 1 || a.col === b.col + 1)) ||
    (a.col === b.col && (a.row === b.row - 1 || a.row === b.row + 1))
  );
}

function getFirstGrapheme(text: string): string {
  const arr = Array.from(text || "");
  return arr.length > 0 ? arr[0] : "";
}

function initialState(): GameState {
  const INITIAL_DOT_COUNT = 4;
  return {
    route: "home",
    dotCount: INITIAL_DOT_COUNT,
    firstDot: null,
    secondDot: null,
    isMuted: false,
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "routeTo":
      return { ...state, route: action.route };
    case "setFirstDot":
      return { ...state, firstDot: action.dot, secondDot: null };
    case "setSecondDot":
      return { ...state, secondDot: action.dot };
    case "resetFirstDot":
      return { ...state, firstDot: null };
    case "changeGameSize":
      return { ...state, dotCount: action.size };
    case "changeVolume":
      return { ...state, isMuted: action.volume === 0 };
    default:
      return state;
  }
}

export default function DotGamePage() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const myId = useMyId();
  const users = useConnectedUsers();
  const joinUrl = useJoinUrl();
  const leaveSession = useLeaveSession();
  const { setSessionName, setSessionPassword } = useContext(SessionParamsContext);

  // Multiplayer dialog state
  const [showMultiplayerDialog, setShowMultiplayerDialog] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isRoomCreator, setIsRoomCreator] = useState(false);

  // Shared multiplayer state
  const [gameStarted, setGameStarted] = useStateTogether('gameStarted', false);
  const [countdown, setCountdown] = useStateTogether('countdown', 0);
  const [gameId, setGameId] = useStateTogether('gameId', 1);
  const [sessionLocked, setSessionLocked] = useStateTogether('sessionLocked', false);
  const [allowedUsers, setAllowedUsers] = useStateTogether<string[]>('allowedUsers', []);
  const [sessionEnded, setSessionEnded] = useStateTogether('sessionEnded', false);
  const [waitingForPlayers, setWaitingForPlayers] = useStateTogether('waitingForPlayers', false);
  const [waitingTimer, setWaitingTimer] = useStateTogether('waitingTimer', 30);
  const [waitingReason, setWaitingReason] = useStateTogether('waitingReason', '');
  const [hostUserId, setHostUserId] = useStateTogether('hostUserId', '');
  
  // Shared game state
  const [sharedDotCount, setSharedDotCount] = useStateTogether('dotCount', 4);
  const [edges, setEdges] = useStateTogether<Record<string, boolean>>('edges', squareGraphEdges(4));
  const [faces, setFaces] = useStateTogether<Record<string, number>>('faces', squareGraphFaces(4));
  const [currentPlayer, setCurrentPlayer] = useStateTogether<1 | 2>('currentPlayer', 1);
  const [scores, setScores] = useStateTogether<{ 1: number; 2: number }>('scores', { 1: 0, 2: 0 });
  const [gameOver, setGameOver] = useStateTogether('gameOver', false);
  const [playerUserIds, setPlayerUserIds] = useStateTogether<{ 1: string; 2: string }>('playerUserIds', { 1: '', 2: '' });
  
  // Per-user state
  const [myTotalScore, setMyTotalScore, allTotalScores] = useStateTogetherWithPerUserValues('totalScore', 0);
  const [myPlayerNumber, setMyPlayerNumber, allPlayerNumbers] = useStateTogetherWithPerUserValues<1 | 2 | null>('playerNumber', null);

  // Game results tracking
  type GameResults = { [gameId: number]: { [userId: string]: number } };
  const [gameResults, setGameResults] = useStateTogether<GameResults>('gameResults', {});

  // Force end session function
  const forceEndSession = useFunctionTogether('force-end-session', useCallback(() => {
    leaveSession();
    setSessionName(null);
    setSessionPassword(null);
    dispatch({ type: "routeTo", route: "home" });
  }, [leaveSession, setSessionName, setSessionPassword]));

  const waitingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isBeingKicked, setIsBeingKicked] = useState(false);

  // Set initial host (only for room creator)
  useEffect(() => {
    if (isRoomCreator && myId && !hostUserId) {
      setHostUserId(myId);
    }
  }, [isRoomCreator, myId, hostUserId, setHostUserId]);

  // Reset shared state when room creator enters (like multisynq)
  useEffect(() => {
    if (isRoomCreator && myId) {
      setGameStarted(false);
      setCountdown(0);
      setGameId(1);
      setGameResults({});
      setSessionLocked(false);
      setAllowedUsers([]);
      setSessionEnded(false);
      setWaitingForPlayers(false);
      setWaitingTimer(30);
      setWaitingReason('');
      setGameOver(false);
      setEdges(squareGraphEdges(sharedDotCount));
      setFaces(squareGraphFaces(sharedDotCount));
      setScores({ 1: 0, 2: 0 });
      setCurrentPlayer(1);
    }
    // eslint-disable-next-line
  }, [isRoomCreator, myId]);

  // Host transfer logic
  useEffect(() => {
    if (users.length > 0 && hostUserId) {
      const currentHost = users.find(u => u.userId === hostUserId);
      if (!currentHost && users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        setHostUserId(randomUser.userId);
      }
    }
  }, [users, hostUserId, setHostUserId]);

  const isCurrentHost = myId === hostUserId;

  // Check if session is ended or locked (only for NEW joiners, not current participants)
  useEffect(() => {
    if (myId) {
      // Check if session is ended
      if (sessionEnded) {
        // ONLY show kicked screen if user is NOT in allowedUsers (new joiner trying to join ended session)
        const wasInSession = allowedUsers.length > 0 && allowedUsers.includes(myId);
        if (!wasInSession) {
          setIsBeingKicked(true);
        }
        // If user WAS in session, forceEndSession will handle them (direct to home)
        return;
      }
      
      // Check if session is locked and user is not allowed
      if (sessionLocked && allowedUsers.length > 0) {
        const isAllowed = allowedUsers.includes(myId);
        if (!isAllowed) {
          // New user trying to join locked session - show kick message
          setIsBeingKicked(true);
        }
      }
    }
  }, [sessionLocked, sessionEnded, myId, allowedUsers]);

  // Assign player numbers when session locks
  useEffect(() => {
    if (sessionLocked && myId && allowedUsers.length === 2 && !myPlayerNumber) {
      const myIndex = allowedUsers.indexOf(myId);
      if (myIndex !== -1) {
        setMyPlayerNumber((myIndex + 1) as 1 | 2);
        
        // Set player user IDs mapping
        if (isCurrentHost) {
          setPlayerUserIds({
            1: allowedUsers[0],
            2: allowedUsers[1]
          });
        }
      }
    }
  }, [sessionLocked, myId, allowedUsers, myPlayerNumber, setMyPlayerNumber, isCurrentHost, setPlayerUserIds]);

  // Handle user count changes during gameplay
  useEffect(() => {
    const userCount = users.length;
    
    if (gameStarted && !gameOver && userCount < 2) {
      setWaitingForPlayers(true);
      setWaitingTimer(30);
      setWaitingReason('A player left during the game. Waiting for them to rejoin...');
    }
    
    if (gameStarted && !gameOver && userCount >= 2 && waitingForPlayers) {
      setWaitingForPlayers(false);
      setWaitingTimer(30);
      setWaitingReason('');
    }
  }, [users.length, gameStarted, gameOver, waitingForPlayers, setWaitingForPlayers, setWaitingTimer, setWaitingReason]);

  // Waiting timer during gameplay
  useEffect(() => {
    if (waitingForPlayers && waitingTimer > 0 && gameStarted && !gameOver) {
      waitingTimerRef.current = setTimeout(() => {
        setWaitingTimer(prev => {
          if (prev <= 1) {
            if (isCurrentHost) {
              setSessionEnded(true);
              forceEndSession();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current);
      }
    };
  }, [waitingForPlayers, waitingTimer, gameStarted, gameOver, isCurrentHost, forceEndSession]);

  // Audio setup
  const [audioCtx] = useState<null | AudioContext>(() => {
    if (typeof window === "undefined") return null;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    try { return new Ctx(); } catch { return null; }
  });

  const playTap = useCallback(() => {
    if (!audioCtx || state.isMuted) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.12);
  }, [audioCtx, state.isMuted]);

  const playCollect = useCallback(() => {
    if (!audioCtx || state.isMuted) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(660, audioCtx.currentTime);
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.18);
  }, [audioCtx, state.isMuted]);

  const [isMuted, setMuted] = useState<boolean>(false);
  const toggleVolume = useCallback(() => {
    const next = !isMuted;
    setMuted(next);
    dispatch({ type: "changeVolume", volume: next ? 0 : 1 });
  }, [isMuted]);

  // Multiplayer actions
  const handleCreateRoom = () => {
    const randomName = Math.random().toString(36).substring(2, 16);
    setSessionName(randomName);
    setSessionPassword(FIXED_PASSWORD);
    setShowMultiplayerDialog(false);
    setIsRoomCreator(true);
    dispatch({ type: "routeTo", route: "lobby" });
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setJoinError("Please enter a room ID.");
      return;
    }
    setSessionName(joinRoomId);
    setSessionPassword(FIXED_PASSWORD);
    setShowMultiplayerDialog(false);
    setJoinRoomId("");
    setJoinError("");
    setIsRoomCreator(false);
    dispatch({ type: "routeTo", route: "lobby" });
  };

  const handleStartGame = () => {
    if (isCurrentHost && users.length >= 2) {
      if (!sessionLocked) {
        setSessionLocked(true);
        setAllowedUsers(users.map(u => u.userId));
      }
      
      // Initialize game state
      setEdges(squareGraphEdges(sharedDotCount));
      setFaces(squareGraphFaces(sharedDotCount));
      setScores({ 1: 0, 2: 0 });
      setCurrentPlayer(1);
      setGameOver(false);
      setCountdown(3);
      // Note: Route change happens in countdown useEffect for ALL players
    }
  };

  const handleEndSession = () => {
    if (isCurrentHost) {
      // Reset waiting state first (prevent waiting screen from showing)
      setWaitingForPlayers(false);
      setWaitingTimer(30);
      setWaitingReason('');
      
      // Call forceEndSession to immediately send all current users home
      forceEndSession();
      // Then set flag for future joiners (after a small delay to ensure current users have left)
      setTimeout(() => setSessionEnded(true), 100);
    }
  };

  const handleLeaveGame = () => {
    setIsBeingKicked(false); // Reset kicked state before leaving
    
    // Reset waiting state before leaving (prevent waiting screen from showing)
    setWaitingForPlayers(false);
    setWaitingTimer(30);
    setWaitingReason('');
    
    leaveSession();
    setSessionName(null);
    setSessionPassword(null);
    dispatch({ type: "routeTo", route: "home" });
  };

  const setupNextGame = () => {
    if (isCurrentHost) {
      setGameResults(prevResults => ({
        ...prevResults,
        [gameId]: {
          [playerUserIds[1]]: scores[1],
          [playerUserIds[2]]: scores[2]
        }
      }));
      setGameId(prev => prev + 1);
      setGameOver(false);
      setGameStarted(false);
      setCountdown(0);
      setEdges(squareGraphEdges(sharedDotCount));
      setFaces(squareGraphFaces(sharedDotCount));
      setScores({ 1: 0, 2: 0 });
      setCurrentPlayer(1);
      dispatch({ type: "routeTo", route: "lobby" });
    }
  };

  // Countdown logic
  useEffect(() => {
    if (countdown > 0 && !gameStarted) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      if (countdown === 1) {
        setTimeout(() => {
          setGameStarted(true);
          dispatch({ type: "routeTo", route: "game" });
        }, 1000);
      }
      return () => clearTimeout(timer);
    }
  }, [countdown, gameStarted, setCountdown, setGameStarted]);

  // Update total scores on game over
  const isGameOverHandled = useRef(false);
  useEffect(() => {
    if (gameOver && !isGameOverHandled.current && myPlayerNumber) {
      setMyTotalScore(prev => prev + scores[myPlayerNumber]);
      isGameOverHandled.current = true;
      playCollect();
    } else if (!gameOver) {
      isGameOverHandled.current = false;
    }
  }, [gameOver, myPlayerNumber, scores, setMyTotalScore, playCollect]);

  // Game logic
  const maxScore = useMemo(() => Math.pow(sharedDotCount - 1, 2), [sharedDotCount]);
  
  const gridStyle = useMemo(() => {
    const cols = sharedDotCount;
    const rows = sharedDotCount;
    return {
      gridTemplateColumns: `repeat(${cols - 1}, 1fr 8fr) 1fr`,
      gridTemplateRows: `repeat(${rows - 1}, 1fr 8fr) 1fr`,
    } as CSSProperties;
  }, [sharedDotCount]);

  const isSelectedDot = useCallback(
    (c: Coordinate) => !!(state.firstDot && state.firstDot.row === c.row && state.firstDot.col === c.col),
    [state.firstDot]
  );

  const isDrawnEdge = useCallback(
    (first: Coordinate, second: Coordinate) => !!edges[squareEdgeId(first, second)],
    [edges]
  );

  const playerAtCell = useCallback(
    (topRow: number, leftCol: number) => {
      const nodes: Coordinate[] = [
        { row: topRow, col: leftCol },
        { row: topRow, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol + 1 },
        { row: topRow + 1, col: leftCol },
      ];
      return faces[squareFaceId(nodes)] || 0;
    },
    [faces]
  );

  const isFilledCell = useCallback((topRow: number, leftCol: number) => playerAtCell(topRow, leftCol) > 0, [playerAtCell]);

  const playerInitial = useCallback((player: 1 | 2) => {
    const userId = playerUserIds[player];
    if (!userId) return "?";
    return getFirstGrapheme(generatePlayerName(userId));
  }, [playerUserIds]);

  const getPlayerDisplayName = useCallback((player: 1 | 2) => {
    const userId = playerUserIds[player];
    if (!userId) return `Player ${player}`;
    return generatePlayerName(userId);
  }, [playerUserIds]);

  const handleDotClick = useCallback(
    (row: number, col: number) => {
      // Only allow clicks if game is started, not over, not waiting, and it's my turn
      if (!gameStarted || gameOver || waitingForPlayers || !myPlayerNumber || currentPlayer !== myPlayerNumber) {
        return;
      }

      const dot = { row, col };
      if (state.firstDot) {
        const firstDot = state.firstDot;
        const secondDot = dot;
        
        if (firstDot.row === secondDot.row && firstDot.col === secondDot.col) {
          dispatch({ type: "resetFirstDot" });
        } else if (isAdjacent(firstDot, secondDot) && !isDrawnEdge(firstDot, secondDot)) {
          let hasFilledNewCell = false;
          dispatch({ type: "setSecondDot", dot: secondDot });

          // Update edge
          const newEdgeId = squareEdgeId(firstDot, secondDot);
          const newEdges = { ...edges, [newEdgeId]: true };
          setEdges(newEdges);

          // Check for completed faces
          const adjacentFaces = adjacentSquareFacesOfEdge(firstDot, secondDot, sharedDotCount);
          const newFaces = { ...faces };
          let newScores = { ...scores };
          
          for (const faceNodes of adjacentFaces) {
            const [a, b, c, d] = faceNodes;
          const isDrawnWithNew = (x: Coordinate, y: Coordinate) => {
            const id = squareEdgeId(x, y);
              return newEdges[id] || false;
          };

            if (isDrawnWithNew(a, b) && isDrawnWithNew(b, c) && isDrawnWithNew(c, d) && isDrawnWithNew(d, a)) {
              const faceId = squareFaceId(faceNodes);
              if (newFaces[faceId] === 0) {
              hasFilledNewCell = true;
                newFaces[faceId] = currentPlayer;
                newScores[currentPlayer] = newScores[currentPlayer] + 1;
              }
            }
          }

          setFaces(newFaces);
          setScores(newScores);
          
          // Check win condition
          if (newScores[1] + newScores[2] === maxScore) {
            setGameOver(true);
          } else if (!hasFilledNewCell) {
            // Toggle player
            setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
          }

          dispatch({ type: "resetFirstDot" });
          playTap();
        } else {
          dispatch({ type: "resetFirstDot" });
          dispatch({ type: "setFirstDot", dot: secondDot });
        }
      } else {
        dispatch({ type: "setFirstDot", dot });
      }
    },
    [state.firstDot, sharedDotCount, currentPlayer, isDrawnEdge, gameStarted, gameOver, waitingForPlayers, myPlayerNumber, edges, faces, scores, maxScore, setEdges, setFaces, setScores, setCurrentPlayer, setGameOver, playTap]
  );

  const copyRoomId = async () => {
    const roomIdToShow = getRoomIdFromJoinUrl(joinUrl);
    if (roomIdToShow) {
      await navigator.clipboard.writeText(roomIdToShow);
    }
  };

  const roomIdToShow = getRoomIdFromJoinUrl(joinUrl);

  // Show kick message if session ended or locked
  if (isBeingKicked) {
    return (
      <div className="container">
        <AnimatedBackground />
        <div className="new-game">
          <h1 style={{ fontSize: "6vmin", color: "#f44336" }}>
            {sessionEnded ? "Session Ended" : "Session Locked"}
          </h1>
          <p style={{ fontSize: "3vmin", margin: "2vmin" }}>
            {sessionEnded 
              ? "This session has ended and is no longer available." 
              : "This session is locked and no new players can join."
            }
          </p>
          <button onClick={handleLeaveGame}>Return to Home</button>
        </div>
      </div>
    );
  }

  // Waiting screen during gameplay (only show when actually in game route)
  if (waitingForPlayers && gameStarted && !gameOver && state.route === "game") {
    return (
      <div className="container">
        <AnimatedBackground />
        <div className="new-game">
          <h1 style={{ fontSize: "6vmin", color: "#ffc107" }}>Waiting for Players</h1>
          <p style={{ fontSize: "3vmin", margin: "2vmin" }}>{waitingReason}</p>
          <div style={{ fontSize: "12vmin", fontWeight: "bold", color: "#ffc107", margin: "2vmin" }}>
            {waitingTimer}
          </div>
          <p style={{ fontSize: "3vmin" }}>Players: {users.length}/2</p>
          {isCurrentHost && (
            <button onClick={handleEndSession} style={{ backgroundColor: "#f44336" }}>
              End Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // HOME SCREEN
  if (state.route === "home") {
    return (
      <div className="container">
        <AnimatedBackground />
        <div className="volume-control" onClick={toggleVolume}>
          <i className={"fa " + (isMuted ? "fa-volume-off" : "fa-volume-up")} />
        </div>
        <div className="new-game">
          <h1>Dots Multiplayer</h1>
          <button onClick={() => { playTap(); setShowMultiplayerDialog(true); }}>
            Start Game
          </button>
            </div>

        {/* Multiplayer Dialog */}
        {showMultiplayerDialog && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "var(--bg-color)",
              padding: "4vmin",
              borderRadius: "2vmin",
              maxWidth: "80vmin",
              width: "100%"
            }}>
              <h2 style={{ fontSize: "5vmin", color: "var(--line-color)", marginBottom: "3vmin" }}>
                Multiplayer
              </h2>
              <button 
                onClick={handleCreateRoom}
                style={{ width: "100%", marginBottom: "2vmin" }}
              >
                Create Room
              </button>
              <div style={{ marginTop: "2vmin" }}>
              <input
                type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={e => { setJoinRoomId(e.target.value); setJoinError(""); }}
                  style={{ width: "100%", marginBottom: "1vmin" }}
                />
                {joinError && <span style={{ color: "#f44336", fontSize: "2.5vmin" }}>{joinError}</span>}
                <button 
                  onClick={handleJoinRoom}
                  style={{ width: "100%", marginTop: "1vmin" }}
                >
                  Join Room
                </button>
            </div>
              <button 
                onClick={() => setShowMultiplayerDialog(false)}
                style={{ width: "100%", marginTop: "2vmin", backgroundColor: "#666" }}
              >
                Cancel
              </button>
          </div>
          </div>
        )}
      </div>
    );
  }

  // LOBBY SCREEN
  if (state.route === "lobby") {
    return (
      <div className="container">
        <AnimatedBackground />
        <div className="volume-control" onClick={toggleVolume}>
          <i className={"fa " + (isMuted ? "fa-volume-off" : "fa-volume-up")} />
        </div>
        <div className="new-game">
          <h1>Game Lobby</h1>
          
          {/* Room ID */}
          <div style={{ fontSize: "3vmin", margin: "2vmin", display: "flex", alignItems: "center", justifyContent: "center", gap: "2vmin" }}>
            <span>Room ID: <strong>{roomIdToShow}</strong></span>
            <button onClick={copyRoomId} style={{ fontSize: "2.5vmin", padding: "0.5vmin 2vmin" }}>
              Copy
            </button>
          </div>

          {/* Player List */}
          <div style={{ fontSize: "3vmin", margin: "2vmin" }}>
            <p><strong>Players ({users.length}/2):</strong></p>
            {users.map(u => (
              <p key={u.userId} style={{ margin: "1vmin 0" }}>
                {generatePlayerName(u.userId)}
                {u.isYou && " (You)"}
                {u.userId === hostUserId && " (Host)"}
              </p>
            ))}
          </div>

          {users.length < 2 ? (
            <>
              <p style={{ fontSize: "3vmin", color: "#ffc107" }}>Waiting for Player 2 to join...</p>
              {isCurrentHost && (
                <button onClick={handleEndSession} style={{ backgroundColor: "#f44336" }}>
                  End Session
                </button>
              )}
            </>
          ) : countdown > 0 ? (
            <>
              {/* Countdown display */}
              <div style={{ fontSize: "12vmin", fontWeight: "bold", color: "#4caf50", margin: "3vmin" }}>
                {countdown}
              </div>
              <p style={{ fontSize: "3vmin" }}>Game starting...</p>
            </>
          ) : (
            <>
              {isCurrentHost ? (
                <>
                  {/* Grid Selection - Only host sees this */}
          <div className="size-select">
            <div className="GridIcon">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="GridIcon-Node" />
              ))}
            </div>
            {[3, 4, 5, 6].map((size) => (
              <label key={size} className={"size-option" + (sharedDotCount === size ? " checked" : "")}>
                <input
                  type="radio"
                  checked={sharedDotCount === size}
                  name="size"
                  onChange={() => setSharedDotCount(size)}
                  value={size}
                />
                {size}
              </label>
            ))}
          </div>
                  
                  <button onClick={handleStartGame}>
                    Start Game {gameId}
                  </button>
                  <button onClick={handleLeaveGame} style={{ backgroundColor: "#666" }}>
                    Leave Game
                  </button>
                  <button onClick={handleEndSession} style={{ backgroundColor: "#f44336" }}>
                    End Session
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "3vmin", color: "#4caf50" }}>
                    Waiting for host to start the game...
                  </p>
                  <button onClick={handleLeaveGame} style={{ backgroundColor: "#666" }}>
                    Leave Game
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (gameOver) {
    const winner = scores[1] > scores[2] ? 1 : scores[1] < scores[2] ? 2 : 0;
    
    return (
      <div className="container">
        <AnimatedBackground />
        <div className="new-game">
          <h1>Game Over!</h1>
          
          {/* Room ID */}
          <div style={{ fontSize: "2.5vmin", margin: "1vmin" }}>
            Room ID: <strong>{roomIdToShow}</strong>
          </div>

          {/* Game scores */}
          <div style={{ margin: "3vmin 0" }}>
            <h3 style={{ fontSize: "4vmin" }}>Game {gameId} Results:</h3>
            <p style={{ fontSize: "3.5vmin", margin: "1vmin" }}>
              {getPlayerDisplayName(1)}: {scores[1]} squares
            </p>
            <p style={{ fontSize: "3.5vmin", margin: "1vmin" }}>
              {getPlayerDisplayName(2)}: {scores[2]} squares
            </p>
            {winner === 0 ? (
              <p style={{ fontSize: "4vmin", color: "#ffc107", margin: "2vmin" }}>It's a Tie!</p>
            ) : (
              <p style={{ fontSize: "4vmin", color: "#4caf50", margin: "2vmin" }}>
                {getPlayerDisplayName(winner)} Wins!
              </p>
            )}
          </div>

          {/* Total scores */}
          <div style={{ margin: "3vmin 0" }}>
            <h3 style={{ fontSize: "4vmin" }}>Session Totals:</h3>
            {Object.entries(allTotalScores).map(([userId, totalScore]) => {
              const playerNum = userId === playerUserIds[1] ? 1 : 2;
              return (
                <p key={userId} style={{ fontSize: "3.5vmin", margin: "1vmin" }}>
                  {generatePlayerName(userId)}: {totalScore} total squares
                </p>
              );
            })}
          </div>

          {/* Buttons */}
          {users.length >= 2 ? (
            isCurrentHost ? (
              <>
                <button onClick={setupNextGame}>Start Game {gameId + 1}</button>
                <button onClick={handleLeaveGame} style={{ backgroundColor: "#666" }}>
                  Leave Game
                </button>
                <button onClick={handleEndSession} style={{ backgroundColor: "#f44336" }}>
                  End Session
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: "3vmin", color: "#ffc107" }}>
                  Waiting for host to start next game...
                </p>
                <button onClick={handleLeaveGame} style={{ backgroundColor: "#666" }}>
                  Leave Game
                </button>
              </>
            )
          ) : (
            <>
              <p style={{ fontSize: "3vmin", color: "#ffc107" }}>
                Waiting for more players to join...
              </p>
              {isCurrentHost && (
                <button onClick={handleEndSession} style={{ backgroundColor: "#f44336" }}>
                  End Session
                </button>
              )}
            </>
          )}
        </div>
        <ConfettiCollection play={playCollect} />
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div id="game" className="container">
      <AnimatedBackground />
      <div className="volume-control" onClick={toggleVolume}>
        <i className={"fa " + (isMuted ? "fa-volume-off" : "fa-volume-up")} />
      </div>
      
      <div className="dot-game">
        {/* Game Info */}
        <div style={{ fontSize: "3vmin", marginBottom: "2vmin", textAlign: "center" }}>
          <div>Game: {gameId} | Room: {roomIdToShow}</div>
          {isCurrentHost && (
            <div style={{ marginTop: "1vmin" }}>
              <button onClick={handleLeaveGame} style={{ fontSize: "2.5vmin", padding: "0.5vmin 2vmin", marginRight: "1vmin" }}>
                Leave
              </button>
              <button onClick={handleEndSession} style={{ fontSize: "2.5vmin", padding: "0.5vmin 2vmin", backgroundColor: "#f44336" }}>
                End Session
              </button>
            </div>
          )}
          {!isCurrentHost && (
            <button onClick={handleLeaveGame} style={{ fontSize: "2.5vmin", padding: "0.5vmin 2vmin", marginTop: "1vmin" }}>
              Leave Game
            </button>
          )}
        </div>

        <div className="overview">
          {gameStarted ? (
            <div className="players">
              <PlayerPanel
                label={getPlayerDisplayName(1)}
                score={scores[1]}
                isCurrent={currentPlayer === 1}
              />
              <PlayerPanel
                label={getPlayerDisplayName(2)}
                score={scores[2]}
                isCurrent={currentPlayer === 2}
              />
            </div>
          ) : (
            <div className="status">
              {users.length < 2 ? "Waiting for players..." : countdown > 0 ? countdown : "Starting..."}
            </div>
          )}
          
          {/* Turn indicator */}
          {gameStarted && myPlayerNumber && (
            <div style={{ fontSize: "3vmin", textAlign: "center", marginTop: "2vmin" }}>
              {currentPlayer === myPlayerNumber ? (
                <span style={{ color: "#4caf50", fontWeight: "bold" }}>Your Turn!</span>
              ) : (
                <span style={{ color: "#ffc107" }}>Opponent's Turn</span>
              )}
            </div>
          )}
        </div>

        <div className="dot-graph" style={gridStyle}>
          {Array.from({ length: sharedDotCount }).map((_, rIdx) => {
            const row = rIdx + 1;
            return (
              <RowChunk
                key={row}
                row={row}
                cols={sharedDotCount}
                isSelectedDot={isSelectedDot}
                onDotClick={(r, c) => { playTap(); handleDotClick(r, c); }}
                isDrawnEdge={isDrawnEdge}
                isFilledCell={isFilledCell}
                playerAtCell={playerAtCell}
                playerInitial={playerInitial}
              />
            );
          })}
        </div>
        </div>
    </div>
  );
}

function PlayerPanel({ label, score, isCurrent }: { label: string; score: number; isCurrent: boolean }) {
  return (
    <div className={"player" + (isCurrent ? " current-player" : "")}>
      <div className="name">{label}</div>
      <div className="score">{score}</div>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="AnimatedBg">
      <div className="AnimatedBg-Fill"></div>
      <div className="AnimatedBg-Cover"></div>
    </div>
  );
}

function ConfettiCollection({ play }: { play: () => void }) {
  useEffect(() => { play(); }, [play]);
  return (
    <div className="confetti-root">
      {Array.from({ length: 100 }).map((_, i) => (
        <ConfettiPiece key={i} />
      ))}
    </div>
  );
}

function ConfettiPiece() {
  const colors = ["#0066cc", "#f1a66a", "red"];
  const left = `${Math.random() * 100 - 50}vw`;
  const animationDuration = `${Math.random() * 1500 + 1500}ms`;
  const animationDelay = `${Math.random() * 1000}ms`;
  const backgroundColor = colors[Math.floor(Math.random() * colors.length)];
  const scale = 0.75 + Math.random() * 0.5;
  const style: CSSProperties = { animationDelay, animationDuration, backgroundColor, left };
  const scaleStyle: CSSProperties = { transform: `scaleX(${scale}) scaleY(${scale})` };
  return (
    <div style={scaleStyle}>
      <div className="confetti" style={style}></div>
    </div>
  );
}

function RowChunk(props: {
  row: number;
  cols: number;
  isSelectedDot: (c: Coordinate) => boolean;
  onDotClick: (row: number, col: number) => void;
  isDrawnEdge: (a: Coordinate, b: Coordinate) => boolean;
  isFilledCell: (topRow: number, leftCol: number) => boolean;
  playerAtCell: (topRow: number, leftCol: number) => number;
  playerInitial: (p: 1 | 2) => string;
}) {
  const { row, cols, isSelectedDot, onDotClick, isDrawnEdge, isFilledCell, playerAtCell, playerInitial } = props;
  const rowItems: ReactNode[] = [];

  for (let col = 1; col <= cols; col++) {
    rowItems.push(
      <div key={`dot-${row}-${col}`} className="dot" onClick={() => onDotClick(row, col)}>
        <span className={isSelectedDot({ row, col }) ? "selected" : ""} />
      </div>
    );
    if (col < cols) {
      const selected = isDrawnEdge({ row, col }, { row, col: col + 1 });
      rowItems.push(
        <div key={`h-${row}-${col}-${col + 1}`} className={"h-line" + (selected ? " selected" : "")} />
      );
    }
  }

  const belowItems: ReactNode[] = [];
  if (row < cols) {
    for (let col = 1; col <= cols; col++) {
      const vSelected = isDrawnEdge({ row, col }, { row: row + 1, col });
      belowItems.push(
        <div key={`v-${row}-${row + 1}-${col}`} className={"v-line" + (vSelected ? " selected" : "")} />
      );
      if (col < cols) {
        const filled = isFilledCell(row, col);
        const player = playerAtCell(row, col) as 0 | 1 | 2;
        belowItems.push(
          <div key={`cell-${row}-${col}`} className={"cell" + (filled ? " filled-cell" : "")}>
            {filled ? (
              <div className="player">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                  <text x="16" y="18" textAnchor="middle" alignmentBaseline="middle" fontSize="32">
                    {player ? playerInitial(player) : ""}
                  </text>
                </svg>
              </div>
            ) : null}
          </div>
        );
      }
    }
  }

  return (
    <>
      {rowItems}
      {belowItems}
    </>
  );
}
