import React, { useState, useCallback, useEffect } from 'react';
import Home from './components/Home';
import Host from './components/Host';
import Controller from './components/Controller';
import { SocketProvider } from './services/SocketContext';

type Role = 'home' | 'host' | 'controller';

const App: React.FC = () => {
  const [role, setRole] = useState<Role>('home');
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const handleSelectRole = useCallback((selectedRole: 'host' | 'controller') => {
    setRole(selectedRole);
  }, []);

  const handleJoinRoom = useCallback((code: string) => {
    setRoomCode(code);
    setRole('controller');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && /^\d{4}$/.test(joinCode)) {
      handleJoinRoom(joinCode);
      // Clean up the URL to prevent re-joining on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleJoinRoom]);

  const renderContent = () => {
    switch (role) {
      case 'host':
        return <Host onExit={() => setRole('home')} />;
      case 'controller':
        return <Controller initialRoomCode={roomCode} onExit={() => { setRole('home'); setRoomCode(null); }} />;
      case 'home':
      default:
        return <Home onSelectRole={handleSelectRole} onJoinWithCode={handleJoinRoom} />;
    }
  };

  return (
    <SocketProvider>
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
            <header className="absolute top-0 left-0 p-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <h1 className="text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                    Nexus Play
                </h1>
            </header>
            <main className="w-full max-w-4xl flex-grow flex items-center justify-center">
                {renderContent()}
            </main>
        </div>
    </SocketProvider>
  );
};

export default App;
