import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { listEvents, listMyBets, placeBet } from '@/services/firebaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Target, Coins, TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function BettingPage() {
  const { user, refreshBalance } = useAuth();
  const [events, setEvents] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [betSlip, setBetSlip] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [slipOpen, setSlipOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Suscribirse a eventos en tiempo real
    const eventsQuery = query(collection(db, 'events'), orderBy('created_at', 'desc'), limit(100));
    
    const unsubscribeEvents = onSnapshot(eventsQuery,
      (snapshot) => {
        try {
          const eventsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log("Eventos recibidos:", eventsData?.length || 0);
          setEvents(eventsData || []);
          setLoading(false);
        } catch (error) {
          console.error("Error procesando eventos:", error);
          setEvents([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error en onSnapshot de events:', error);
        setEvents([]);
        setLoading(false);
      }
    );
    
    // Suscribirse a apuestas del usuario en tiempo real
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const betsQuery = query(
        collection(db, 'bets'),
        where('user_id', '==', firebaseUser.uid),
        orderBy('created_at', 'desc'),
        limit(100)
      );
      
      const unsubscribeBets = onSnapshot(betsQuery,
        (snapshot) => {
          try {
            const betsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log("Apuestas recibidas:", betsData?.length || 0);
            setMyBets(betsData || []);
            setLoading(false);
          } catch (error) {
            console.error("Error procesando apuestas:", error);
            setMyBets([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error en onSnapshot de bets:', error);
          setMyBets([]);
          setLoading(false);
        }
      );
      
      return () => {
        unsubscribeEvents();
        unsubscribeBets();
      };
    } else {
      return () => unsubscribeEvents();
    }
  }, []);

  const selectOption = (event, option) => {
    setBetSlip({ event, option });
    setBetAmount('');
    setSlipOpen(true);
  };

  const placeBet = async () => {
    if (!betSlip || !betAmount || Number(betAmount) <= 0) {
      toast.error('Introduce una cantidad valida');
      return;
    }
    
    // Prevenir múltiples clicks
    if (placing) {
      console.log("Apuesta ya en proceso, ignorando click múltiple");
      return;
    }
    
    setPlacing(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuario no autenticado');
      
      console.log("Iniciando apuesta:", {
        uid: firebaseUser.uid,
        event_id: betSlip.event.id,
        option_name: betSlip.option.name,
        amount: Number(betAmount)
      });
      
      // Realizar apuesta con await obligatorio
      const result = await placeBet({
        uid: firebaseUser.uid,
        username: user?.username,
        event_id: betSlip.event.id,
        option_name: betSlip.option.name,
        amount: Number(betAmount),
      });
      
      console.log("Apuesta guardada exitosamente:", result.id);
      
      // Toast SOLO después del await exitoso
      toast.success('Apuesta realizada!');
      
      // Resetear formulario
      setBetSlip(null);
      setBetAmount('');
      await refreshBalance();
      
      // NO llamar a loadData() - onSnapshot actualiza automáticamente
      
    } catch (error) {
      console.error("Error al apostar:", error);
      toast.error(error?.message || 'Error al apostar');
    } finally {
      setPlacing(false);
    }
  };

  const betStatusConfig = {
    pending: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    won: { label: 'Ganada', class: 'bg-green-500/20 text-green-400 border-green-500/30' },
    lost: { label: 'Perdida', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="betting-page">
      <div>
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Zona de apuestas</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Apuestas</h1>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="bg-[#0A0A0F] border border-white/5">
          <TabsTrigger value="events" data-testid="tab-events" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">
            <Target size={14} className="mr-1.5" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="mybets" data-testid="tab-mybets" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">
            <Clock size={14} className="mr-1.5" /> Mis Apuestas ({myBets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4 space-y-4">
          {events?.filter?.(e => e.status === 'open')?.length === 0 ? (
            <Card className="bg-[#0A0A0F] border-white/5">
              <CardContent className="p-8 text-center">
                <Target size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-body">No hay eventos disponibles</p>
                <p className="text-xs text-gray-600 font-body mt-1">El admin creara nuevos eventos pronto</p>
              </CardContent>
            </Card>
          ) : (
            (events || []).filter(e => e.status === 'open').map(event => (
              <Card key={event.id} className="bg-[#0A0A0F] border-white/5 overflow-hidden" data-testid={`event-card-${event.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] mb-2">
                        {event.sport}
                      </Badge>
                      <CardTitle className="text-white font-heading text-base">{event.title}</CardTitle>
                      <p className="text-xs text-gray-500 font-body mt-1">{event.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {event.options?.map(opt => (
                      <button
                        key={opt.name}
                        onClick={() => selectOption(event, opt)}
                        data-testid={`bet-option-${event.id}-${opt.name}`}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                          betSlip?.option?.name === opt.name && betSlip?.event?.id === event.id
                            ? 'border-primary bg-primary/10'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                        }`}
                      >
                        <p className="text-sm font-body font-medium text-gray-200 truncate">{opt.name}</p>
                        <p className="text-lg font-heading font-bold text-primary mt-1">x{opt.odds}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="mybets" className="mt-4 space-y-2">
          {myBets.length === 0 ? (
            <Card className="bg-[#0A0A0F] border-white/5">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 font-body">No tienes apuestas aun</p>
              </CardContent>
            </Card>
          ) : (
            myBets.map(bet => {
              const st = betStatusConfig[bet.status];
              return (
                <Card key={bet.id} className="bg-[#0A0A0F] border-white/5" data-testid={`my-bet-${bet.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-body font-medium text-gray-200 truncate">{bet.event_title}</p>
                        <p className="text-xs text-gray-500 font-body mt-0.5">{bet.option_name} &middot; x{bet.odds}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-mono font-bold text-white">{bet.amount} <span className="text-[10px] text-gray-500">monedas</span></p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Badge className={`text-[9px] ${st.class}`}>{st.label}</Badge>
                          {bet.status === 'won' && <span className="text-[10px] text-green-400 font-mono">+{bet.potential_win}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Betting Slip */}
      {betSlip && (
        <div className="fixed bottom-0 right-0 w-full md:w-96 bg-[#111] border-t-2 md:border-l-2 border-primary z-50 shadow-[0_0_30px_rgba(255,107,0,0.2)]" data-testid="betting-slip">
          <button
            onClick={() => setSlipOpen(!slipOpen)}
            className="w-full bg-primary text-black font-heading font-bold text-sm p-3 flex items-center justify-between"
          >
            <span>Boleto de Apuesta</span>
            {slipOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          {slipOpen && (
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-mono">Evento</p>
                <p className="text-sm text-gray-200 font-body">{betSlip.event.title}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-mono">Seleccion</p>
                  <p className="text-sm text-primary font-body font-medium">{betSlip.option.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-mono">Cuota</p>
                  <p className="text-lg text-primary font-heading font-bold">x{betSlip.option.odds}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase block mb-1">Cantidad</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  placeholder="100"
                  data-testid="bet-amount-input"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
              {betAmount && Number(betAmount) > 0 && (
                <div className="flex justify-between items-center p-2 rounded bg-primary/5 border border-primary/10">
                  <span className="text-xs text-gray-400 font-body">Ganancia potencial</span>
                  <span className="font-heading font-bold text-primary" data-testid="potential-win">
                    {(Number(betAmount) * betSlip.option.odds).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => { setBetSlip(null); setBetAmount(''); }}
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-400 hover:text-white"
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => placeBet()}
                  disabled={placing || !betAmount}
                  data-testid="place-bet-btn"
                  className="flex-1 bg-primary text-black font-bold"
                  size="sm"
                >
                  {placing ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Apostar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
