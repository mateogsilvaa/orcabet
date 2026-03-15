import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCw, Coins, Zap } from 'lucide-react';

const SEGMENTS = [
  { label: '50', value: 50, color: '#FF6B00' },
  { label: '10', value: 10, color: '#3B82F6' },
  { label: '100', value: 100, color: '#A855F7' },
  { label: '25', value: 25, color: '#22C55E' },
  { label: '5', value: 5, color: '#6B7280' },
  { label: '200', value: 200, color: '#EAB308' },
  { label: '15', value: 15, color: '#00F3FF' },
  { label: '75', value: 75, color: '#EF4444' },
];

export default function RoulettePage() {
  const { refreshBalance } = useAuth();
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const res = await api.get('/roulette/status');
      setSpinsRemaining(res.data.spins_remaining);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const spin = async () => {
    if (spinning || spinsRemaining <= 0) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await api.post('/roulette/spin');
      const prize = res.data.prize;
      const prizeIdx = SEGMENTS.findIndex(s => s.value === prize.value);
      const segAngle = 360 / SEGMENTS.length;
      const targetAngle = 360 - (prizeIdx * segAngle + segAngle / 2);
      const totalRotation = rotation + 1800 + targetAngle;
      setRotation(totalRotation);
      setTimeout(() => {
        setResult(prize);
        setSpinsRemaining(res.data.spins_remaining);
        refreshBalance();
        toast.success(`Ganaste ${prize.value} monedas!`);
        setSpinning(false);
      }, 4200);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al girar');
      setSpinning(false);
    }
  };

  const segAngle = 360 / SEGMENTS.length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="roulette-page">
      <div className="text-center">
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Minijuego diario</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Ruleta Diaria</h1>
        <p className="text-sm text-gray-500 font-body mt-2">3 tiradas gratuitas cada 24 horas</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Spins remaining */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                i < spinsRemaining ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/5'
              }`}
            >
              <Zap size={16} className={i < spinsRemaining ? 'text-primary' : 'text-gray-700'} />
            </div>
          ))}
          <span className="text-sm font-mono text-gray-400 ml-2" data-testid="spins-remaining">
            {spinsRemaining}/3
          </span>
        </div>

        {/* Wheel */}
        <div className="relative">
          {/* Pointer */}
          <div className="roulette-pointer" />

          {/* Wheel */}
          <div
            className="roulette-wheel"
            style={{ transform: `rotate(${rotation}deg)` }}
            data-testid="roulette-wheel"
          >
            <svg viewBox="0 0 320 320" className="w-full h-full">
              {SEGMENTS.map((seg, i) => {
                const startAngle = i * segAngle - 90;
                const endAngle = startAngle + segAngle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 160 + 160 * Math.cos(startRad);
                const y1 = 160 + 160 * Math.sin(startRad);
                const x2 = 160 + 160 * Math.cos(endRad);
                const y2 = 160 + 160 * Math.sin(endRad);
                const largeArc = segAngle > 180 ? 1 : 0;
                const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
                const labelX = 160 + 100 * Math.cos(midAngle);
                const labelY = 160 + 100 * Math.sin(midAngle);
                const labelRot = (startAngle + endAngle) / 2 + 90;

                return (
                  <g key={i}>
                    <path
                      d={`M 160 160 L ${x1} ${y1} A 160 160 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="#050505"
                      strokeWidth="2"
                      opacity={0.85}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      fill="white"
                      fontSize="18"
                      fontFamily="Orbitron"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${labelRot}, ${labelX}, ${labelY})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="24" fill="#050505" stroke="#FF6B00" strokeWidth="3" />
              <text x="160" y="160" fill="#FF6B00" fontSize="8" fontFamily="Orbitron" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                OB
              </text>
            </svg>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="glass-card rounded-xl px-8 py-4 text-center animate-slide-up" data-testid="roulette-result">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Has ganado</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Coins size={24} className="text-primary" />
              <span className="font-heading text-3xl font-black text-primary neon-text">{result.value}</span>
            </div>
            <p className="text-xs text-gray-500 font-body mt-1">monedas</p>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={spin}
          disabled={spinning || spinsRemaining <= 0 || loading}
          data-testid="spin-btn"
          className="bg-primary text-black font-heading font-bold text-base uppercase tracking-widest px-12 py-6 rounded-xl hover:bg-primary/90 shadow-[0_0_30px_rgba(255,107,0,0.3)] disabled:opacity-30 transition-all"
        >
          {spinning ? (
            <RotateCw size={20} className="animate-spin" />
          ) : spinsRemaining <= 0 ? (
            'Sin Tiradas'
          ) : (
            <>
              <RotateCw size={20} className="mr-2" />
              Girar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
