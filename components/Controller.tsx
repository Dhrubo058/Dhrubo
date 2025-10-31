import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../services/SocketContext';
import { GameState, Player } from '../types';

interface ControllerProps {
  initialRoomCode: string | null;
  onExit: () => void;
}

const playerId = `player_${Math.random().toString(36).substring(2, 11)}`;

const Controller: React.FC<ControllerProps> = ({ initialRoomCode, onExit }) => {
  const { socket } = useSocket();
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState<Player | null>(null);
  const [playerIndex, setPlayerIndex] = useState(-1);

  const handleJoin = useCallback(() => {
    if (!socket) {
        setError('Connecting to server...');
        return;
    }
    const codeToJoin = (initialRoomCode || roomCode).trim();
    if (!codeToJoin) {
      setError('Please enter a room code.');
      return;
    }
    socket.emit('joinRoom', { roomCode: codeToJoin, playerId });

  }, [roomCode, socket, initialRoomCode]);

  useEffect(() => {
    if (socket) {
        // Clear "connecting" message once socket is available
        if (error === 'Connecting to server...') setError('');

        socket.on('joinSuccess', ({ playerId, players, gameState }) => {
            setIsConnected(true);
            setError('');
            setRoomCode(initialRoomCode || roomCode);
            const me = players.find((p: Player) => p.id === playerId);
            const myIndex = players.findIndex((p: Player) => p.id === playerId);
            setMyPlayerInfo(me || null);
            setPlayerIndex(myIndex);
            setGameState(gameState);
        });

        socket.on('gameStateUpdate', (newGameState: GameState) => {
            setGameState(newGameState);
        });

        socket.on('error', (message) => {
            setError(message);
            setIsConnected(false);
        });

        return () => {
            socket.off('joinSuccess');
            socket.off('gameStateUpdate');
            socket.off('error');
        };
    }
  }, [socket, initialRoomCode, roomCode]);

  useEffect(() => {
    if (initialRoomCode && socket) {
        handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoomCode, socket]);
  
  const sendInput = (direction: 'up' | 'down' | 'left' | 'right', action: 'press' | 'release') => {
    if (isConnected && socket) {
      socket.emit('input', { roomCode, playerId, direction, action });
    }
  };

  const myScore = gameState && myPlayerInfo ? gameState.scores[myPlayerInfo.id] : 0;
  
  const isVertical = playerIndex === 0 || playerIndex === 1;
  const upLeftAction = isVertical ? 'up' : 'left';
  const downRightAction = isVertical ? 'down' : 'right';

  if (!isConnected) {
    return (
      <div className="w-full max-w-sm p-8 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-200">Join a Game</h2>
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="4-DIGIT CODE"
            maxLength={4}
            className="w-full text-center text-3xl tracking-[0.5em] bg-gray-700/50 border-2 border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 rounded-lg py-3 px-4 transition-colors duration-300"
          />
          <button onClick={handleJoin} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors duration-300 disabled:bg-gray-500" disabled={!socket}>
            Join
          </button>
          <button onClick={onExit} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Back
          </button>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-gray-800 rounded-2xl shadow-inner select-none">
       <header className="flex justify-between items-center text-gray-400">
            <span>{myPlayerInfo?.name}</span>
            <span className="font-bold text-2xl text-white">Score: {myScore}</span>
            <span>Room: <span className="font-mono text-indigo-400">{roomCode}</span></span>
        </header>

      <div className="flex-grow flex flex-col justify-center items-center space-y-4">
        <button
          onMouseDown={() => sendInput(upLeftAction, 'press')}
          onMouseUp={() => sendInput(upLeftAction, 'release')}
          onTouchStart={() => sendInput(upLeftAction, 'press')}
          onTouchEnd={() => sendInput(upLeftAction, 'release')}
          className="w-48 h-48 flex flex-col items-center justify-center bg-indigo-500 rounded-full text-white text-4xl font-bold active:bg-indigo-700 transition-colors shadow-lg active:shadow-2xl transform active:scale-95"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isVertical ? "M5 15l7-7 7 7" : "M15 19l-7-7 7-7"} />
            </svg>
            <span className="text-sm uppercase font-sans">{upLeftAction}</span>
        </button>
        <button
          onMouseDown={() => sendInput(downRightAction, 'press')}
          onMouseUp={() => sendInput(downRightAction, 'release')}
          onTouchStart={() => sendInput(downRightAction, 'press')}
          onTouchEnd={() => sendInput(downRightAction, 'release')}
          className="w-48 h-48 flex flex-col items-center justify-center bg-purple-500 rounded-full text-white text-4xl font-bold active:bg-purple-700 transition-colors shadow-lg active:shadow-2xl transform active:scale-95"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isVertical ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
            </svg>
             <span className="text-sm uppercase font-sans">{downRightAction}</span>
        </button>
      </div>

       <footer className="text-center">
        <button onClick={onExit} className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Leave Game
        </button>
       </footer>
    </div>
  );
};

export default Controller;
