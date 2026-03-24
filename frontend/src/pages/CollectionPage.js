import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import { getMyCollection, subscribeToMyCollection } from '@/services/firebaseService';
import { AthleteCard } from '@/components/AthleteCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Layers, Copy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CollectionPage() {
  const { user } = useAuth();
  const [collection, setCollection] = useState({ cards: [], total_unique: 0, total_athletes: 0, total_cards: 0, duplicates: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    
    // Suscribirse a la colección en tiempo real
    const unsubscribe = subscribeToMyCollection(firebaseUser.uid, (collectionData) => {
      setCollection(collectionData);
      setLoading(false);
    });
    
    return () => {
      unsubscribe(); // Cleanup al desmontar
    };
  }, []);

  const loadCollection = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const data = await getMyCollection(firebaseUser.uid);
      setCollection(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const filteredCards = collection.cards.filter(c => {
    if (filter !== 'all' && c.rarity !== filter) return false;
    if (search && !c.athlete_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const progressPct = collection.total_athletes > 0 ? (collection.total_unique / collection.total_athletes) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="collection-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Tu coleccion</p>
          <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Coleccion</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2">
            <Layers size={16} className="text-primary" />
            <span className="text-sm font-heading font-bold text-primary" data-testid="collection-progress">
              {collection.total_unique}/{collection.total_athletes}
            </span>
          </div>
          <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-2">
            <Copy size={16} className="text-[#00F3FF]" />
            <span className="text-sm font-body text-gray-400">
              {collection.duplicates} repetidas
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-mono text-gray-500">Progreso de coleccion</span>
          <span className="text-xs font-mono text-primary">{progressPct.toFixed(0)}%</span>
        </div>
        <Progress value={progressPct} className="h-2" data-testid="collection-progress-bar" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar atleta..."
            data-testid="collection-search"
            className="pl-9 bg-black/50 border-white/10 text-white text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'common', 'rare', 'epic', 'legendary'].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              data-testid={`filter-${r}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                filter === r ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-gray-300 border border-white/5'
              }`}
            >
              {r === 'all' ? 'Todas' : r === 'common' ? 'Comun' : r === 'rare' ? 'Rara' : r === 'epic' ? 'Epica' : 'Legendaria'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid - Mobile Optimized */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16">
          <Layers size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-body">
            {collection.cards.length === 0 ? 'Tu coleccion esta vacia. Compra sobres en la tienda!' : 'No se encontraron cartas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4" data-testid="cards-grid">
          {filteredCards.map(card => (
            <AthleteCard key={card.id} card={card} size="small" />
          ))}
        </div>
      )}
    </div>
  );
}
