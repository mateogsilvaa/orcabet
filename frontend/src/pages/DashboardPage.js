import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import { listMyBets, getMyCollection } from '@/services/firebaseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Target, ShoppingBag, RotateCw, Layers, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [recentBets, setRecentBets] = useState([]);
  const [stats, setStats] = useState({ total_cards: 0, unique_cards: 0, total_athletes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshBalance();
    loadData();
  }, [refreshBalance]);

  const loadData = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const [betsData, collectionData] = await Promise.all([
        listMyBets(firebaseUser.uid),
        getMyCollection(firebaseUser.uid),
      ]);
      setRecentBets(betsData.slice(0, 5));
      setStats({
        total_cards: collectionData.total_cards,
        unique_cards: collectionData.total_unique,
        total_athletes: collectionData.total_athletes,
      });
    } catch { /* ignore errors on dashboard */ }
    setLoading(false);
  };

  const quickActions = [
    { icon: Target, label: 'Apostar', to: '/apuestas', color: 'text-[#ff5e00]' },
    { icon: ShoppingBag, label: 'Tienda', to: '/tienda', color: 'text-[#00F3FF]' },
    { icon: RotateCw, label: 'Ruleta', to: '/ruleta', color: 'text-[#A855F7]' },
    { icon: Layers, label: 'Coleccion', to: '/coleccion', color: 'text-[#22C55E]' },
  ];

  const betStatusConfig = {
    pending: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    won: { label: 'Ganada', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: TrendingUp },
    lost: { label: 'Perdida', class: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#ff5e00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Greeting + Balance */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-600 tracking-[0.2em] uppercase">Panel de control</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-1">
            Hola, <span className="text-[#ff5e00]">{user?.username}</span>
          </h1>
        </div>
        <div className="glass-card rounded-xl px-6 py-4 inline-flex items-center gap-4">
          <Coins size={28} className="text-[#ff5e00]" />
          <div>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Tu saldo</p>
            <p className="text-2xl font-black text-[#ff5e00]" data-testid="dashboard-balance">
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
            className="glass-card rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[#ff5e00]/20 transition-all duration-300 hover:-translate-y-1 group"
          >
            <action.icon size={28} className={`${action.color} transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.5} />
            <span className="text-sm font-medium text-gray-300">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#141414] border-[#333]">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Cartas</p>
            <p className="text-xl font-bold text-white mt-1">{stats.total_cards}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#141414] border-[#333]">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Progreso</p>
            <p className="text-xl font-bold text-[#00F3FF] mt-1">
              {stats.unique_cards}/{stats.total_athletes}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#141414] border-[#333]">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Apuestas</p>
            <p className="text-xl font-bold text-[#A855F7] mt-1">{recentBets.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Apuestas Recientes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/apuestas')} className="text-[#ff5e00] text-xs">
            Ver todas
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#ff5e00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentBets.length === 0 ? (
          <Card className="bg-[#141414] border-[#333]">
            <CardContent className="p-8 text-center">
              <Target size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aun no has realizado apuestas</p>
              <Button onClick={() => navigate('/apuestas')} className="mt-4 bg-[#ff5e00] text-black font-bold" size="sm">
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
                <Card key={bet.id} className="bg-[#141414] border-[#333]" data-testid={`recent-bet-${bet.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon size={16} className={status.class.includes('green') ? 'text-green-400' : status.class.includes('red') ? 'text-red-400' : 'text-yellow-400'} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{bet.event_title}</p>
                        <p className="text-xs text-gray-500">{bet.option_name} &middot; x{bet.odds}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-white">{bet.amount}</p>
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
