import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Target, ShoppingBag, RotateCw, Layers, Trophy, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [recentBets, setRecentBets] = useState([]);
  const [stats, setStats] = useState({ total_cards: 0, unique_cards: 0, total_athletes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshBalance();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [betsRes, collectionRes] = await Promise.all([
        api.get('/bets/mine'),
        api.get('/collection'),
      ]);
      setRecentBets(betsRes.data.slice(0, 5));
      setStats({
        total_cards: collectionRes.data.total_cards,
        unique_cards: collectionRes.data.total_unique,
        total_athletes: collectionRes.data.total_athletes,
      });
    } catch { /* ignore errors on dashboard */ }
    setLoading(false);
  };

  const quickActions = [
    { icon: Target, label: 'Apostar', to: '/apuestas', color: 'text-primary' },
    { icon: ShoppingBag, label: 'Tienda', to: '/tienda', color: 'text-[#00F3FF]' },
    { icon: RotateCw, label: 'Ruleta', to: '/ruleta', color: 'text-[#A855F7]' },
    { icon: Layers, label: 'Coleccion', to: '/coleccion', color: 'text-[#22C55E]' },
  ];

  const betStatusConfig = {
    pending: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    won: { label: 'Ganada', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: TrendingUp },
    lost: { label: 'Perdida', class: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown },
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Greeting + Balance */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Panel de control</p>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-white mt-1">
            Hola, <span className="text-primary neon-text">{user?.username}</span>
          </h1>
        </div>
        <div className="glass-card rounded-xl px-6 py-4 inline-flex items-center gap-4">
          <Coins size={28} className="text-primary" />
          <div>
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Tu saldo</p>
            <p className="font-heading text-2xl font-black text-primary neon-text" data-testid="dashboard-balance">
              {user?.balance?.toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="quick-actions">
        {quickActions.map(action => (
          <button
            key={action.to}
            onClick={() => navigate(action.to)}
            data-testid={`quick-action-${action.label.toLowerCase()}`}
            className="glass-card rounded-xl p-5 flex flex-col items-center gap-3 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group"
          >
            <action.icon size={28} className={`${action.color} transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.5} />
            <span className="text-sm font-body font-medium text-gray-300">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#0A0A0F] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Cartas</p>
            <p className="font-heading text-xl font-bold text-white mt-1">{stats.total_cards}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0A0F] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Progreso</p>
            <p className="font-heading text-xl font-bold text-[#00F3FF] mt-1">
              {stats.unique_cards}/{stats.total_athletes}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0A0F] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Apuestas</p>
            <p className="font-heading text-xl font-bold text-[#A855F7] mt-1">{recentBets.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-bold text-white">Apuestas Recientes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/apuestas')} className="text-primary text-xs">
            Ver todas
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentBets.length === 0 ? (
          <Card className="bg-[#0A0A0F] border-white/5">
            <CardContent className="p-8 text-center">
              <Target size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-body text-sm">Aun no has realizado apuestas</p>
              <Button onClick={() => navigate('/apuestas')} className="mt-4 bg-primary text-black font-bold" size="sm">
                Ir a apostar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentBets.map(bet => {
              const status = betStatusConfig[bet.status];
              const StatusIcon = status.icon;
              return (
                <Card key={bet.id} className="bg-[#0A0A0F] border-white/5" data-testid={`recent-bet-${bet.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon size={16} className={status.class.includes('green') ? 'text-green-400' : status.class.includes('red') ? 'text-red-400' : 'text-yellow-400'} />
                      <div className="min-w-0">
                        <p className="text-sm font-body font-medium text-gray-200 truncate">{bet.event_title}</p>
                        <p className="text-xs text-gray-500 font-body">{bet.option_name} &middot; x{bet.odds}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-mono font-bold text-white">{bet.amount}</p>
                      <Badge className={`text-[9px] ${status.class}`}>{status.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
