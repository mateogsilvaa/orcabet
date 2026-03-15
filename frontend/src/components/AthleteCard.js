import { Swords, Shield, Zap, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const RARITY_CONFIG = {
  common: { label: 'Comun', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', border: 'border-gray-500/40', glow: '' },
  rare: { label: 'Rara', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', border: 'border-blue-500/50', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  epic: { label: 'Epica', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', border: 'border-purple-500/50', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
  legendary: { label: 'Legendaria', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', border: 'border-yellow-500/50', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-glow-pulse' },
};

const RARITY_BG = {
  common: 'from-gray-800/50 to-gray-900/80',
  rare: 'from-blue-900/40 to-blue-950/80',
  epic: 'from-purple-900/40 to-purple-950/80',
  legendary: 'from-yellow-900/30 to-amber-950/70',
};

export function AthleteCard({ card, size = 'default', onClick, showStats = true }) {
  const rarity = RARITY_CONFIG[card.rarity] || RARITY_CONFIG.common;
  const bg = RARITY_BG[card.rarity] || RARITY_BG.common;
  const isSmall = size === 'small';

  return (
    <div
      onClick={onClick}
      data-testid={`athlete-card-${card.athlete_id || card.id}`}
      className={`
        relative rounded-xl border-2 ${rarity.border} ${rarity.glow}
        bg-gradient-to-b ${bg} overflow-hidden
        transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''}
        ${isSmall ? 'w-36' : 'w-48'}
      `}
    >
      {/* Card Image / Avatar Area */}
      <div className={`relative flex items-center justify-center bg-black/30 ${isSmall ? 'h-28' : 'h-36'}`}>
        {card.athlete_image ? (
          <img src={card.athlete_image} alt={card.athlete_name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <User size={isSmall ? 32 : 44} className="text-gray-600" strokeWidth={1} />
          </div>
        )}
        {/* Rating badge */}
        <div className={`absolute top-2 right-2 ${isSmall ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} rounded-lg bg-black/70 backdrop-blur border ${rarity.border} flex items-center justify-center font-heading font-black`}>
          {card.overall_rating}
        </div>
        {/* Position */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-mono font-bold tracking-wider bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-gray-300">
            {card.athlete_position || card.position}
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className={`${isSmall ? 'p-2' : 'p-3'}`}>
        <p className={`font-heading font-bold text-white truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>
          {card.athlete_name || card.name}
        </p>
        <p className="text-[10px] text-gray-500 font-body truncate mt-0.5">
          {card.athlete_team || card.team}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Badge className={`text-[9px] px-1.5 py-0 h-4 ${rarity.color}`}>
            {rarity.label}
          </Badge>
        </div>

        {/* Stats */}
        {showStats && card.stats && !isSmall && (
          <div className="mt-3 space-y-1.5">
            <StatRow icon={Swords} label="ATK" value={card.stats.attack} />
            <StatRow icon={Shield} label="DEF" value={card.stats.defense} />
            <StatRow icon={Zap} label="VEL" value={card.stats.speed} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={10} className="text-gray-500" />
      <span className="text-[9px] font-mono text-gray-500 w-6">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="stat-bar" style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-5 text-right">{value}</span>
    </div>
  );
}

export function CardBack({ size = 'default' }) {
  const isSmall = size === 'small';
  return (
    <div className={`rounded-xl border-2 border-primary/30 bg-[#0A0A0F] flex items-center justify-center ${isSmall ? 'w-36 h-48' : 'w-48 h-64'}`}>
      <div className="text-center">
        <p className="font-heading font-black text-primary text-lg neon-text">?</p>
        <p className="font-heading text-[8px] text-primary/50 tracking-widest mt-1">ORCABET</p>
      </div>
    </div>
  );
}
