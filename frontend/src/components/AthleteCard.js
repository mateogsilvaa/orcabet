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

  // Extraer datos de forma segura
  const name = card.athlete_name || card.name || 'Sin Nombre';
  const position = card.position || card.athlete_position || 'POS';
  const team = card.team || card.athlete_team || 'Sin Equipo';
  const image = card.athlete_image || card.image_url;
  const rating = card.overall_rating || 0;
  const stats = card.stats || { vel: 0, pot: 0, tec: 0 };

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
        {image ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <User size={isSmall ? 32 : 44} className="text-gray-600" strokeWidth={1} />
          </div>
        )}
        {/* Rating badge */}
        <div className={`absolute top-2 right-2 ${isSmall ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} rounded-lg bg-black/70 backdrop-blur border ${rarity.border} flex items-center justify-center font-heading font-black`}>
          {rating}
        </div>
        {/* Position */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-mono font-bold tracking-wider bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-gray-300">
            {position}
          </span>
        </div>
      </div>
      
      {/* Card Content */}
      <div className={`p-3 ${isSmall ? 'space-y-2' : 'space-y-3'}`}>
        <div>
          <h3 className={`font-heading font-bold text-white truncate ${isSmall ? 'text-sm' : 'text-base'}`}>
            {name}
          </h3>
          <p className={`text-gray-400 truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>
            {team}
          </p>
        </div>
        
        {showStats && (
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <span className="font-mono font-bold text-xs">
                <span className="text-gray-500">V</span>
                <span className="text-gray-300 ml-0.5">{stats.vel}</span>
              </span>
              <span className="font-mono font-bold text-xs">
                <span className="text-gray-500">P</span>
                <span className="text-gray-300 ml-0.5">{stats.pot}</span>
              </span>
              <span className="font-mono font-bold text-xs">
                <span className="text-gray-500">T</span>
                <span className="text-gray-300 ml-0.5">{stats.tec}</span>
              </span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <Badge className={`text-[10px] ${rarity.color} border border-current/20`}>
            {rarity.label}
          </Badge>
        </div>
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
        <p className="font-heading font-black text-primary text-lg">?</p>
        <p className="font-heading text-[8px] text-primary/50 tracking-widest mt-1">ORCABET</p>
      </div>
    </div>
  );
}
