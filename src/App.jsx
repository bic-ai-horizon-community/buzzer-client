import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, Navigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// IMPORT THE SERVER URL FROM AN ENV VARIABLE OR CONFIG FILE IN PRODUCTION

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket"],
  path: "/socket.io",
  withCredentials: true
});
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GameApp isAdminRoute={false} />} />
      <Route path="/admin" element={<GameApp isAdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function GameApp({ isAdminRoute }) {

  const [name, setName] = useState(() => localStorage.getItem('hyperbuzz_username') || '');
  const [password, setPassword] = useState('');
  const [joined, setJoined] = useState(() => {
    const savedId = localStorage.getItem('hyperbuzz_userid');
    const savedName = localStorage.getItem('hyperbuzz_username');
    return Boolean(savedId && savedName && !isAdminRoute);
  });
  const [users, setUsers] = useState([]);
  const [gameState, setGameState] = useState('WAITING');
  const [buzzes, setBuzzes] = useState([]);
  const [options, setOptions] = useState([]);
  const [optionsInput, setOptionsInput] = useState('1, 2, 3, 4');
  const [myUserId, setMyUserId] = useState(() => localStorage.getItem('hyperbuzz_userid') || '');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server', socket.id);
    });

    socket.on('users_update', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('game_state', (state) => {
      setGameState(state.gameState);
      setBuzzes(state.buzzes || []);
      setOptions(state.options || []);
    });

    socket.on('admin_success', () => {
      setJoined(true);
    });

    socket.on('admin_error', (msg) => {
      alert(msg);
    });

    // Auto-reconnect if session data exists
    const savedId = localStorage.getItem('hyperbuzz_userid');
    const savedName = localStorage.getItem('hyperbuzz_username');
    const isAdminMode = localStorage.getItem('hyperbuzz_isadmin') === 'true';

    // For admins on the admin route, we only strictly need the ID and the mode flag
    const canRestoreAdmin = savedId && isAdminMode && isAdminRoute;
    // For normal users, we need both ID and name
    const canRestoreUser = savedId && savedName && !isAdminRoute;

    if (canRestoreAdmin) {
      // Admin: connect and emit admin_reconnect;
      // DO NOT setJoined(true) yet — wait for server's admin_success event
      // which will also trigger game_state + users_update so dashboard is fully populated
      socket.connect();
      socket.once('connect', () => {
        socket.emit('admin_reconnect', { id: savedId });
      });
    } else if (canRestoreUser) {
      socket.connect();
      socket.once('connect', () => {
        socket.emit('register_user', { id: savedId, name: savedName });
      });
    }

    return () => {
      socket.off('connect');
      socket.off('users_update');
      socket.off('game_state');
      socket.off('admin_success');
      socket.off('admin_error');
    };
  }, [isAdminRoute]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newUserId = uuidv4();
    setMyUserId(newUserId);

    localStorage.setItem('hyperbuzz_userid', newUserId);
    localStorage.setItem('hyperbuzz_username', name.trim());

    socket.connect();
    socket.emit('register_user', { id: newUserId, name: name.trim() });

    setJoined(true);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();

    const existingId = localStorage.getItem('hyperbuzz_userid');
    const assignedId = existingId || uuidv4();

    setMyUserId(assignedId);
    localStorage.setItem('hyperbuzz_userid', assignedId);
    localStorage.setItem('hyperbuzz_username', name.trim());
    localStorage.setItem('hyperbuzz_isadmin', 'true');

    socket.connect();
    socket.emit('admin_login', { username: name, password, id: assignedId });
  };

  const handleLogout = () => {
    localStorage.removeItem('hyperbuzz_userid');
    localStorage.removeItem('hyperbuzz_username');
    localStorage.removeItem('hyperbuzz_isadmin');
    socket.disconnect();
    setJoined(false);
    setMyUserId('');
    setName('');
  };

  const handleBuzz = (optionValue = null) => {
    if (gameState === 'OPEN') {
      socket.emit('buzz', { option: optionValue });
    }
  };

  const handleStartRound = () => {
    const parsedOptions = optionsInput.split(',').map(s => s.trim()).filter(Boolean);
    socket.emit('start_round', { options: parsedOptions });
  };

  const handleResetRound = () => {
    socket.emit('reset_round');
  };

  const currentUser = users.find(u => u.id === myUserId);
  const isHost = currentUser?.isHost || false;
  const hasVoted = buzzes.some(b => b.user.id === myUserId);

  // Calculate fastest per option
  const fastestPerOption = {};
  if (options.length > 0) {
    buzzes.forEach(buzz => {
      if (!fastestPerOption[buzz.option] || buzz.reactionTimeMs < fastestPerOption[buzz.option].reactionTimeMs) {
        fastestPerOption[buzz.option] = buzz;
      }
    });
  } else {
    if (buzzes.length > 0) {
      fastestPerOption['GLOBAL'] = buzzes.reduce((prev, current) => (prev.reactionTimeMs < current.reactionTimeMs) ? prev : current);
    }
  }

  const rankings = Object.values(fastestPerOption).sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);

  // NOT JOINED VIEW
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <Card className="w-full max-w-sm bg-zinc-900/90 backdrop-blur border-zinc-800 shadow-2xl">
          <CardHeader className="pb-2 pt-8 px-6">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent pb-1">
              AI Horizon {isAdminRoute && 'Admin'}
            </CardTitle>
            <p className="text-center text-zinc-400 text-sm">
              {isAdminRoute ? 'Enter admin credentials' : 'Enter your name to join the lobby'}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={isAdminRoute ? handleAdminLogin : handleJoin} className="flex flex-col gap-3">
              <Input
                placeholder={isAdminRoute ? "Username" : "Your Name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-teal-500 h-11"
              />
              {isAdminRoute && (
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-teal-500 h-11"
                />
              )}
              <Button type="submit" size="lg" className="w-full font-bold bg-teal-600 hover:bg-teal-500 text-white mt-1 h-11">
                {isAdminRoute ? 'Login' : 'Join Game'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // MAIN GAME VIEW
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50 font-sans">

      {/* Navigation */}
      <header className="w-full py-3 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur sticky top-0 z-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent shrink-0">
            AI Horizon
          </h1>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-zinc-800 min-w-0 overflow-hidden">
              <span className="text-xs sm:text-sm font-medium truncate">
                <strong className="text-white">{currentUser?.name}</strong>
                <span className="opacity-40 hidden sm:inline"> @{currentUser?.id?.substring(0, 5)}</span>
              </span>
              {isHost && <Badge className="bg-teal-600 hover:bg-teal-600 font-bold text-xs shrink-0">HOST</Badge>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 text-xs px-3"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-5xl mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 flex flex-col gap-4 sm:gap-6">

        {/* Host Controls */}
        {isHost && (
          <Card className="bg-zinc-900/80 backdrop-blur border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle>Host Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-400">Options (comma separated, easily fits text or images)</label>
                  <Input
                    placeholder="e.g. A, B, C, D"
                    value={optionsInput}
                    onChange={(e) => setOptionsInput(e.target.value)}
                    disabled={gameState === 'OPEN'}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="default"
                    onClick={handleStartRound}
                    disabled={gameState === 'OPEN'}
                    className="w-full sm:w-32 bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    Open Buzzer
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetRound}
                    className="w-full sm:w-32 font-bold"
                  >
                    Reset Game
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jumbo Buzzer Display */}
        <Card className="flex flex-col items-center justify-center py-10 sm:py-16 md:py-24 bg-zinc-900/50 backdrop-blur border-zinc-800 overflow-hidden relative">
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-8 sm:mb-12 tracking-tight transition-opacity duration-300 ${gameState === 'WAITING' ? 'opacity-30' : 'opacity-100 text-teal-400'}`}>
            {gameState === 'WAITING' ? 'READY?' : hasVoted ? 'VOTED' : 'GO GO GO!'}
          </h2>

          <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center max-w-4xl mx-auto px-3 sm:px-4">
            {options && options.length > 0 ? (() => {
              // Which option did the current user vote for?
              const myVote = buzzes.find(b => b.user.id === myUserId)?.option ?? null;
              return options.map(opt => {
                const isMyVote = myVote !== null && myVote === opt;
                const isOtherVoted = hasVoted && !isMyVote;
                return (
                  <button
                    key={opt}
                    disabled={gameState !== 'OPEN' || hasVoted}
                    onClick={() => handleBuzz(opt)}
                    className={`
                        relative group shrink-0
                        w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52
                        rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-3 gap-1
                        text-2xl sm:text-3xl md:text-5xl font-black text-white
                        transition-all duration-200 break-words
                        ${isMyVote
                        ? 'bg-gradient-to-br from-teal-500 to-teal-700 border-2 border-teal-300/60 shadow-[0_0_30px_rgba(20,184,166,0.4)] cursor-default scale-105'
                        : isOtherVoted
                          ? 'bg-zinc-800 cursor-not-allowed opacity-40 border border-zinc-700'
                          : gameState === 'OPEN'
                            ? 'bg-gradient-to-br from-teal-400 to-teal-700 cursor-pointer hover:brightness-110 active:scale-95 shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.2)] animate-[pulse-glow_2s_infinite]'
                            : 'bg-gradient-to-br from-zinc-600 to-zinc-800 cursor-not-allowed shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.1)] opacity-70'
                      }
                       `}
                  >
                    <span className="w-full text-center leading-tight md:whitespace-normal break-words">
                      {opt}
                    </span>
                    {isMyVote && (
                      <span className="text-xs sm:text-sm font-bold tracking-widest text-teal-100 bg-teal-900/60 px-2 py-0.5 rounded-full">
                        VOTED
                      </span>
                    )}
                  </button>
                );
              });
            })() : (
              <button
                disabled={gameState !== 'OPEN' || hasVoted}
                onClick={() => handleBuzz()}
                className={`
                  relative 
                  w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80
                  rounded-full flex items-center justify-center
                  text-4xl sm:text-5xl md:text-7xl font-black text-white
                  transition-all duration-150
                  ${hasVoted
                    ? 'bg-gradient-to-br from-teal-600 to-teal-800 cursor-default border-4 border-teal-400/40 shadow-[0_0_30px_rgba(20,184,166,0.3)]'
                    : gameState === 'OPEN'
                      ? 'bg-gradient-to-br from-teal-400 to-teal-700 cursor-pointer hover:brightness-110 active:scale-95 shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.2)] animate-[pulse-glow_2s_infinite]'
                      : 'bg-gradient-to-br from-zinc-600 to-zinc-800 cursor-not-allowed shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.1)] opacity-70'
                  }
                `}
              >
                {hasVoted ? 'VOTED' : (gameState === 'WAITING' ? 'LOCKED' : 'BUZZ!')}
              </button>
            )}
          </div>
        </Card>

        {/* Bottom Section: Rankings & Lobby */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full items-start">

          {/* Rankings Grid Item */}
          <Card className="bg-zinc-900/80 backdrop-blur border-zinc-800 flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle>Rankings (Fastest per Option)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {rankings.length === 0 ? (
                <p className="text-sm text-zinc-400">No buzzes yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {rankings.map((buzz, idx) => (
                    <li
                      key={idx}
                      className={`
                        w-full flex justify-between items-center px-4 py-3 rounded-xl border 
                        ${idx === 0
                          ? 'bg-teal-500/10 border-teal-500/40'
                          : 'bg-zinc-800/50 border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-baseline gap-2 truncate">
                        <span className={`text-lg font-black ${idx === 0 ? 'text-teal-400' : 'text-zinc-200'}`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-white truncate">
                          {buzz.user.name} <span className="opacity-50 font-normal text-sm">@{buzz.user.id.substring(0, 5)}</span>
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-4">
                        <span className="font-bold text-teal-400">
                          {buzz.reactionTimeMs}ms
                        </span>
                        {buzz.option && <span className="text-xs text-teal-400/70">Opt: {buzz.option}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Lobby Grid Item */}
          <Card className="bg-zinc-900/80 backdrop-blur border-zinc-800 flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle>Lobby ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2">
                {users.map(u => (
                  <li
                    key={u.id}
                    className={`
                      w-full flex justify-between items-center px-4 py-3 rounded-xl 
                      bg-zinc-800/50 border-l-4 
                      ${u.isHost ? 'border-l-teal-500' : 'border-l-transparent'}
                    `}
                  >
                    <span className="font-medium text-zinc-200 truncate pr-2">
                      {u.name} <span className="opacity-50 text-sm">@{u.id.substring(0, 5)}</span>
                      {u.id === myUserId && <span className="text-teal-400 ml-2 font-bold">(You)</span>}
                    </span>
                    {u.isHost && <Badge className="bg-teal-700 hover:bg-teal-700 font-bold shrink-0">HOST</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </div>

      </main>

      <footer className="w-full py-4 mt-auto text-center border-t border-zinc-800/50">
        <p className="text-xs sm:text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} AI Horizon
        </p>
      </footer>

    </div>
  );
}
