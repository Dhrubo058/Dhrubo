
import React, { useState } from 'react';

interface HomeProps {
  onSelectRole: (role: 'host' | 'controller') => void;
  onJoinWithCode: (code: string) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectRole, onJoinWithCode }) => {
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomCode.trim().length === 4 && /^\d+$/.test(roomCode.trim())) {
            onJoinWithCode(roomCode.trim());
        } else {
            setError('Please enter a valid 4-digit room code.');
        }
    };

    return (
        <div className="text-center w-full max-w-md p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700">
            <h2 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-400">
                Welcome to Nexus Play
            </h2>
            <p className="text-gray-400 mb-8">Your phone is the controller. The screen is the console.</p>
            
            <div className="space-y-6">
                <button
                    onClick={() => onSelectRole('host')}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    Create a Game (Host)
                </button>
                
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>

                <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <input
                        type="text"
                        maxLength={4}
                        value={roomCode}
                        onChange={(e) => {
                            setRoomCode(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter 4-digit code"
                        className="w-full text-center text-2xl tracking-[0.5em] bg-gray-700/50 border-2 border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 rounded-lg py-3 px-4 transition-colors duration-300 placeholder-gray-500"
                    />
                     {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                        Join Game
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Home;
