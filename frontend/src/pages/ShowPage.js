import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AthleteCard } from '@/components/AthleteCard';
import { Users, Trophy, Coins, Layers, Search, Eye } from 'lucide-react';

export default function ShowPage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    } else {
      loadLeaderboard();
    }
  }, [userId]);

  const loadLeaderboard = async () => {
    try {
      const res = await api.get('/users/leaderboard');
      setLeaderboard(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadProfile = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}/profile`);
      setProfile(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/users/search?q=${searchQuery}`);
      setSearchResults(res.data);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
    );
  }

  // User profile view
  if (userId && profile) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="show-profile-page">
        <Button onClick={() => navigate('/show')} variant="ghost" className="text-gray-400 text-sm">
          &larr; Volver al ranking
        </Button>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-heading font-black text-xl">{profile.user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white">{profile.user?.username}</h2>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <Coins size={14} className="text-primary" />
                  <span className="text-sm font-mono text-primary">{profile.user?.balance?.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Layers size={14} className="text-[#00F3FF]" />
                  <span className="text-sm font-mono text-[#00F3FF]">{profile.total_unique}/{profile.total_athletes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-white mb-4">Cartas ({profile.total_cards})</h3>
          {profile.cards.length === 0 ? (
            <p className="text-gray-500 font-body text-sm text-center py-8">Este jugador no tiene cartas</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {profile.cards.map(card => (
                <AthleteCard key={card.id} card={card} size="small" showStats={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Leaderboard / search view
  return (
    <div className="space-y-6 animate-fade-in" data-testid="show-page">
      <div>
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Comunidad</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Show de Cartas</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
            placeholder="Buscar jugador..."
            data-testid="search-users-input"
            className="pl-9 bg-black/50 border-white/10 text-white text-sm"
          />
        </div>
        <Button onClick={searchUsers} className="bg-primary text-black font-bold" size="sm" data-testid="search-users-btn">
          Buscar
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-gray-500">Resultados</p>
          {searchResults.map(u => (
            <Card key={u.id} className="bg-[#0A0A0F] border-white/5 hover:border-primary/20 transition-all cursor-pointer" onClick={() => navigate(`/show/${u.id}`)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">{u.username?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-body text-gray-200">{u.username}</span>
                </div>
                <Eye size={16} className="text-gray-500" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="font-heading text-base font-bold text-white mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" /> Ranking
        </h2>
        <div className="space-y-2">
          {leaderboard.map((u, idx) => (
            <Card
              key={u.id}
              className={`bg-[#0A0A0F] border-white/5 hover:border-primary/20 transition-all cursor-pointer ${
                idx === 0 ? 'border-yellow-500/20' : idx === 1 ? 'border-gray-400/20' : idx === 2 ? 'border-orange-700/20' : ''
              }`}
              onClick={() => navigate(`/show/${u.id}`)}
              data-testid={`leaderboard-user-${u.id}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                  idx === 2 ? 'bg-orange-700/20 text-orange-400' :
                  'bg-white/5 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{u.username?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-gray-200 truncate">
                    {u.username}
                    {u.id === currentUser?.id && <Badge className="ml-2 text-[8px] bg-primary/20 text-primary border-primary/30">Tu</Badge>}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono text-[#00F3FF]"><Layers size={10} className="inline mr-1" />{u.total_cards || 0} cartas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
