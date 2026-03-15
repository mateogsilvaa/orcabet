import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Download, Crown, User, Coins, Swords, Shield, Zap } from 'lucide-react';

const RARITY_COLORS = {
  common: '#9CA3AF', rare: '#3B82F6', epic: '#A855F7', legendary: '#EAB308',
};

export default function TeamGeneratorPage() {
  const { user } = useAuth();
  const [myCards, setMyCards] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [members, setMembers] = useState([null, null]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      const res = await api.get('/collection');
      setMyCards(res.data.cards);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const uniqueCards = myCards.reduce((acc, card) => {
    if (!acc.find(c => c.athlete_id === card.athlete_id)) acc.push(card);
    return acc;
  }, []);

  const availableForSlot = (excludeIds) => uniqueCards.filter(c => !excludeIds.includes(c.athlete_id));

  const selectedIds = [captain?.athlete_id, members[0]?.athlete_id, members[1]?.athlete_id].filter(Boolean);

  const teamValue = [captain, ...members].filter(Boolean).reduce((sum, c) => sum + (c.overall_rating || 0), 0);

  const selectForSlot = (card, slot) => {
    if (slot === 'captain') {
      setCaptain(card);
    } else {
      const newMembers = [...members];
      newMembers[slot] = card;
      setMembers(newMembers);
    }
  };

  const generateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 800, H = 500;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Cyber grid
    ctx.strokeStyle = 'rgba(255,107,0,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Title
    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 28px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MI EQUIPO ORCABET', W / 2, 50);

    // Neon line
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(100, 65); ctx.lineTo(W - 100, 65); ctx.stroke();
    ctx.shadowBlur = 0;

    const team = [captain, members[0], members[1]].filter(Boolean);
    const cardW = 180, cardH = 260;
    const totalWidth = team.length * cardW + (team.length - 1) * 30;
    let startX = (W - totalWidth) / 2;

    team.forEach((card, i) => {
      const x = startX + i * (cardW + 30);
      const y = 90;
      const isCaptain = i === 0 && captain;
      const rarityColor = RARITY_COLORS[card.rarity] || '#9CA3AF';

      // Card border glow
      ctx.shadowColor = rarityColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.shadowBlur = 0;

      // Card fill
      ctx.fillStyle = 'rgba(10,10,15,0.9)';
      ctx.fillRect(x + 1, y + 1, cardW - 2, cardH - 2);

      // Captain badge
      if (isCaptain) {
        ctx.fillStyle = '#FF6B00';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('CAPITAN', x + cardW / 2, y + 20);
      }

      // Rating circle
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x + cardW / 2, y + 70, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + cardW / 2, y + 70, 28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(String(card.overall_rating), x + cardW / 2, y + 78);

      // Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px Orbitron';
      ctx.fillText(card.athlete_name || '', x + cardW / 2, y + 120);

      // Position & Team
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '10px sans-serif';
      ctx.fillText(card.athlete_position || '', x + cardW / 2, y + 140);
      ctx.fillText(card.athlete_team || '', x + cardW / 2, y + 155);

      // Rarity badge
      ctx.fillStyle = rarityColor;
      ctx.font = 'bold 9px Orbitron';
      ctx.fillText((card.rarity || '').toUpperCase(), x + cardW / 2, y + 175);

      // Stats bars
      const stats = card.stats || {};
      const statsData = [
        { label: 'ATK', value: stats.attack || 0 },
        { label: 'DEF', value: stats.defense || 0 },
        { label: 'VEL', value: stats.speed || 0 },
      ];
      statsData.forEach((s, si) => {
        const sy = y + 195 + si * 20;
        ctx.fillStyle = '#6B7280';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(s.label, x + 15, sy);

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + 45, sy - 8, 100, 6);
        // Bar value
        ctx.fillStyle = '#FF6B00';
        ctx.fillRect(x + 45, sy - 8, s.value, 6);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(s.value), x + cardW - 15, sy);
      });
    });

    // Team value
    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(`VALOR TOTAL: ${teamValue}`, W / 2, H - 45);

    // Footer
    ctx.fillStyle = '#4B5563';
    ctx.font = '10px monospace';
    ctx.fillText(`${user?.username} | ORCABET FANTASY ORCASITAS`, W / 2, H - 20);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'mi-equipo-orcabet.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Imagen descargada!');
  };

  const isTeamComplete = captain && members[0] && members[1];

  useEffect(() => {
    if (isTeamComplete) generateCanvas();
  }, [captain, members]);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="team-generator-page">
      <div>
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Generador de equipo</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Mi Equipo</h1>
        <p className="text-sm text-gray-500 font-body mt-1">Selecciona 1 Capitan + 2 jugadores</p>
      </div>

      {/* Team Slots */}
      <div className="grid grid-cols-3 gap-4">
        {/* Captain Slot */}
        <div className="text-center">
          <p className="text-[10px] font-mono text-primary tracking-widest uppercase mb-2 flex items-center justify-center gap-1">
            <Crown size={12} /> Capitan
          </p>
          <SlotCard card={captain} onClear={() => setCaptain(null)} />
        </div>
        {/* Member Slots */}
        {[0, 1].map(i => (
          <div key={i} className="text-center">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-2">Jugador {i + 1}</p>
            <SlotCard card={members[i]} onClear={() => { const m = [...members]; m[i] = null; setMembers(m); }} />
          </div>
        ))}
      </div>

      {/* Card Selection */}
      <div>
        <p className="text-xs font-mono text-gray-500 mb-3">Selecciona tus cartas:</p>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : uniqueCards.length === 0 ? (
          <p className="text-gray-500 text-sm font-body text-center py-8">Necesitas cartas. Ve a la tienda!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableForSlot(selectedIds).map(card => (
              <button
                key={card.id}
                className="p-3 rounded-lg border border-white/5 hover:border-primary/20 bg-white/[0.02] flex items-center gap-2 transition-all text-left"
                onClick={() => {
                  if (!captain) selectForSlot(card, 'captain');
                  else if (!members[0]) selectForSlot(card, 0);
                  else if (!members[1]) selectForSlot(card, 1);
                }}
                data-testid={`team-select-${card.athlete_id}`}
              >
                <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center">
                  <span className="font-heading text-xs font-bold">{card.overall_rating}</span>
                </div>
                <div>
                  <p className="text-xs font-body text-gray-200">{card.athlete_name}</p>
                  <Badge className={`text-[7px] ${
                    card.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    card.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                    card.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}>{card.rarity}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Team Value */}
      {isTeamComplete && (
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <span className="font-heading text-sm font-bold text-white">Valor Total del Equipo</span>
          </div>
          <span className="font-heading text-xl font-black text-primary neon-text" data-testid="team-value">{teamValue}</span>
        </div>
      )}

      {/* Canvas Preview */}
      {isTeamComplete && (
        <div className="space-y-4">
          <div className="team-canvas-container rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full" data-testid="team-canvas" />
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={downloadImage} className="bg-primary text-black font-bold" data-testid="download-team-btn">
              <Download size={16} className="mr-2" /> Descargar Imagen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCard({ card, onClear }) {
  if (!card) {
    return (
      <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/[0.02]">
        <User size={24} className="text-gray-700" />
      </div>
    );
  }
  const rarityColor = card.rarity === 'legendary' ? 'border-yellow-500/50' : card.rarity === 'epic' ? 'border-purple-500/50' : card.rarity === 'rare' ? 'border-blue-500/50' : 'border-gray-500/40';
  return (
    <div className={`w-full aspect-[3/4] rounded-xl border-2 ${rarityColor} bg-[#0A0A0F] p-3 flex flex-col items-center justify-center text-center relative group`}>
      <button onClick={onClear} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">x</button>
      <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center mb-2">
        <span className="font-heading text-sm font-black text-white">{card.overall_rating}</span>
      </div>
      <p className="font-heading text-[10px] font-bold text-white truncate w-full">{card.athlete_name}</p>
      <p className="text-[8px] text-gray-500 font-body">{card.athlete_position}</p>
    </div>
  );
}
