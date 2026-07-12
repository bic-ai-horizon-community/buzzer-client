import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Trophy, Target, Zap, CheckCircle2, Medal, Lock, Check, Award, MonitorPlay } from 'lucide-react';

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
      <Route path="/tv" element={<RankingsPopout />} />
      <Route path="/rankings" element={<RankingsPopout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Live Rankings Pop-out ─────────────────────────────────────────────────
function RankingsPopout() {
  const [gameState, setGameState] = useState('WAITING');
  const [buzzes, setBuzzes] = useState([]);
  const [options, setOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [winnerData, setWinnerData] = useState(null);
  const [revealSnapshot, setRevealSnapshot] = useState(null);
  const [revealBurst, setRevealBurst] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('tv_register');
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleUsersUpdate = (updatedUsers) => setUsers(updatedUsers);
    const handleGameState = (state) => {
      setGameState(state.gameState || 'WAITING');
      setBuzzes(state.buzzes || []);
      setOptions(state.options || []);
      if ((state.gameState === 'WAITING' || state.gameState === 'OPEN') && (!state.buzzes || state.buzzes.length === 0)) {
        setRevealSnapshot(null);
        setWinnerData(null);
      }
    };
    const handleWinnerReveal = (data) => {
      setWinnerData(data || null);
      if (data) {
        setRevealBurst(true);
        setTimeout(() => setRevealBurst(false), 900);
        setBuzzes(prev => {
          setRevealSnapshot({ winnerData: data, buzzes: [...prev] });
          return prev;
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('users_update', handleUsersUpdate);
    socket.on('game_state', handleGameState);
    socket.on('winner_reveal', handleWinnerReveal);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('users_update', handleUsersUpdate);
      socket.off('game_state', handleGameState);
      socket.off('winner_reveal', handleWinnerReveal);
    };
  }, []);

  const sourceBuzzes = revealSnapshot?.buzzes ?? buzzes;
  const rankings = [...sourceBuzzes].sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
  const topColor = gameState === 'OPEN' ? '#14b8a6' : gameState === 'WAITING' ? '#71717a' : '#fbbf24';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_45%),linear-gradient(135deg,_#09090b_0%,_#111827_70%,_#030712_100%)] text-zinc-50 p-4 sm:p-6 lg:p-8">
      {revealBurst && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 42%)', animation: 'reveal-burst-tv 0.7s ease-out forwards' }} />
          <div style={{ width: 'min(54vw, 32rem)', height: 'min(54vw, 32rem)', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 0 0 0 rgba(255,255,255,0)', animation: 'winner-ring-tv 0.75s ease-out forwards' }} />
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-7 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-teal-400/50 bg-teal-500/20 p-3 shadow-[0_0_30px_rgba(45,212,191,0.3)]">
                  <MonitorPlay size={28} className="text-teal-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.4em] text-teal-300/90 mb-1">Spectator Mode</p>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">Live Leaderboard</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-base sm:text-lg text-zinc-400 font-medium">
                Watch the action unfold live in real time.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-sm font-semibold text-zinc-200">
                {gameState === 'OPEN' ? 'Round Open' : gameState === 'WAITING' ? 'Waiting for Round' : 'Winner Revealed'}
              </span>
              <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: `${topColor}40`, color: topColor, backgroundColor: `${topColor}14` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: topColor }} />
                {isConnected ? 'Live' : 'Connecting'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                <div className="rounded-full bg-amber-500/20 p-1.5">
                  <Trophy size={20} className="text-amber-400" />
                </div>
                Live Ranking Board
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {rankings.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                  <Trophy size={38} className="mb-3 text-zinc-700" />
                  <p className="text-lg font-semibold text-zinc-300">No buzzes yet.</p>
                  <p className="mt-2 text-sm text-zinc-500">The leaderboard will appear here once the round is live.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {rankings.map((buzz, idx) => {
                    const barColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#d1d5db' : idx === 2 ? '#fb923c' : '#14b8a6';
                    const maxTime = rankings[rankings.length - 1]?.reactionTimeMs || 1;
                    const barWidth = Math.max(14, Math.round((buzz.reactionTimeMs / maxTime) * 100));
                    return (
                      <li key={`${buzz.user.id}-${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${idx === 0 ? 'bg-amber-500/15 text-amber-400' : idx === 1 ? 'bg-zinc-500/15 text-zinc-300' : idx === 2 ? 'bg-orange-500/15 text-orange-400' : 'bg-teal-500/10 text-teal-300'}`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-lg font-extrabold text-white">{buzz.user.name}</p>
                              <p className="text-sm text-zinc-500">@{buzz.user.id.substring(0, 5)} • {buzz.option || 'No option'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black" style={{ color: barColor }}>{buzz.reactionTimeMs}ms</p>
                            {winnerData?.winner?.id === buzz.user.id && (
                              <span className="mt-1 inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                                Winner
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: barColor, boxShadow: `0 0 10px ${barColor}70` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="text-xl font-bold">Round Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Status</p>
                  <p className="mt-2 text-2xl font-black text-white">{gameState === 'OPEN' ? 'Buzzing now' : gameState === 'WAITING' ? 'Ready for next round' : 'Winner revealed'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Options</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {options.length > 0 ? options.map(opt => (
                      <span key={opt} className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1.5 text-sm font-semibold text-teal-300">{opt}</span>
                    )) : <span className="text-sm text-zinc-500">No options set yet.</span>}
                  </div>
                </div>
                {winnerData?.winner && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Latest Winner</p>
                    <p className="mt-2 text-2xl font-black text-white">{winnerData.winner.name}</p>
                    <p className="mt-1 text-sm text-amber-100/80">{winnerData.winner.reactionTimeMs}ms • {winnerData.winner.option || 'Global'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="text-xl font-bold">Audience Lobby</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="flex flex-col gap-2">
                  {users.length === 0 ? (
                    <li className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">Waiting for players to join.</li>
                  ) : users.map(user => (
                    <li key={user.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <span className="truncate font-semibold text-zinc-200">{user.name}</span>
                      {user.isHost && <Badge className="bg-teal-600 hover:bg-teal-600 font-bold">HOST</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Winner Modal — appears over everything for TV view */}
      <WinnerModal
        winnerData={winnerData}
        onClose={() => setWinnerData(null)}
      />
    </div>
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

    const pieces = Array.from({ length: 140 }, (_, i) => {
      const layer = i < 50 ? 0 : i < 100 ? 1 : 2;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: (Math.random() * 3 + 1) * (layer === 0 ? 1 : layer === 1 ? 0.65 : 0.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 15) - 7,
        tiltAngle: 0,
        tiltAngleDelta: (Math.random() * 0.07) + 0.05,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        blur: layer === 0 ? 0 : layer === 1 ? 1 : 2.5,
        alpha: layer === 0 ? 0.9 : layer === 1 ? 0.6 : 0.35,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        if (p.blur > 0) ctx.filter = `blur(${p.blur}px)`;
        ctx.translate(p.x + p.tilt, p.y);
        ctx.rotate(p.tiltAngle * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        p.y += p.d + 0.5;
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
  const [impactFlash, setImpactFlash] = useState(false);

  useEffect(() => {
    if (winnerData) {
      // Impact frame: brief white flash
      setImpactFlash(true);
      setTimeout(() => setImpactFlash(false), 280);
      // Entrance animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [winnerData]);

  if (!winnerData) return null;

  const { winner, correctOption } = winnerData;

  return (
    <>
      {/* White impact flash */}
      {impactFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(255,255,255,0.7)',
          animation: 'impact-flash 0.28s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(8px)',
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
          borderRadius: '32px',
          padding: 'clamp(28px, 8vw, 56px) clamp(20px, 6vw, 64px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 50px rgba(20,184,166,0.2), inset 0 0 50px rgba(20,184,166,0.05)',
          minWidth: 'min(360px, 92vw)',
          maxWidth: '92vw',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated border glow effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '32px',
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
                background: 'linear-gradient(135deg, #14b8a6, #67e8f9, #a78bfa, #14b8a6)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0',
                lineHeight: 1.1,
                wordBreak: 'break-word',
                animation: visible ? 'zoom-in-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.5s, gradient-move 3s ease infinite' : 'none',
                filter: 'drop-shadow(0px 4px 14px rgba(20,184,166,0.45))',
              }}>
                {winner.name}
              </h2>

              {/* Stats with staggered animations */}
              <div className="flex flex-col gap-4 sm:gap-6 justify-center mt-8 sm:mt-12">
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
        @keyframes gradient-move {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes impact-flash {
          0%   { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  </>
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
  const [optionsInput, setOptionsInput] = useState('');
  const [myUserId, setMyUserId] = useState(() => localStorage.getItem('hyperbuzz_userid') || '');
  const [isLoading, setIsLoading] = useState(true);

  // Admin: which option is marked as correct
  const [correctOption, setCorrectOption] = useState(null);
  // Winner modal data (shared for all users)
  const [winnerData, setWinnerData] = useState(null);
  // Snapshot of winner + buzzes frozen at reveal time — persists even after reset
  const [revealSnapshot, setRevealSnapshot] = useState(null);
  // Reveal burst animation for the winner announcement
  const [revealBurst, setRevealBurst] = useState(false);
  // Tap feedback
  const [buzzFlash, setBuzzFlash] = useState(false);
  const [buzzToast, setBuzzToast] = useState(false);

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
        setRevealBurst(true);
        setTimeout(() => setRevealBurst(false), 1400);
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
      // Haptic feedback (mobile)
      if (navigator.vibrate) navigator.vibrate(60);
      // Screen tint flash
      setBuzzFlash(true);
      setTimeout(() => setBuzzFlash(false), 420);
      // Floating toast
      setBuzzToast(true);
      setTimeout(() => setBuzzToast(false), 1400);
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
    setRevealBurst(false);
  };

  const handleSetCorrectOption = (opt) => {
    // Toggle: clicking the same option deselects it
    const newOpt = correctOption === opt ? null : opt;
    setCorrectOption(newOpt);
    socket.emit('set_correct_option', { option: newOpt });
  };

  const handleRevealWinner = () => {
    setRevealBurst(true);
    setTimeout(() => setRevealBurst(false), 1400);
    socket.emit('reveal_winner');
  };

  const currentUser = users.find(u => u.id === myUserId);
  const isHost = currentUser?.isHost || false;
  const hasVoted = buzzes.some(b => b.user.id === myUserId);
  // Focus mode: spotlight the buzzer when round is live and player hasn't voted
  const focusMode = gameState === 'OPEN' && !hasVoted && !isHost;

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

      {revealBurst && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle, rgba(251,191,36,0.24) 0%, rgba(20,184,166,0.12) 38%, rgba(0,0,0,0) 72%)',
              animation: 'reveal-burst 1.4s ease-out forwards',
            }}
          />
          <div
            style={{
              width: 'min(76vw, 42rem)', height: 'min(76vw, 42rem)',
              borderRadius: '50%',
              border: '2px solid rgba(251,191,36,0.45)',
              boxShadow: '0 0 0 0 rgba(251,191,36,0.4), inset 0 0 40px rgba(251,191,36,0.18)',
              animation: 'winner-ring 1.35s ease-out forwards',
            }}
          />
        </div>
      )}

      {/* Winner Modal — appears over everything for ALL users */}
      <WinnerModal
        winnerData={winnerData}
        onClose={() => {
          // Only close the modal; rankings stay visible until game is reset
          setWinnerData(null);
        }}
      />

      {/* Screen tint flash on buzz */}
      {buzzFlash && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'radial-gradient(circle at center, rgba(20,184,166,0.18) 0%, transparent 70%)',
            animation: 'buzz-flash 0.42s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Floating ⊡ Locked in! toast */}
      {buzzToast && (
        <div
          style={{
            position: 'fixed', bottom: '30%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 51,
            background: 'rgba(20,184,166,0.15)',
            border: '1px solid rgba(20,184,166,0.4)',
            backdropFilter: 'blur(8px)',
            borderRadius: '999px',
            padding: '10px 22px',
            fontSize: '15px',
            fontWeight: 700,
            color: '#5eead4',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            animation: 'toast-up 1.4s ease-out forwards',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Zap size={18} fill="#5eead4" />
          Locked in!
        </div>
      )}

      {/* Navigation */}
      <header
        className="w-full py-3 border-b border-white/10 bg-zinc-950/90 backdrop-blur sticky top-0 z-10 px-4"
        style={{
          transition: 'opacity 0.5s ease, filter 0.5s ease',
          opacity: focusMode ? 0.15 : 1,
          filter: focusMode ? 'blur(3px)' : 'none',
          pointerEvents: focusMode ? 'none' : 'auto',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 sm:gap-10">
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
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-zinc-800 min-w-0 overflow-hidden">
              <span className="text-xs sm:text-sm font-medium truncate">
                <strong className="text-white">{currentUser?.name}</strong>
                <span className="opacity-40 hidden sm:inline"> @{currentUser?.id?.substring(0, 5)}</span>
              </span>
              {isHost && <Badge className="bg-teal-600 hover:bg-teal-600 font-bold text-xs shrink-0">HOST</Badge>}
            </div>
            {isAdminRoute && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const popup = window.open('/tv', 'hyperbuzz-rankings', 'width=1400,height=900,toolbar=no,menubar=no,location=no,status=no');
                  if (popup) popup.focus();
                }}
                className="rounded-full border-teal-700/70 text-teal-300 hover:text-white hover:bg-zinc-800 shrink-0 text-xs px-3"
              >
                <MonitorPlay size={14} className="mr-1.5" />
                TV View
              </Button>
            )}
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
      <main className="flex-grow w-full max-w-5xl mx-auto py-6 sm:py-10 md:py-12 px-4 sm:px-6 flex flex-col gap-6 sm:gap-10">

        {/* Host Controls — always full opacity for host */}
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
        <Card
          className="flex flex-col items-center justify-center py-12 sm:py-20 md:py-32 bg-white/5 backdrop-blur border-white/10 overflow-hidden relative rounded-[2rem]"
          style={{
            transition: 'transform 0.4s ease, box-shadow 0.4s ease',
            transform: focusMode ? 'scale(1.02)' : 'scale(1)',
            boxShadow: focusMode ? '0 0 60px rgba(20,184,166,0.15)' : 'none',
          }}
        >
          {/* Status heading with pulsing dot */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 mb-10 sm:mb-16">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* State dot */}
              <span style={{
                display: 'inline-block',
                width: 'clamp(10px, 2vw, 14px)', height: 'clamp(10px, 2vw, 14px)',
                borderRadius: '50%',
                background: gameState === 'OPEN' && !hasVoted ? '#14b8a6' : hasVoted ? '#14b8a6' : '#52525b',
                boxShadow: gameState === 'OPEN' && !hasVoted ? '0 0 15px rgba(20,184,166,0.9)' : 'none',
                animation: gameState === 'OPEN' && !hasVoted
                  ? 'dot-pulse 0.9s ease-in-out infinite'
                  : 'dot-breathe 3s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <h2
                className="tracking-tighter font-black leading-none"
                style={{
                  fontSize: gameState === 'OPEN' ? 'clamp(2.8rem, 10vw, 5.5rem)' : 'clamp(2.2rem, 8vw, 4rem)',
                  color: gameState === 'WAITING' ? 'rgba(255,255,255,0.2)' : hasVoted ? '#5eead4' : '#14b8a6',
                  transition: 'all 0.3s ease',
                  animation: gameState === 'OPEN' && !hasVoted ? 'flash-in 0.35s ease both' : 'none',
                  textShadow: gameState === 'OPEN' && !hasVoted ? '0 0 30px rgba(20,184,166,0.3)' : 'none',
                }}
              >
                {gameState === 'WAITING' ? 'READY' : hasVoted ? 'LOCKED IN' : 'GO!'}
              </h2>
            </div>
            {/* Live buzz counter */}
            {gameState === 'OPEN' && buzzes.length > 0 && (
              <div
                style={{ animation: 'slide-up-fade 0.3s ease both' }}
                className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14b8a6', display: 'inline-block', animation: 'dot-pulse 0.9s ease-in-out infinite' }} />
                <span className="text-xs sm:text-sm font-bold text-teal-400 tracking-wide uppercase">{buzzes.length} buzzed in</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 justify-center max-w-4xl mx-auto px-4">
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
                    style={{
                      cursor: isMyVote ? 'default' : isOtherVoted ? 'not-allowed' : gameState === 'OPEN' ? 'crosshair' : 'not-allowed',
                      animation: isMyVote ? 'none' : gameState === 'WAITING' ? 'breathe 3s ease-in-out infinite' : 'none',
                    }}
                    className={`
                        relative group shrink-0
                        w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52
                        rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-3 gap-1
                        text-2xl sm:text-3xl md:text-5xl font-black text-white
                        transition-all duration-150 break-words select-none
                        ${isMyVote
                        ? 'bg-gradient-to-br from-teal-500 to-teal-700 border-2 border-teal-300/60 shadow-[0_0_40px_rgba(20,184,166,0.5)] scale-105'
                        : isOtherVoted
                          ? 'bg-zinc-800/60 opacity-25 border border-white/5 grayscale'
                          : gameState === 'OPEN'
                            ? 'bg-gradient-to-br from-teal-400 to-teal-700 hover:brightness-110 active:scale-95 hover:scale-105 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.2)] animate-[pulse-glow_2s_infinite]'
                            : 'bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.05)] opacity-60'
                      }
                    `}
                  >
                    <span className="w-full text-center leading-tight md:whitespace-normal break-words">
                      {opt}
                    </span>
                    {isMyVote && (
                      <span className="text-xs sm:text-sm font-black tracking-widest text-teal-100 bg-teal-900/70 px-3 py-1 rounded-full flex items-center gap-1">
                        <Lock size={12} className="shrink-0" />
                        LOCKED
                      </span>
                    )}
                  </button>
                );
              });
            })() : (
              <button
                disabled={gameState !== 'OPEN' || hasVoted}
                onClick={() => handleBuzz()}
                style={{
                  cursor: hasVoted ? 'default' : gameState === 'OPEN' ? 'crosshair' : 'not-allowed',
                  animation: !hasVoted && gameState === 'WAITING' ? 'breathe 3s ease-in-out infinite' : 'none',
                }}
                className={`
                  relative
                  w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80
                  rounded-full flex items-center justify-center
                  text-4xl sm:text-5xl md:text-7xl font-black text-white
                  transition-all duration-150 select-none
                  ${hasVoted
                    ? 'bg-gradient-to-br from-teal-600 to-teal-800 border-4 border-teal-400/40 shadow-[0_0_40px_rgba(20,184,166,0.4)]'
                    : gameState === 'OPEN'
                      ? 'bg-gradient-to-br from-teal-400 to-teal-700 hover:brightness-110 active:scale-95 hover:scale-105 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.2)] animate-[pulse-glow_2s_infinite]'
                      : 'bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_5px_15px_rgba(255,255,255,0.05)] opacity-60'
                  }
                `}
              >
                {hasVoted ? <Check size={56} strokeWidth={3} /> : (gameState === 'WAITING' ? 'READY' : 'BUZZ!')}
              </button>
            )}
          </div>
        </Card>

        {/* Bottom Section: Rankings & Lobby — fade when in focus mode */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 w-full items-start"
          style={{
            transition: 'opacity 0.5s ease, filter 0.5s ease',
            opacity: focusMode ? 0.15 : 1,
            filter: focusMode ? 'blur(3px)' : 'none',
            pointerEvents: focusMode ? 'none' : 'auto',
          }}
        >

          {/* Rankings Grid Item — only visible after winner is revealed, uses frozen snapshot */}
          {revealSnapshot ? (() => {
            const allRankings = [...revealSnapshot.buzzes].sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
            const maxTime = allRankings.length > 0 ? allRankings[allRankings.length - 1].reactionTimeMs : 1;
            return (
              <Card className="bg-white/5 backdrop-blur border-white/10 flex flex-col h-full rounded-2xl" style={{ animation: 'slide-up-fade 0.5s ease both' }}>
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
                      {allRankings.map((buzz, idx) => {
                        const barColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#d1d5db' : idx === 2 ? '#fb923c' : '#14b8a6';
                        const barWidth = Math.round((buzz.reactionTimeMs / maxTime) * 100);
                        return (
                          <li
                            key={idx}
                            style={{ animation: `slide-up-fade 0.4s ease ${idx * 0.08}s both` }}
                            className={`w-full flex flex-col gap-1.5 px-4 py-3 rounded-2xl border ${
                              idx === 0 ? 'bg-amber-500/10 border-amber-400/30' :
                              idx === 1 ? 'bg-white/5 border-white/10' :
                              idx === 2 ? 'bg-orange-400/10 border-orange-400/25' :
                              'bg-white/[0.03] border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline gap-2 truncate">
                                <span className={`text-lg font-black flex items-center justify-center w-8 h-8 ${
                                  idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-orange-400' : 'text-zinc-500'
                                }`}>
                                  {idx === 0 ? <Medal size={22} fill="currentColor" /> : 
                                   idx === 1 ? <Medal size={22} fill="currentColor" /> : 
                                   idx === 2 ? <Medal size={22} fill="currentColor" /> : 
                                   <span className="text-sm font-bold opacity-60">#{idx + 1}</span>}
                                </span>
                                <span className="font-extrabold text-white truncate">
                                  {buzz.user.name}
                                  <span className="opacity-40 font-normal text-xs ml-1">@{buzz.user.id.substring(0, 5)}</span>
                                </span>
                              </div>
                              <span className="font-bold text-sm shrink-0 ml-3" style={{ color: barColor }}>
                                {buzz.reactionTimeMs}ms
                              </span>
                            </div>
                            {/* Animated progress bar */}
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: '999px',
                                  background: barColor,
                                  '--bar-w': `${barWidth}%`,
                                  width: `${barWidth}%`,
                                  animation: `bar-fill 0.9s cubic-bezier(0.22,1,0.36,1) ${idx * 0.08 + 0.3}s both`,
                                  boxShadow: `0 0 8px ${barColor}80`,
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })() : (
            <Card className="bg-white/5 backdrop-blur border-white/10 flex flex-col h-full items-center justify-center min-h-[180px] rounded-2xl">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Trophy size={32} className="text-zinc-700" />
                <p className="text-sm text-zinc-500 font-medium">Rankings will be revealed<br />when the winner is announced</p>
              </CardContent>
            </Card>
          )}

          {/* Lobby Grid Item */}
          <Card className="bg-white/5 backdrop-blur border-white/10 flex flex-col h-full rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle>Lobby ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="flex flex-col gap-2">
                {users.map(u => (
                  <li
                    key={u.id}
                    className={`
                      w-full flex justify-between items-center px-4 py-3 rounded-2xl 
                      bg-white/[0.04] border border-white/[0.06]
                      ${u.isHost ? 'border-l-4 border-l-teal-500' : ''}
                    `}
                  >
                    <span className="font-semibold text-zinc-200 truncate pr-2">
                      {u.name} <span className="opacity-40 text-sm">@{u.id.substring(0, 5)}</span>
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
        @keyframes buzz-flash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes reveal-burst {
          0%   { opacity: 0; transform: scale(0.9); }
          15%  { opacity: 0.85; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.18); }
        }
        @keyframes winner-ring {
          0%   { transform: scale(0.5); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scale(1.08); opacity: 0; }
        }
        @keyframes reveal-burst-tv {
          0%   { opacity: 0; transform: scale(1); }
          10%  { opacity: 0.88; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        @keyframes winner-ring-tv {
          0%   { transform: scale(0.75); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: scale(1.01); opacity: 0; }
        }
        @keyframes toast-up {
          0%   { opacity: 0; transform: translateX(-50%) translateY(0); }
          20%  { opacity: 1; transform: translateX(-50%) translateY(-16px); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(-24px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.03); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.65); }
        }
        @keyframes dot-breathe {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes flash-in {
          0%   { opacity: 0; transform: scale(1.25); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes bar-fill {
          from { width: 0 !important; }
          to   { width: var(--bar-w, 100%); }
        }
        @keyframes gradient-move {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slide-up-fade {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      </div>
    </>
  );
}
