import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { useSocket } from '../services/SocketContext';
import { Player, GameState, InputPayload, Paddle } from '../types';
import PongGame from './PongGame';
import * as Constants from '../constants';

declare var QRCode: any;

const hostId = `host_${Math.random().toString(36).substring(2, 11)}`;

type GameAction =
  | { type: 'START_GAME'; }
  | { type: 'MOVE_PADDLE'; payload: { playerId: string; direction: 'up' | 'down' | 'left' | 'right' } }
  | { type: 'UPDATE_GAME' }
  | { type: 'RESET_ROUND'; }
  | { type: 'SET_GAME_STATE', payload: GameState }
  | { type: 'SET_WINNER'; payload: string | null };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_GAME_STATE':
        return action.payload;
    case 'START_GAME': {
      return {
        ...state,
        status: 'playing',
        ball: {
          ...state.ball,
          x: Constants.GAME_WIDTH / 2,
          y: Constants.GAME_HEIGHT / 2,
          dx: (Math.random() > 0.5 ? Constants.INITIAL_BALL_SPEED_X : -Constants.INITIAL_BALL_SPEED_X),
          dy: (Math.random() > 0.5 ? Constants.INITIAL_BALL_SPEED_Y : -Constants.INITIAL_BALL_SPEED_Y),
        },
      };
    }
    case 'UPDATE_GAME': {
      let newBall = { ...state.ball, x: state.ball.x + state.ball.dx, y: state.ball.y + state.ball.dy };
      
      Object.values(state.paddles).forEach(paddle => {
        const isVertical = paddle.width < paddle.height;
        if (isVertical) { // Left/Right paddles
            if (newBall.x - newBall.radius < paddle.x + paddle.width && newBall.x + newBall.radius > paddle.x && newBall.y > paddle.y && newBall.y < paddle.y + paddle.height) {
                newBall.dx = -newBall.dx * 1.02;
            }
        } else { // Top/Bottom paddles
            if (newBall.y - newBall.radius < paddle.y + paddle.height && newBall.y + newBall.radius > paddle.y && newBall.x > paddle.x && newBall.x < paddle.x + paddle.width) {
                newBall.dy = -newBall.dy * 1.02;
            }
        }
      });
      
      return { ...state, ball: newBall };
    }
    case 'MOVE_PADDLE': {
      const { playerId, direction } = action.payload;
      const newPaddles = { ...state.paddles };
      const paddle = newPaddles[playerId];
      if (paddle) {
        if(direction === 'up' || direction === 'down') {
            let newY = paddle.y + (direction === 'up' ? -Constants.PADDLE_SPEED : Constants.PADDLE_SPEED);
            newY = Math.max(0, Math.min(Constants.GAME_HEIGHT - paddle.height, newY));
            newPaddles[playerId] = { ...paddle, y: newY };
        } else { // left or right
            let newX = paddle.x + (direction === 'left' ? -Constants.PADDLE_SPEED : Constants.PADDLE_SPEED);
            newX = Math.max(0, Math.min(Constants.GAME_WIDTH - paddle.width, newX));
            newPaddles[playerId] = { ...paddle, x: newX };
        }
      }
      return { ...state, paddles: newPaddles };
    }
    // Fix: Corrected scoring logic to be robust and accurate.
    case 'RESET_ROUND': {
        const newScores = { ...state.scores };
        let scorerId: string | null = null;
        const playerIds = Object.keys(state.paddles);
        const paddles = state.paddles;

        if (state.ball.x + state.ball.radius < 0) { // Ball out on left
            // Player on the right scores
            scorerId = playerIds.find(id => paddles[id].x > Constants.GAME_WIDTH / 2) || null;
        } else if (state.ball.x - state.ball.radius > Constants.GAME_WIDTH) { // Ball out on right
            // Player on the left scores
            scorerId = playerIds.find(id => paddles[id].x < Constants.GAME_WIDTH / 2) || null;
        } else if (state.ball.y + state.ball.radius < 0) { // Ball out on top
            // Player on the bottom scores
            scorerId = playerIds.find(id => paddles[id].y > Constants.GAME_HEIGHT / 2) || null;
        } else if (state.ball.y - state.ball.radius > Constants.GAME_HEIGHT) { // Ball out on bottom
            // Player on the top scores
            scorerId = playerIds.find(id => paddles[id].y < Constants.GAME_HEIGHT / 2) || null;
        }

        if (scorerId && newScores[scorerId] !== undefined) {
            newScores[scorerId]++;
        }
       
        return {
            ...state,
            scores: newScores,
            ball: {
              ...state.ball,
              x: Constants.GAME_WIDTH / 2,
              y: Constants.GAME_HEIGHT / 2,
              dx: (Math.random() > 0.5 ? Constants.INITIAL_BALL_SPEED_X : -Constants.INITIAL_BALL_SPEED_X),
              dy: (Math.random() > 0.5 ? Constants.INITIAL_BALL_SPEED_Y : -Constants.INITIAL_BALL_SPEED_Y)
            }
        }
    }
    case 'SET_WINNER':
        return { ...state, winner: action.payload, status: 'gameover' };
    default:
      return state;
  }
};


const Host: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { socket } = useSocket();
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, dispatch] = useReducer(gameReducer, {
    ball: { x: Constants.GAME_WIDTH / 2, y: Constants.GAME_HEIGHT / 2, dx: 0, dy: 0, radius: Constants.BALL_RADIUS },
    paddles: {},
    scores: {},
    status: 'waiting',
    winner: null,
  });

  const animationFrameId = useRef<number | null>(null);
  const playerInputs = useRef<{ [playerId: string]: 'up' | 'down' | 'left' | 'right' | null }>({});
  const qrCodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.emit('createRoom', hostId);

    socket.on('roomCreated', (code) => {
        setRoomCode(code);
    });
    
    socket.on('playerListUpdate', (playerList) => {
        setPlayers(playerList);
        // Sync paddles and scores from the first player join
        if (playerList.length > 0 && Object.keys(gameState.paddles).length === 0) {
             socket.on('joinSuccess', ({ gameState: initialState }) => {
                dispatch({type: 'SET_GAME_STATE', payload: initialState });
            });
        }
    });

    socket.on('playerInput', ({playerId, direction, action}) => {
        if (action === 'press') {
          playerInputs.current[playerId] = direction;
        } else {
          playerInputs.current[playerId] = null;
        }
    });

    socket.on('error', (message) => {
        console.error("Server error:", message);
        alert(`Server error: ${message}`);
        onExit();
    });

    return () => {
        socket.off('roomCreated');
        socket.off('playerListUpdate');
        socket.off('playerInput');
        socket.off('error');
    };
  }, [socket, onExit, gameState.paddles]);
  
  useEffect(() => {
    if (roomCode && qrCodeCanvasRef.current) {
      const joinUrl = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;
      QRCode.toCanvas(qrCodeCanvasRef.current, joinUrl, { width: 180, margin: 2, color: { light: '#0000', dark: '#E5E7EB' } }, (error: any) => {
        if (error) console.error("QR Code generation failed:", error);
      });
    }
  }, [roomCode]);

  const startGame = useCallback(() => {
    if (players.length > 1) {
      dispatch({ type: 'START_GAME' });
    }
  }, [players]);

  const gameLoop = useCallback(() => {
    if (gameState.status !== 'playing') return;

    Object.entries(playerInputs.current).forEach(([playerId, direction]) => {
      if (direction) {
        dispatch({ type: 'MOVE_PADDLE', payload: { playerId, direction } });
      }
    });

    dispatch({ type: 'UPDATE_GAME' });

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === 'playing') {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [gameState.status, gameLoop]);

  // Fix: Refactored logic to correctly handle state transitions and broadcast the latest state.
  // Handle scoring, winning, and game state broadcasting
  useEffect(() => {
    if (!socket) return;
    
    // Always broadcast the latest state to clients, except for 'waiting'
    if (gameState.status !== 'waiting') {
      socket.emit('gameStateUpdate', { roomCode, gameState });
    }

    // Game logic transitions should only happen while playing
    if (gameState.status !== 'playing' || players.length < 2) {
      return;
    }

    let roundOver = false;
    if (gameState.ball.x + gameState.ball.radius < 0 || 
        gameState.ball.x - gameState.ball.radius > Constants.GAME_WIDTH || 
        gameState.ball.y + gameState.ball.radius < 0 || 
        gameState.ball.y - gameState.ball.radius > Constants.GAME_HEIGHT) {
      roundOver = true;
    }

    // Check for a winner based on the current scores
    const winnerId = Object.keys(gameState.scores).find(id => gameState.scores[id] >= Constants.WINNING_SCORE);
    
    if (winnerId) {
        const winner = players.find(p => p.id === winnerId);
        dispatch({ type: 'SET_WINNER', payload: winner?.name ?? 'Unknown' });
    } else if (roundOver) {
        // If no winner yet and round is over, reset for the next round
        dispatch({ type: 'RESET_ROUND' });
    }
  }, [gameState, socket, roomCode, players]);

  return (
    <div className="w-full flex flex-col items-center">
        <button onClick={onExit} className="absolute top-6 right-6 bg-gray-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors z-10">
            Exit
        </button>
      {gameState.status === 'waiting' && (
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl shadow-xl border border-gray-700 w-full max-w-2xl">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-300 mb-2">Room Code</h2>
              <p className="text-6xl font-mono tracking-widest text-indigo-400 mb-6">{roomCode || '....'}</p>
              <div className="w-full bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-400">Players ({players.length}/{Constants.MAX_PLAYERS})</h3>
                <div className="space-y-2 min-h-[160px]">
                  {Array.from({ length: Constants.MAX_PLAYERS }).map((_, i) => (
                    <div key={i} className={`p-3 rounded-md ${players[i] ? 'bg-green-500/20 text-green-300' : 'bg-gray-600/30 text-gray-500'}`}>
                      {players[i] ? `✔️ ${players[i].name}` : 'Waiting for player...'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-gray-400">Scan to Join</h3>
                <canvas ref={qrCodeCanvasRef}></canvas>
            </div>
          </div>
          {players.length >= 2 && (
            <button onClick={startGame} className="mt-8 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
              Start Game
            </button>
          )}
        </div>
      )}
      
      {(gameState.status === 'playing' || gameState.status === 'gameover') && (
        <PongGame gameState={gameState} players={players} />
      )}
    </div>
  );
};

export default Host;
