import React, { useRef, useEffect } from 'react';
import { GameState, Player } from '../types';
import * as Constants from '../constants';

interface PongGameProps {
  gameState: GameState;
  players: Player[];
}

const PongGame: React.FC<PongGameProps> = ({ gameState, players }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.fillStyle = '#111827'; // bg-gray-900
    context.fillRect(0, 0, Constants.GAME_WIDTH, Constants.GAME_HEIGHT);

    if (gameState.status === 'gameover') {
        context.fillStyle = 'white';
        context.font = '50px sans-serif';
        context.textAlign = 'center';
        context.fillText(`${gameState.winner} Wins!`, Constants.GAME_WIDTH / 2, Constants.GAME_HEIGHT / 2);
        return;
    }

    // Draw center lines
    context.strokeStyle = '#374151'; // gray-700
    context.lineWidth = 2;
    context.setLineDash([10, 10]);
    // Vertical
    context.beginPath();
    context.moveTo(Constants.GAME_WIDTH / 2, 0);
    context.lineTo(Constants.GAME_WIDTH / 2, Constants.GAME_HEIGHT);
    context.stroke();
    // Horizontal
    context.beginPath();
    context.moveTo(0, Constants.GAME_HEIGHT / 2);
    context.lineTo(Constants.GAME_WIDTH, Constants.GAME_HEIGHT / 2);
    context.stroke();
    context.setLineDash([]);


    // Draw paddles
    context.fillStyle = '#818CF8'; // indigo-400
    Object.values(gameState.paddles).forEach(paddle => {
        context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    });
    
    // Draw ball
    context.beginPath();
    context.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    context.fillStyle = '#F472B6'; // pink-400
    context.fill();
    context.closePath();

  }, [gameState]);

  const getPlayer = (index: number) => players[index];
  const getScore = (index: number) => {
    const player = players[index];
    return player && gameState.scores[player.id] !== undefined ? gameState.scores[player.id] : '-';
  };

  return (
    <div className="relative shadow-2xl border-4 border-gray-700 rounded-lg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2 text-white p-4">
            {/* Player 1 - Top Left */}
            <div className="text-left">
                <span className="text-xl font-bold text-indigo-400">{getPlayer(0)?.name || 'P1'}</span>
                <span className="block text-3xl font-mono">{getScore(0)}</span>
            </div>
            {/* Player 2 - Top Right */}
            <div className="text-right">
                 <span className="text-xl font-bold text-indigo-400">{getPlayer(1)?.name || 'P2'}</span>
                <span className="block text-3xl font-mono">{getScore(1)}</span>
            </div>
             {/* Player 3 - Bottom Left */}
            <div className="text-left self-end">
                <span className="text-xl font-bold text-indigo-400">{getPlayer(2)?.name || 'P3'}</span>
                <span className="block text-3xl font-mono">{getScore(2)}</span>
            </div>
             {/* Player 4 - Bottom Right */}
            <div className="text-right self-end">
                <span className="text-xl font-bold text-indigo-400">{getPlayer(3)?.name || 'P4'}</span>
                <span className="block text-3xl font-mono">{getScore(3)}</span>
            </div>
        </div>
      <canvas
        ref={canvasRef}
        width={Constants.GAME_WIDTH}
        height={Constants.GAME_HEIGHT}
      />
    </div>
  );
};

export default PongGame;