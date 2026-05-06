import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Trophy, Target, Zap, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Dynamically resolve server URL so mobile devices on the local network
// connect to THIS machine (same hostname the Vite page was served from),
// not their own localhost. Falls back to an explicit env var for production.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

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

// ─── Confetti Canvas ─────────────────────────────────────────────────────────
function ConfettiCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      '#14b8a6', '#06b6d4', '#f59e0b', '#ec4899',
      '#a78bfa', '#34d399', '#fb923c', '#60a5fa'
    ];

    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 15) - 7,
      tiltAngle: 0,
      tiltAngleDelta: (Math.random() * 0.07) + 0.05,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x + p.tilt, p.y);
        ctx.rotate(p.tiltAngle * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        p.y += p.d + 1;
        p.tiltAngle += p.tiltAngleDelta;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', width: '100%', height: '100%'
      }}
    />
  );
}

// ─── Winner Modal ─────────────────────────────────────────────────────────────
function WinnerModal({ winnerData, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (winnerData) {
      // Brief delay for entrance animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [winnerData]);

  if (!winnerData) return null;

  const { winner, correctOption } = winnerData;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        transition: 'opacity 0.4s',
        opacity: visible ? 1 : 0,
      }}
      onClick={onClose}
    >
      <ConfettiCanvas />

      <div
        style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(40px)',
          transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s',
          opacity: visible ? 1 : 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Animated glow rings - multiple layers for depth */}
        <div style={{
          position: 'absolute', inset: '-30px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)',
          filter: 'blur(25px)',
          zIndex: -1,
          animation: visible ? 'pulse-glow-large 2.5s ease-in-out infinite' : 'none',
        }} />
        <div style={{
          position: 'absolute', inset: '-20px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, transparent 70%)',
          filter: 'blur(15px)',
          zIndex: -1,
          animation: visible ? 'pulse-glow 2s ease-in-out infinite' : 'none',
        }} />
        <div style={{
          position: 'absolute', inset: '-15px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: -1,
          animation: visible ? 'pulse-glow-accent 3s ease-in-out infinite' : 'none',
        }} />

        {/* Trophy emoji with enhanced bounce and glow */}
        <div style={{
          fontSize: 'clamp(60px, 15vw, 100px)',
          lineHeight: 1,
          animation: visible ? 'bounce-trophy 0.8s cubic-bezier(0.34,1.56,0.64,1) both 0.1s' : 'none',
          marginBottom: '12px',
          filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.8)) drop-shadow(0 0 60px rgba(20,184,166,0.4))',
          textShadow: '0 0 20px rgba(251,191,36,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Trophy size={80} color="#fbbf24" strokeWidth={1.5} fill="#fbbf24" />
        </div>

        {/* Card with enhanced backdrop and border glow */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(15,25,35,0.97) 100%)',
          border: '2px solid rgba(20,184,166,0.6)',
          borderRadius: '24px',
          padding: 'clamp(24px, 6vw, 48px) clamp(28px, 8vw, 64px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(20,184,166,0.25), inset 0 0 40px rgba(20,184,166,0.05)',
          minWidth: 'min(340px, 90vw)',
          maxWidth: '90vw',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated border glow effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            padding: '2px',
            background: visible ? 'linear-gradient(45deg, rgba(20,184,166,0.5), transparent, rgba(20,184,166,0.5))' : 'transparent',
            backgroundSize: '300% 300%',
            animation: visible ? 'gradient-shift 3s ease infinite' : 'none',
            pointerEvents: 'none',
            zIndex: -1,
          }} />

          {winner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
              <p style={{
                fontSize: 'clamp(14px, 4vw, 18px)',
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                animation: visible ? 'slide-up-fade 0.5s ease-out both 0.3s' : 'none',
                marginBottom: '4px',
              }}>
                The Winner Is...
              </p>
              
              <h2 style={{
                fontSize: 'clamp(40px, 12vw, 72px)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #14b8a6 0%, #67e8f9 50%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0',
                lineHeight: 1.1,
                wordBreak: 'break-word',
                animation: visible ? 'zoom-in-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.5s, text-shimmer 2.5s ease-in-out both 1.1s' : 'none',
                filter: 'drop-shadow(0px 4px 10px rgba(20,184,166,0.3))',
              }}>
                {winner.name}
              </h2>

              {/* Stats with staggered animations */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '14px',
                justifyContent: 'center', marginTop: '28px',
              }}>
                {/* Selected Option Badge */}
                {correctOption && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0.05) 100%)',
                    border: '1.5px solid rgba(20,184,166,0.5)',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    animation: visible ? 'slide-up-fade 0.5s ease-out both 0.7s, scale-pulse 2s ease-in-out both 1.2s' : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Badge shimmer effect */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: visible ? 'shimmer 2s infinite' : 'none',
                      pointerEvents: 'none',
                    }} />
                    <span style={{ fontSize: '10px', color: '#5eead4', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={14} color="#5eead4" />
                      Selected Option
                    </span>
                    <span style={{ fontSize: 'clamp(16px, 4vw, 28px)', color: '#14b8a6', fontWeight: 900, position: 'relative', zIndex: 1 }}>{correctOption}</span>
                  </div>
                )}
                
                {/* Reaction Time Badge */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.05) 100%)',
                  border: '1.5px solid rgba(167,139,250,0.5)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  animation: visible ? 'slide-up-fade 0.5s ease-out both 0.9s, scale-pulse 2s ease-in-out both 1.4s' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Badge shimmer effect */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: visible ? 'shimmer 2s infinite' : 'none',
                    pointerEvents: 'none',
                  }} />
                  <span style={{ fontSize: '10px', color: '#c4b5fd', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="#c4b5fd" />
                    Fastest Time
                  </span>
                  <span style={{ fontSize: 'clamp(16px, 4vw, 28px)', color: '#a78bfa', fontWeight: 900, position: 'relative', zIndex: 1 }}>{winner.reactionTimeMs}ms</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ animation: visible ? 'slide-up-fade 0.5s ease-out both 0.2s' : 'none', position: 'relative', zIndex: 1 }}>
              <h2 style={{
                fontSize: 'clamp(22px, 7vw, 40px)',
                fontWeight: 900,
                color: '#94a3b8',
                margin: 0,
              }}>
                No responses on<br />the correct option
              </h2>
            </div>
          )}

          <p style={{
            marginTop: '32px',
            fontSize: 'clamp(11px, 3vw, 13px)',
            color: '#475569',
            animation: visible ? 'fade-in 1s ease-out both 1.8s, pulse-text 2s ease-in-out both 2s' : 'none',
            position: 'relative',
            zIndex: 1,
          }}>
            Tap anywhere to dismiss
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce-trophy {
          0%   { transform: scale(0) rotate(-20deg); }
          60%  { transform: scale(1.15) rotate(5deg); }
          80%  { transform: scale(0.92) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes pulse-glow-large {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 0.8;   transform: scale(1.15); }
        }
        @keyframes pulse-glow-accent {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.6;   transform: scale(1.12); }
        }
        @keyframes slide-up-fade {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoom-in-bounce {
          0%   { opacity: 0; transform: scale(0.5); }
          50%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes text-shimmer {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.7; }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes gradient-shift {
          0%   { background-position: 0% center; }
          50%  { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
      `}</style>
    </div>
  );
}


// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Loader({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(20,184,166,0.1) 0%, transparent 70%)',
          animation: 'pulse-bg 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          zIndex: 10,
        }}
      >
        {/* Spinning logo container */}
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Outer rotating ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: '#14b8a6',
              borderRightColor: '#06b6d4',
              animation: 'spin 2s linear infinite',
            }}
          />

          {/* Middle rotating ring (counter) */}
          <div
            style={{
              position: 'absolute',
              inset: '12px',
              borderRadius: '50%',
              border: '2px solid transparent',
              borderBottomColor: '#fbbf24',
              borderLeftColor: '#f59e0b',
              animation: 'spin-reverse 3s linear infinite',
            }}
          />

          {/* Logo image */}
          <img
            // src="/ai-horizon-logo.svg"
            src='/image-removebg-preview.png'
            alt="AI Horizon"
            style={{
              width: '80px',
              height: '80px',
              filter: 'drop-shadow(0 0 20px rgba(20,184,166,0.5))',
            }}
          />

          {/* Pulsing glow */}
          <div
            style={{
              position: 'absolute',
              inset: '-20px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)',
              filter: 'blur(15px)',
              animation: 'pulse-glow-loader 1.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Loading text */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '18px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 8px 0',
              letterSpacing: '0.05em',
            }}
          >
            {/* AI HORIZON */}
          </p>
          <p
            style={{
              fontSize: '12px',
              color: '#64748b',
              margin: 0,
              animation: 'fade-dots 1.5s ease-in-out infinite',
            }}
          >
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulse-glow-loader {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes pulse-bg {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes fade-dots {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}


// ─── Main Game Application ────────────────────────────────────────────────────
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
  const [isLoading, setIsLoading] = useState(true);

  // Admin: which option is marked as correct
  const [correctOption, setCorrectOption] = useState(null);
  // Winner modal data (shared for all users)
  const [winnerData, setWinnerData] = useState(null);
  // Snapshot of winner + buzzes frozen at reveal time — persists even after reset
  const [revealSnapshot, setRevealSnapshot] = useState(null);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    socket.on('connect', () => {
      console.log('Connected to server', socket.id);
      setIsLoading(false);
      clearTimeout(loadingTimer);
    });

    socket.on('users_update', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('game_state', (state) => {
      setGameState(state.gameState);
      setBuzzes(state.buzzes || []);
      setOptions(state.options || []);
      if (state.correctOption !== undefined) setCorrectOption(state.correctOption);
      // Clear reveal snapshot when game resets to WAITING with no buzzes
      if (state.gameState === 'WAITING' && (!state.buzzes || state.buzzes.length === 0)) {
        setRevealSnapshot(null);
        setWinnerData(null);
      }
    });

    socket.on('admin_success', () => {
      setJoined(true);
    });

    socket.on('admin_error', (msg) => {
      alert(msg);
    });

    // Admin: server confirmed correct option
    socket.on('correct_option_set', ({ correctOption: co }) => {
      setCorrectOption(co);
    });

    // All users: show winner modal + freeze snapshot
    socket.on('winner_reveal', (data) => {
      setWinnerData(data || null);
      if (data) {
        // Capture current buzzes at the time of reveal
        setBuzzes(prev => {
          setRevealSnapshot({ winnerData: data, buzzes: prev });
          return prev;
        });
      }
    });

    // Auto-reconnect if session data exists
    const savedId = localStorage.getItem('hyperbuzz_userid');
    const savedName = localStorage.getItem('hyperbuzz_username');
    const isAdminMode = localStorage.getItem('hyperbuzz_isadmin') === 'true';

    const canRestoreAdmin = savedId && isAdminMode && isAdminRoute;
    const canRestoreUser = savedId && savedName && !isAdminRoute;

    if (canRestoreAdmin) {
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
      socket.off('correct_option_set');
      socket.off('winner_reveal');
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
    setCorrectOption(null);
  };

  const handleResetRound = () => {
    socket.emit('reset_round');
    setCorrectOption(null);
    // Clear immediately on client for instant feedback;
    // server will also broadcast game_state WAITING which clears for all clients
    setWinnerData(null);
    setRevealSnapshot(null);
  };

  const handleSetCorrectOption = (opt) => {
    // Toggle: clicking the same option deselects it
    const newOpt = correctOption === opt ? null : opt;
    setCorrectOption(newOpt);
    socket.emit('set_correct_option', { option: newOpt });
  };

  const handleRevealWinner = () => {
    socket.emit('reveal_winner');
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

  // ─── NOT JOINED VIEW ───────────────────────────────────────────────────────
  if (!joined) {
    return (
      <>
        <Loader isLoading={isLoading} />
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
          <Card className="w-full max-w-sm bg-zinc-900/90 backdrop-blur border-zinc-800 shadow-2xl">
            <CardHeader className="pb-4 pt-6 px-6">
              {/* College Logo */}
              <div className="flex justify-center mb-4">
                <img 
                  src="https://bicnepal.edu.np/images/logo.svg" 
                  alt="BIC Nepal" 
                  className="h-14 w-auto drop-shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <img src="image-removebg-preview.png" alt="AI Horizon" className="h-16 w-auto ml-3" />
              </div>
              {/* <CardTitle className="text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent pb-1">
                AI Horizon {isAdminRoute && 'Admin'}
              </CardTitle> */}
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
      </>
    );
  }

  // ─── MAIN GAME VIEW ────────────────────────────────────────────────────────
  return (
    <>
      <Loader isLoading={isLoading} />
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50 font-sans">

      {/* Winner Modal — appears over everything for ALL users */}
      <WinnerModal
        winnerData={winnerData}
        onClose={() => {
          // Only close the modal; rankings stay visible until game is reset
          setWinnerData(null);
        }}
      />

      {/* Navigation */}
      <header className="w-full py-3 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur sticky top-0 z-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            {/* College Logo */}
            <img 
              src="https://bicnepal.edu.np/images/logo.svg" 
              alt="BIC Nepal" 
              className="h-10 w-auto drop-shadow-lg"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="hidden sm:block h-8 w-px bg-zinc-700/50" />
            {/* <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent shrink-0">
              AI Horizon
            </h1> */}
            {/* LOGO FOR AI HORIZON */}
            <img src="image-removebg-preview.png" alt="AI Horizon" className="h-16 w-auto" />
          </div>
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
            <CardContent className="flex flex-col gap-5">
              {/* Options input + Open/Reset */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-400">Options (comma separated)</label>
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

              {/* Mark Correct Option section — only when options exist */}
              {options.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-300">
                      Mark Correct Answer
                      <span className="ml-2 text-xs font-normal text-zinc-500">(tap an option to select it)</span>
                    </p>
                    {correctOption && (
                      <span className="text-xs text-teal-400 font-bold bg-teal-500/10 border border-teal-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle2 size={14} color="#14b8a6" fill="#14b8a6" />
                        Correct: {correctOption}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleSetCorrectOption(opt)}
                        className={`
                          px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 flex items-center gap-1.5
                          ${correctOption === opt
                            ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.3)] scale-105'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-teal-600 hover:text-teal-300'
                          }
                        `}
                      >
                        {correctOption === opt && <CheckCircle2 size={14} color="#5eead4" fill="#5eead4" />}
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Reveal Winner Button */}
                  <button
                    onClick={handleRevealWinner}
                    className="
                      mt-1 w-full sm:w-auto self-start
                      relative overflow-hidden
                      px-6 py-3 rounded-2xl font-extrabold text-base tracking-wide
                      bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400
                      text-zinc-900
                      shadow-[0_4px_20px_rgba(251,191,36,0.45)]
                      hover:shadow-[0_6px_30px_rgba(251,191,36,0.65)]
                      hover:brightness-110
                      active:scale-95
                      transition-all duration-200
                      flex items-center gap-2 justify-center
                    "
                  >
                    <Trophy size={18} color="#18181b" />
                    Reveal Winner
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
                        animation: 'shine 2.5s linear infinite',
                      }}
                    />
                  </button>
                </div>
              )}

              {/* Reveal Winner even when no specific options (global buzzer mode) */}
              {options.length === 0 && buzzes.length > 0 && (
                <button
                  onClick={handleRevealWinner}
                  className="
                    w-full sm:w-auto self-start
                    relative overflow-hidden
                    px-6 py-3 rounded-2xl font-extrabold text-base tracking-wide
                    bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400
                    text-zinc-900
                    shadow-[0_4px_20px_rgba(251,191,36,0.45)]
                    hover:shadow-[0_6px_30px_rgba(251,191,36,0.65)]
                    hover:brightness-110
                    active:scale-95
                    transition-all duration-200
                    flex items-center gap-2 justify-center
                  "
                >
                  <Trophy size={18} color="#18181b" />
                  Reveal Winner
                </button>
              )}
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

          {/* Rankings Grid Item — only visible after winner is revealed, uses frozen snapshot */}
          {revealSnapshot ? (() => {
            // Show ALL buzzes sorted by reaction time — using the frozen snapshot
            const allRankings = [...revealSnapshot.buzzes].sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
            return (
              <Card className="bg-zinc-900/80 backdrop-blur border-zinc-800 flex flex-col h-full" style={{ animation: 'slide-up-fade 0.5s ease both' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy size={18} className="text-amber-400" />
                    Full Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {allRankings.length === 0 ? (
                    <p className="text-sm text-zinc-400">No buzzes yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {allRankings.map((buzz, idx) => (
                        <li
                          key={idx}
                          style={{ animation: `slide-up-fade 0.4s ease ${idx * 0.07}s both` }}
                          className={`
                            w-full flex justify-between items-center px-4 py-3 rounded-xl border 
                            ${idx === 0
                              ? 'bg-amber-500/10 border-amber-400/40'
                              : idx === 1
                              ? 'bg-zinc-400/10 border-zinc-400/30'
                              : idx === 2
                              ? 'bg-orange-400/10 border-orange-400/30'
                              : 'bg-zinc-800/50 border-transparent'
                            }
                          `}
                        >
                          <div className="flex items-baseline gap-2 truncate">
                            <span className={`text-lg font-black ${
                              idx === 0 ? 'text-amber-400' :
                              idx === 1 ? 'text-zinc-300' :
                              idx === 2 ? 'text-orange-400' :
                              'text-zinc-500'
                            }`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <span className="font-bold text-white truncate">
                              {buzz.user.name} <span className="opacity-50 font-normal text-sm">@{buzz.user.id.substring(0, 5)}</span>
                            </span>
                          </div>
                          <div className="flex flex-col items-end shrink-0 ml-4">
                            <span className={`font-bold ${
                              idx === 0 ? 'text-amber-400' :
                              idx === 1 ? 'text-zinc-300' :
                              idx === 2 ? 'text-orange-400' :
                              'text-teal-400'
                            }`}>
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
            );
          })() : (
            <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800/50 flex flex-col h-full items-center justify-center min-h-[180px]">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Trophy size={32} className="text-zinc-700" />
                <p className="text-sm text-zinc-500 font-medium">Rankings will be revealed<br />when the winner is announced</p>
              </CardContent>
            </Card>
          )}

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

      <footer className="w-full py-6 mt-auto border-t border-zinc-800/50 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          {/* College Logo in Footer */}
          <img 
            src="https://bicnepal.edu.np/images/logo.svg" 
            alt="BIC Nepal" 
            className="h-8 w-auto drop-shadow-md"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="hidden sm:block h-6 w-px bg-zinc-700/50" />
          <p className="text-xs sm:text-sm text-zinc-500 text-center">
            &copy; {new Date().getFullYear()} AI Horizon
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes shine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      </div>
    </>
  );
}
