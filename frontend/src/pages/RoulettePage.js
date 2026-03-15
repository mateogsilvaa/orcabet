import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RotateCw, Coins, Zap } from 'lucide-react';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

const getNumColor = (n) => n === 0 ? 'verde' : RED_NUMBERS.includes(n) ? 'rojo' : 'negro';
const getNumBg = (n) => n === 0 ? 'bg-green-600' : RED_NUMBERS.includes(n) ? 'bg-red-600' : 'bg-[#1a1a2e]';

export default function RoulettePage() {
  const { refreshBalance } = useAuth();
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [betType, setBetType] = useState(null);
  const [betValue, setBetValue] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try { const res = await api.get('/roulette/status'); setSpinsRemaining(res.data.spins_remaining); } catch {}
    setLoading(false);
  };

  const selectBet = (type, value) => {
    setBetType(type);
    setBetValue(value);
  };

  const getBetLabel = () => {
    if (!betType) return 'Selecciona una apuesta';
    if (betType === 'number') return `Numero ${betValue}`;
    if (betType === 'color') return betValue === 'rojo' ? 'Rojo' : 'Negro';
    if (betType === 'parity') return betValue === 'par' ? 'Par' : 'Impar';
    if (betType === 'half') return betValue;
    if (betType === 'dozen') return `Docena ${betValue}`;
    return betValue;
  };

  const getMultiplierLabel = () => {
    if (betType === 'number') return 'x35';
    if (betType === 'dozen') return 'x2';
    return 'x1';
  };

  const play = async () => {
    if (!betType || !betValue || !betAmount || Number(betAmount) <= 0) {
      toast.error('Selecciona apuesta y cantidad');
      return;
    }
    setSpinning(true);
    setResult(null);
    try {
      const res = await api.post('/roulette/play', { bet_type: betType, bet_value: String(betValue), amount: Number(betAmount) });
      const winNum = res.data.result_number;
      const idx = WHEEL_ORDER.indexOf(winNum);
      const segAngle = 360 / 37;
      const targetAngle = idx * segAngle + segAngle / 2;
      const newRot = wheelRotation + 1800 + (360 - targetAngle);
      setWheelRotation(newRot);
      setTimeout(() => {
        setResult(res.data);
        setSpinsRemaining(res.data.spins_remaining);
        setHistory(prev => [winNum, ...prev].slice(0, 10));
        refreshBalance();
        if (res.data.won) toast.success(`Ganaste ${res.data.winnings} monedas!`);
        else toast.error(`Perdiste ${res.data.bet_amount} monedas`);
        setSpinning(false);
      }, 4000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al jugar');
      setSpinning(false);
    }
  };

  const segAngle = 360 / 37;
  const numbers1to36 = Array.from({ length: 36 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="roulette-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Casino</p>
          <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Ruleta</h1>
          <p className="text-sm text-gray-500 font-body mt-1">3 jugadas diarias - Apuesta y gana</p>
        </div>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i < spinsRemaining ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/5'}`}>
              <Zap size={14} className={i < spinsRemaining ? 'text-primary' : 'text-gray-700'} />
            </div>
          ))}
          <span className="text-sm font-mono text-gray-400 ml-1" data-testid="spins-remaining">{spinsRemaining}/3</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="roulette-pointer" />
            <div className="roulette-wheel" style={{ transform: `rotate(${wheelRotation}deg)` }} data-testid="roulette-wheel">
              <svg viewBox="0 0 320 320" className="w-full h-full">
                {WHEEL_ORDER.map((num, i) => {
                  const startA = i * segAngle - 90;
                  const endA = startA + segAngle;
                  const sR = (startA * Math.PI) / 180;
                  const eR = (endA * Math.PI) / 180;
                  const x1 = 160 + 155 * Math.cos(sR);
                  const y1 = 160 + 155 * Math.sin(sR);
                  const x2 = 160 + 155 * Math.cos(eR);
                  const y2 = 160 + 155 * Math.sin(eR);
                  const mA = ((startA + endA) / 2) * Math.PI / 180;
                  const lx = 160 + 115 * Math.cos(mA);
                  const ly = 160 + 115 * Math.sin(mA);
                  const color = num === 0 ? '#22C55E' : RED_NUMBERS.includes(num) ? '#DC2626' : '#1a1a2e';
                  return (
                    <g key={num}>
                      <path d={`M 160 160 L ${x1} ${y1} A 155 155 0 0 1 ${x2} ${y2} Z`} fill={color} stroke="#050505" strokeWidth="1" />
                      <text x={lx} y={ly} fill="white" fontSize="9" fontWeight="bold" fontFamily="Orbitron" textAnchor="middle" dominantBaseline="central" transform={`rotate(${(startA + endA) / 2 + 90}, ${lx}, ${ly})`}>
                        {num}
                      </text>
                    </g>
                  );
                })}
                <circle cx="160" cy="160" r="28" fill="#050505" stroke="#FF6B00" strokeWidth="2" />
                <text x="160" y="160" fill="#FF6B00" fontSize="8" fontFamily="Orbitron" fontWeight="bold" textAnchor="middle" dominantBaseline="central">OB</text>
              </svg>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {history.map((n, i) => (
                <span key={i} className={`w-7 h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center ${getNumBg(n)} text-white ${i === 0 ? 'ring-1 ring-primary' : 'opacity-60'}`}>
                  {n}
                </span>
              ))}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`glass-card rounded-xl px-6 py-3 text-center animate-slide-up ${result.won ? 'border-green-500/30' : 'border-red-500/30'} border`} data-testid="roulette-result">
              <div className="flex items-center justify-center gap-3">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-white ${getNumBg(result.result_number)}`}>
                  {result.result_number}
                </span>
                <div className="text-left">
                  {result.won ? (
                    <p className="text-green-400 font-heading font-bold text-sm">+{result.winnings} monedas</p>
                  ) : (
                    <p className="text-red-400 font-heading font-bold text-sm">-{result.bet_amount} monedas</p>
                  )}
                  <p className="text-[10px] text-gray-500 capitalize font-body">{result.result_color}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Betting Table */}
        <div className="space-y-3">
          {/* Number Grid */}
          <div className="glass-card rounded-xl p-3">
            {/* Zero */}
            <button
              onClick={() => selectBet('number', 0)}
              data-testid="bet-number-0"
              className={`w-full h-10 rounded-lg bg-green-600 text-white font-heading font-bold text-sm mb-2 transition-all hover:brightness-125 ${betType === 'number' && betValue === 0 ? 'ring-2 ring-primary ring-offset-1 ring-offset-[#0A0A0F]' : ''}`}
            >
              0
            </button>
            {/* 1-36 grid: 12 rows x 3 columns */}
            <div className="grid grid-cols-3 gap-1">
              {numbers1to36.map(n => (
                <button
                  key={n}
                  onClick={() => selectBet('number', n)}
                  data-testid={`bet-number-${n}`}
                  className={`h-9 rounded text-xs font-heading font-bold text-white transition-all hover:brightness-125 ${getNumBg(n)} ${betType === 'number' && betValue === n ? 'ring-2 ring-primary ring-offset-1 ring-offset-[#0A0A0F]' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Outside Bets */}
          <div className="glass-card rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">Apuestas externas</p>
            {/* Dozens */}
            <div className="grid grid-cols-3 gap-2">
              {[{ v: '1-12', l: '1a Docena' }, { v: '13-24', l: '2a Docena' }, { v: '25-36', l: '3a Docena' }].map(d => (
                <button
                  key={d.v}
                  onClick={() => selectBet('dozen', d.v)}
                  data-testid={`bet-dozen-${d.v}`}
                  className={`py-2 rounded-lg text-xs font-body font-medium transition-all border ${betType === 'dozen' && betValue === d.v ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  {d.l} <span className="text-[9px] text-gray-600">(x2)</span>
                </button>
              ))}
            </div>
            {/* Color, Parity, Half */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onClick={() => selectBet('color', 'rojo')} data-testid="bet-color-rojo" className={`py-2.5 rounded-lg text-xs font-body font-bold transition-all ${betType === 'color' && betValue === 'rojo' ? 'bg-red-600 text-white ring-2 ring-primary' : 'bg-red-600/30 text-red-400 hover:bg-red-600/50'}`}>
                Rojo <span className="text-[9px] opacity-60">(x1)</span>
              </button>
              <button onClick={() => selectBet('color', 'negro')} data-testid="bet-color-negro" className={`py-2.5 rounded-lg text-xs font-body font-bold transition-all ${betType === 'color' && betValue === 'negro' ? 'bg-[#1a1a2e] text-white ring-2 ring-primary' : 'bg-[#1a1a2e]/60 text-gray-300 hover:bg-[#1a1a2e]'}`}>
                Negro <span className="text-[9px] opacity-60">(x1)</span>
              </button>
              <button onClick={() => selectBet('parity', 'par')} data-testid="bet-parity-par" className={`py-2.5 rounded-lg text-xs font-body font-medium transition-all border ${betType === 'parity' && betValue === 'par' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                Par <span className="text-[9px] text-gray-600">(x1)</span>
              </button>
              <button onClick={() => selectBet('parity', 'impar')} data-testid="bet-parity-impar" className={`py-2.5 rounded-lg text-xs font-body font-medium transition-all border ${betType === 'parity' && betValue === 'impar' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                Impar <span className="text-[9px] text-gray-600">(x1)</span>
              </button>
              <button onClick={() => selectBet('half', '1-18')} data-testid="bet-half-1-18" className={`py-2.5 rounded-lg text-xs font-body font-medium transition-all border ${betType === 'half' && betValue === '1-18' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                1-18 <span className="text-[9px] text-gray-600">(x1)</span>
              </button>
              <button onClick={() => selectBet('half', '19-36')} data-testid="bet-half-19-36" className={`py-2.5 rounded-lg text-xs font-body font-medium transition-all border ${betType === 'half' && betValue === '19-36' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                19-36 <span className="text-[9px] text-gray-600">(x1)</span>
              </button>
            </div>
          </div>

          {/* Bet Controls */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            {betType && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm font-body text-gray-300">{getBetLabel()}</span>
                <Badge className="bg-primary/20 text-primary border-primary/30">{getMultiplierLabel()}</Badge>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                placeholder="Cantidad a apostar"
                data-testid="roulette-bet-amount"
                className="bg-black/50 border-white/10 text-white flex-1"
              />
              <Button
                onClick={play}
                disabled={spinning || spinsRemaining <= 0 || !betType || !betAmount || loading}
                data-testid="roulette-play-btn"
                className="bg-primary text-black font-heading font-bold uppercase tracking-wider px-6 hover:bg-primary/90 shadow-[0_0_20px_rgba(255,107,0,0.3)] disabled:opacity-30"
              >
                {spinning ? <RotateCw size={18} className="animate-spin" /> : 'Girar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
