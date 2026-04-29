import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import { checkFreePackAvailable, buyPack as buyPackService, pickCard as pickCardService } from '@/services/firebaseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AthleteCard } from '@/components/AthleteCard';
import { toast } from 'sonner';
import { ShoppingBag, Gift, Coins, Sparkles, Crown, Star } from 'lucide-react';

const PACKS = [
  { id: 'free', name: 'Sobre Gratis', desc: 'Disponible cuando el admin lo regale', price: 0, cards: 1, icon: Gift, color: 'text-green-400', border: 'border-green-500/30 hover:border-green-500/50', bg: 'from-green-900/20 to-green-950/40' },
  { id: 'basic', name: 'Sobre Basico', desc: '3 cartas con probabilidad estandar', price: 100, cards: 3, icon: ShoppingBag, color: 'text-gray-400', border: 'border-gray-500/30 hover:border-gray-500/50', bg: 'from-gray-800/20 to-gray-900/40' },
  { id: 'gold', name: 'Sobre Oro', desc: '5 cartas con mejor probabilidad', price: 250, cards: 5, icon: Star, color: 'text-yellow-400', border: 'border-yellow-500/30 hover:border-yellow-500/50', bg: 'from-yellow-900/20 to-yellow-950/40' },
  { id: 'premium', name: 'Sobre Premium', desc: '5 cartas con maxima probabilidad', price: 500, cards: 5, icon: Crown, color: 'text-purple-400', border: 'border-purple-500/30 hover:border-purple-500/50', bg: 'from-purple-900/20 to-purple-950/40' },
];

export default function ShopPage() {
  const { user, refreshBalance } = useAuth();
  const [freeAvailable, setFreeAvailable] = useState(false);
  const [buying, setBuying] = useState(null);
  const [openedCards, setOpenedCards] = useState([]);
  const [showOpening, setShowOpening] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [packId, setPackId] = useState(null);
  const [pickingCard, setPickingCard] = useState(false);
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => { checkFree(); }, []);

  const checkFree = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const available = await checkFreePackAvailable(firebaseUser.uid);
      setFreeAvailable(available);
    } catch { /* ignore */ }
  };

  const buyPack = async (packType) => {
    setBuying(packType);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuario no autenticado');
      const res = await buyPackService({ uid: firebaseUser.uid, pack_type: packType });
      setOpenedCards(res.cards);
      setPackId(res.pack_id);
      setRevealedIdx(-1);
      setAllRevealed(false);
      setPickingCard(false);
      setShowOpening(true);
      await refreshBalance();
      if (packType === 'free') setFreeAvailable(false);
    } catch (err) {
      toast.error(err?.message || 'Error comprando sobre');
    }
    setBuying(null);
  };

  const revealNext = () => {
    const next = revealedIdx + 1;
    setRevealedIdx(next);
    if (next >= openedCards.length - 1) setAllRevealed(true);
  };

  const revealAll = () => {
    setRevealedIdx(openedCards.length - 1);
    setAllRevealed(true);
  };

  const pickCard = async (index) => {
    if (!packId || pickingCard) return;
    setPickingCard(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuario no autenticado');
      await pickCardService({ uid: firebaseUser.uid, pack_id: packId, card_index: index });
      toast.success(`Elegiste a ${openedCards[index].athlete_name}!`);
      setShowOpening(false);
    } catch (err) {
      toast.error(err?.message || 'Error al elegir carta');
    }
    setPickingCard(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="shop-page">
      <div>
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Tienda</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Sobres de Cartas</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PACKS.map(pack => {
          const PackIcon = pack.icon;
          const canBuy = pack.id === 'free' ? freeAvailable : (user?.balance || 0) >= pack.price;
          return (
            <Card key={pack.id} className={`bg-gradient-to-b ${pack.bg} border ${pack.border} transition-all duration-300 hover:-translate-y-1`} data-testid={`pack-card-${pack.id}`}>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-black/30 flex items-center justify-center">
                  <PackIcon size={32} className={pack.color} />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-white">{pack.name}</h3>
                  <p className="text-xs text-gray-500 font-body mt-1">{pack.desc}</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {pack.price > 0 ? (
                    <>
                      <Coins size={14} className="text-primary" />
                      <span className="font-heading font-bold text-primary">{pack.price}</span>
                    </>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Gratis</Badge>
                  )}
                </div>
                <p className="text-[10px] font-mono text-gray-600">{pack.cards} {pack.cards === 1 ? 'carta' : 'cartas'}</p>
                <Button
                  onClick={() => buyPack(pack.id)}
                  disabled={buying === pack.id || !canBuy}
                  data-testid={`buy-pack-${pack.id}`}
                  className={`w-full font-bold text-xs uppercase tracking-wider ${
                    pack.id === 'free' && !freeAvailable
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(255,107,0,0.2)]'
                  }`}
                  size="sm"
                >
                  {buying === pack.id ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : pack.id === 'free' && !freeAvailable ? (
                    'No Disponible'
                  ) : (
                    'Abrir'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pack Opening Dialog */}
      <Dialog open={showOpening} onOpenChange={setShowOpening}>
        <DialogContent className="bg-[#0A0A0F] border-primary/20 max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="pack-opening-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-primary text-center">
              <Sparkles className="inline mr-2" size={20} />
              {allRevealed ? 'Elige 1 carta para quedarte' : 'Cartas del Sobre'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-4 justify-center py-4">
            {openedCards.map((card, idx) => (
              <div key={idx} className="card-flip-container" data-testid={`opened-card-${idx}`}>
                <div className={`card-flip-inner ${idx <= revealedIdx ? 'flipped' : ''}`}>
                  {/* Back */}
                  <div className="card-flip-front bg-[#0A0A0F] border-2 border-primary/30 rounded-xl flex items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); revealNext(); }}>
                    <div className="text-center pointer-events-none">
                      <p className="font-heading text-3xl font-black text-primary">?</p>
                      <p className="font-heading text-[8px] text-primary/40 tracking-widest mt-2">TOCA PARA REVELAR</p>
                    </div>
                  </div>
                  {/* Front (revealed) */}
                  <div className="card-flip-back">
                    <div
                      onClick={() => allRevealed && pickCard(idx)}
                      className={`w-full h-full rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center rarity-${card.rarity} ${allRevealed ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    >
                      <AthleteCard 
                        card={{
                          athlete_id: card.athlete_id,
                          athlete_name: card.athlete_name,
                          athlete_image: card.athlete_image,
                          position: card.athlete_position,
                          team: card.athlete_team,
                          overall_rating: card.overall_rating,
                          rarity: card.rarity,
                          stats: card.stats || { vel: 0, pot: 0, tec: 0 }
                        }} 
                        size="small" 
                      />
                      {allRevealed && (
                        <p className="text-[8px] text-primary font-mono mt-2 animate-pulse">CLICK PARA ELEGIR</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            {!allRevealed && (
              <>
                <Button onClick={revealNext} className="bg-primary text-black font-bold" size="sm" data-testid="reveal-next-btn">
                  Revelar Siguiente
                </Button>
                <Button onClick={revealAll} variant="outline" className="border-white/10 text-gray-400" size="sm" data-testid="reveal-all-btn">
                  Revelar Todas
                </Button>
              </>
            )}
            {allRevealed && (
              <p className="text-sm text-primary font-body font-medium animate-pulse">Haz click en la carta que quieras quedarte</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
