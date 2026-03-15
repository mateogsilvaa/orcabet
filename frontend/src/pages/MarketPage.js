import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Store, Coins, Tag, Gavel, User, Plus, X } from 'lucide-react';

const RARITY_BADGE = {
  common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};
const RARITY_LABEL = { common: 'Comun', rare: 'Rara', epic: 'Epica', legendary: 'Legendaria' };

export default function MarketPage() {
  const { user, refreshBalance } = useAuth();
  const [listings, setListings] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellCard, setSellCard] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellType, setSellType] = useState('fixed');
  const [bidAmount, setBidAmount] = useState('');
  const [bidDialog, setBidDialog] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [listRes, collRes] = await Promise.all([
        api.get('/market'),
        api.get('/collection'),
      ]);
      setListings(listRes.data);
      setMyCards(collRes.data.cards);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const listCard = async () => {
    if (!sellCard || !sellPrice) return;
    try {
      await api.post('/market/list', { user_card_id: sellCard.id, price: Number(sellPrice), listing_type: sellType });
      toast.success('Carta listada en el mercado!');
      setShowSellDialog(false);
      setSellCard(null);
      setSellPrice('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al listar'); }
  };

  const buyListing = async (listingId) => {
    try {
      await api.post(`/market/${listingId}/buy`);
      toast.success('Carta comprada!');
      await refreshBalance();
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al comprar'); }
  };

  const placeBid = async () => {
    if (!bidDialog || !bidAmount) return;
    try {
      await api.post(`/market/${bidDialog.id}/bid`, { amount: Number(bidAmount) });
      toast.success('Puja realizada!');
      setBidDialog(null);
      setBidAmount('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al pujar'); }
  };

  const cancelListing = async (listingId) => {
    try {
      await api.post(`/market/${listingId}/cancel`);
      toast.success('Listado cancelado');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="market-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Casa de subastas</p>
          <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Mercado</h1>
        </div>
        <Button onClick={() => setShowSellDialog(true)} data-testid="sell-card-btn" className="bg-primary text-black font-bold" size="sm">
          <Plus size={14} className="mr-1" /> Vender Carta
        </Button>
      </div>

      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="bg-[#0A0A0F] border border-white/5">
          <TabsTrigger value="listings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">
            <Store size={14} className="mr-1.5" /> Listados
          </TabsTrigger>
          <TabsTrigger value="mine" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">
            <Tag size={14} className="mr-1.5" /> Mis Ventas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : listings.filter(l => l.seller_id !== user?.id).length === 0 ? (
            <Card className="bg-[#0A0A0F] border-white/5">
              <CardContent className="p-8 text-center">
                <Store size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-body">No hay cartas en el mercado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {listings.filter(l => l.seller_id !== user?.id).map(listing => (
                <Card key={listing.id} className="bg-[#0A0A0F] border-white/5 hover:border-primary/20 transition-all" data-testid={`listing-${listing.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center">
                        <span className="font-heading text-sm font-black text-white">{listing.overall_rating}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading font-bold text-white truncate">{listing.athlete_name}</p>
                        <Badge className={`text-[9px] ${RARITY_BADGE[listing.rarity]}`}>{RARITY_LABEL[listing.rarity]}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-500 font-body">{listing.seller_name}</span>
                      </div>
                      <Badge className={listing.listing_type === 'auction' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-primary/20 text-primary border-primary/30'} >
                        {listing.listing_type === 'auction' ? 'Subasta' : 'Fijo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <Coins size={14} className="text-primary" />
                        <span className="font-heading font-bold text-primary">
                          {listing.listing_type === 'auction' ? listing.highest_bid || listing.price : listing.price}
                        </span>
                      </div>
                      {listing.listing_type === 'fixed' ? (
                        <Button onClick={() => buyListing(listing.id)} className="bg-primary text-black font-bold" size="sm" data-testid={`buy-listing-${listing.id}`}>
                          Comprar
                        </Button>
                      ) : (
                        <Button onClick={() => setBidDialog(listing)} className="bg-purple-600 text-white font-bold" size="sm">
                          <Gavel size={14} className="mr-1" /> Pujar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4 space-y-2">
          {listings.filter(l => l.seller_id === user?.id).length === 0 ? (
            <Card className="bg-[#0A0A0F] border-white/5">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 font-body">No tienes ventas activas</p>
              </CardContent>
            </Card>
          ) : (
            listings.filter(l => l.seller_id === user?.id).map(listing => (
              <Card key={listing.id} className="bg-[#0A0A0F] border-white/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-bold text-white">{listing.athlete_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[9px] ${RARITY_BADGE[listing.rarity]}`}>{RARITY_LABEL[listing.rarity]}</Badge>
                      <span className="text-xs font-mono text-primary">{listing.price} monedas</span>
                    </div>
                  </div>
                  <Button onClick={() => cancelListing(listing.id)} variant="ghost" size="icon" className="text-gray-500 hover:text-red-400">
                    <X size={16} />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Sell Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="bg-[#0A0A0F] border-primary/20 max-w-lg max-h-[80vh] overflow-y-auto" data-testid="sell-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Vender Carta</DialogTitle>
          </DialogHeader>
          {!sellCard ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-gray-500 font-body mb-2">Selecciona una carta para vender:</p>
              {myCards.length === 0 ? (
                <p className="text-gray-500 text-sm font-body text-center py-4">No tienes cartas disponibles</p>
              ) : (
                myCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => setSellCard(card)}
                    className="w-full p-3 rounded-lg border border-white/5 hover:border-primary/20 bg-white/[0.02] flex items-center gap-3 text-left transition-all"
                  >
                    <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center">
                      <span className="font-heading text-xs font-bold">{card.overall_rating}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-body text-gray-200">{card.athlete_name}</p>
                      <Badge className={`text-[8px] ${RARITY_BADGE[card.rarity]}`}>{RARITY_LABEL[card.rarity]}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-heading font-bold text-white">{sellCard.athlete_name}</p>
                <Badge className={`text-[9px] mt-1 ${RARITY_BADGE[sellCard.rarity]}`}>{RARITY_LABEL[sellCard.rarity]}</Badge>
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase block mb-1">Precio (monedas)</label>
                <Input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="100" className="bg-black/50 border-white/10 text-white" data-testid="sell-price-input" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setSellType('fixed'); }} className={`flex-1 text-xs ${sellType === 'fixed' ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'}`} size="sm">
                  <Tag size={12} className="mr-1" /> Precio Fijo
                </Button>
                <Button onClick={() => { setSellType('auction'); }} className={`flex-1 text-xs ${sellType === 'auction' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`} size="sm">
                  <Gavel size={12} className="mr-1" /> Subasta 24h
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setSellCard(null)} variant="outline" className="flex-1 border-white/10 text-gray-400" size="sm">Atras</Button>
                <Button onClick={listCard} className="flex-1 bg-primary text-black font-bold" size="sm" data-testid="confirm-sell-btn">Listar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bid Dialog */}
      <Dialog open={!!bidDialog} onOpenChange={() => setBidDialog(null)}>
        <DialogContent className="bg-[#0A0A0F] border-purple-500/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Pujar por {bidDialog?.athlete_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-body">Puja actual: <span className="text-purple-400 font-bold">{bidDialog?.highest_bid || bidDialog?.price}</span> monedas</p>
            <Input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="Tu puja" className="bg-black/50 border-white/10 text-white" data-testid="bid-amount-input" />
            <Button onClick={placeBid} className="w-full bg-purple-600 text-white font-bold" data-testid="confirm-bid-btn">
              <Gavel size={14} className="mr-1" /> Confirmar Puja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
