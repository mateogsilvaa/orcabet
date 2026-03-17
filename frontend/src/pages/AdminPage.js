import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdminStats,
  listEvents,
  listAthletes,
  subscribeToAthletes,
  createEvent as createEventSvc,
  resolveEvent as resolveEventSvc,
  closeEvent as closeEventSvc,
  deleteEvent as deleteEventSvc,
  createAthlete as createAthleteSvc,
  deleteAthlete as deleteAthleteSvc,
  adminAddBalance,
  unlockFreePackGlobal,
} from '@/services/firebaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Users, Target, Layers, BarChart3, Plus, Trash2, CheckCircle, XCircle, User, Swords, Coins } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Event form
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', sport: '', options: [{ name: '', odds: '' }] });

  // Athlete form
  const [showAthleteDialog, setShowAthleteDialog] = useState(false);
  const [athleteForm, setAthleteForm] = useState({ name: '', position: '', team: '', rarity: 'common', overall_rating: 70, image_url: '', stats: { vel: 50, pot: 50, tec: 50 } });

  // Resolve dialog
  const [resolveEvent, setResolveEvent] = useState(null);
  const [winningOption, setWinningOption] = useState('');

  // Add balance dialog
  const [balanceUser, setBalanceUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  
  // Free pack global state
  const [giftingFreePack, setGiftingFreePack] = useState(false);

  useEffect(() => {
    if (user?.is_admin) {
      loadData();
      
      // Suscribirse a atletas en tiempo real
      const unsubscribeAthletes = subscribeToAthletes((athletesData) => {
        setAthletes(athletesData);
      });
      
      return () => {
        unsubscribeAthletes(); // Cleanup al desmontar
      };
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [statsData, eventsData, athletesData, usersData] = await Promise.all([
        getAdminStats(),
        listEvents({ includeAll: true }),
        listAthletes(),
        // Nota: "admin/users" era un endpoint; aquí leemos users directamente.
        // La seguridad debe venir de Rules.
        (async () => {
          const { getDocs, query, where, limit, collection } = await import('firebase/firestore');
          const { db } = await import('@/firebase');
          const snap = await getDocs(query(collection(db, 'users'), where('is_admin', '!=', true), limit(200)));
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        })(),
      ]);
      setStats(statsData);
      setEvents(eventsData);
      setAthletes(athletesData);
      setAllUsers(usersData);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const seedAthletes = async () => {
    try {
      // Semilla de ejemplo: puedes cargar atletas creando manualmente en Firestore.
      toast.error('La semilla automática fue eliminada (serverless). Crea atletas desde el panel.');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const createEvent = async () => {
    const opts = eventForm.options.filter(o => o.name && o.odds).map(o => ({ name: o.name, odds: Number(o.odds) }));
    if (!eventForm.title || opts.length < 2) {
      toast.error('Completa el titulo y al menos 2 opciones');
      return;
    }
    try {
      await createEventSvc({ ...eventForm, options: opts });
      toast.success('Evento creado!');
      setShowEventDialog(false);
      setEventForm({ title: '', description: '', sport: '', options: [{ name: '', odds: '' }] });
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const handleResolve = async () => {
    if (!resolveEvent || !winningOption) return;
    try {
      await resolveEventSvc(resolveEvent.id, winningOption);
      toast.success('Evento resuelto!');
      setResolveEvent(null);
      setWinningOption('');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const closeEvent = async (eventId) => {
    try {
      await closeEventSvc(eventId);
      toast.success('Evento cerrado');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const deleteEvent = async (eventId) => {
    try {
      await deleteEventSvc(eventId);
      toast.success('Evento eliminado');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const createAthlete = async () => {
    if (!athleteForm.name) { toast.error('Nombre requerido'); return; }
    try {
      await createAthleteSvc(athleteForm);
      toast.success('Atleta creado!');
      setShowAthleteDialog(false);
      setAthleteForm({ name: '', position: '', team: '', rarity: 'common', overall_rating: 70, image_url: '', stats: { vel: 50, pot: 50, tec: 50 } });
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const deleteAthlete = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este atleta?')) return;
    try {
      await deleteAthleteSvc(id);
      toast.success('Atleta eliminado');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  const giftFreePackToAll = async () => {
    if (!confirm('¿Estás seguro de que quieres regalar un sobre gratis a TODOS los usuarios?')) return;
    try {
      setGiftingFreePack(true);
      const result = await unlockFreePackGlobal();
      toast.success(`¡Sobre gratis regalado a ${result.updatedUsers} usuarios!`);
    } catch (err) {
      toast.error(err?.message || 'Error al regalar sobre gratis');
    } finally {
      setGiftingFreePack(false);
    }
  };

  const addBalance = async () => {
    if (!balanceUser || !balanceAmount) return;
    try {
      const res = await adminAddBalance({ user_id: balanceUser.id, amount: Number(balanceAmount) });
      toast.success(`Saldo actualizado: ${res.new_balance} monedas`);
      setBalanceUser(null);
      setBalanceAmount('');
      loadData();
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  if (!user?.is_admin) {
    return (
      <div className="text-center py-16">
        <Shield size={48} className="text-gray-700 mx-auto mb-4" />
        <p className="text-gray-500 font-body">Acceso solo para administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-page">
      <div>
        <p className="text-xs font-mono text-gray-600 tracking-[0.2em] uppercase">Administracion</p>
        <h1 className="font-heading text-2xl md:text-3xl font-black text-white mt-1">Panel Admin</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Usuarios', value: stats.total_users, icon: Users },
            { label: 'Apuestas', value: stats.total_bets, icon: Target },
            { label: 'Eventos', value: stats.total_events, icon: BarChart3 },
            { label: 'Atletas', value: stats.total_athletes, icon: Swords },
            { label: 'Cartas', value: stats.total_cards, icon: Layers },
            { label: 'En Mercado', value: stats.active_listings, icon: BarChart3 },
          ].map(s => (
            <Card key={s.label} className="bg-[#0A0A0F] border-white/5">
              <CardContent className="p-3 text-center">
                <s.icon size={16} className="text-primary mx-auto mb-1" />
                <p className="font-heading text-lg font-bold text-white">{s.value}</p>
                <p className="text-[9px] font-mono text-gray-500 uppercase">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="bg-[#0A0A0F] border border-white/5">
          <TabsTrigger value="events" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">Eventos</TabsTrigger>
          <TabsTrigger value="athletes" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">Atletas</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-body">Usuarios</TabsTrigger>
        </TabsList>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setShowEventDialog(true)} className="bg-primary text-black font-bold" size="sm" data-testid="create-event-btn">
              <Plus size={14} className="mr-1" /> Crear Evento
            </Button>
            <Button 
              onClick={giftFreePackToAll} 
              disabled={giftingFreePack}
              className="bg-green-600 text-white font-bold" 
              size="sm"
              data-testid="gift-free-pack-btn"
            >
              🎁 {giftingFreePack ? 'Regalando...' : 'Regalar Sobre a Todos'}
            </Button>
          </div>
          <div className="space-y-2">
            {events.map(event => (
              <Card key={event.id} className="bg-[#0A0A0F] border-white/5" data-testid={`admin-event-${event.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          event.status === 'open' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          event.status === 'closed' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }>{event.status}</Badge>
                        <Badge className="bg-white/5 text-gray-400 border-white/10 text-[9px]">{event.sport}</Badge>
                      </div>
                      <p className="text-sm font-heading font-bold text-white">{event.title}</p>
                      <p className="text-xs text-gray-500 font-body mt-0.5">{event.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {event.options?.map(o => (
                          <span key={o.name} className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                            event.winning_option === o.name ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/5 text-gray-500'
                          }`}>
                            {o.name} x{o.odds}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {event.status === 'open' && (
                        <>
                          <Button onClick={() => closeEvent(event.id)} variant="ghost" size="icon" className="text-yellow-400 h-8 w-8" title="Cerrar">
                            <XCircle size={16} />
                          </Button>
                          <Button onClick={() => setResolveEvent(event)} variant="ghost" size="icon" className="text-green-400 h-8 w-8" title="Resolver">
                            <CheckCircle size={16} />
                          </Button>
                        </>
                      )}
                      {event.status === 'closed' && (
                        <Button onClick={() => setResolveEvent(event)} variant="ghost" size="icon" className="text-green-400 h-8 w-8" title="Resolver">
                          <CheckCircle size={16} />
                        </Button>
                      )}
                      <Button onClick={() => deleteEvent(event.id)} variant="ghost" size="icon" className="text-red-400 h-8 w-8" title="Eliminar">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ATHLETES TAB */}
        <TabsContent value="athletes" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setShowAthleteDialog(true)} className="bg-primary text-black font-bold" size="sm" data-testid="create-athlete-btn">
              <Plus size={14} className="mr-1" /> Crear Atleta
            </Button>
            <Button onClick={seedAthletes} variant="outline" className="border-white/10 text-gray-400" size="sm" data-testid="seed-athletes-btn">
              Cargar Atletas de Ejemplo
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {athletes.map(a => (
              <Card key={a.id} className="bg-[#0A0A0F] border-white/5" data-testid={`admin-athlete-${a.id}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center">
                      <span className="font-heading text-sm font-bold">{a.overall_rating}</span>
                    </div>
                    <div>
                      <p className="text-sm font-body font-medium text-gray-200">{a.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-[8px] ${
                          a.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          a.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                          a.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>{a.rarity}</Badge>
                        <span className="text-[10px] text-gray-600 font-mono">{a.position}</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => deleteAthlete(a.id)} variant="ghost" size="icon" className="text-gray-600 hover:text-red-400 h-8 w-8">
                    <Trash2 size={14} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <p className="text-xs font-mono text-gray-500">Gestionar saldo de jugadores</p>
          <div className="space-y-2">
            {allUsers.map(u => (
              <Card key={u.id} className="bg-[#0A0A0F] border-white/5" data-testid={`admin-user-${u.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">{u.username?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-body font-medium text-gray-200">{u.username}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-primary">{u.balance?.toLocaleString('es-ES')} monedas</span>
                        <span className="text-xs font-mono text-gray-500">{u.total_cards} cartas</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setBalanceUser(u)} className="bg-green-600/20 text-green-400 hover:bg-green-600/30" size="sm" data-testid={`add-balance-${u.id}`}>
                    <Coins size={14} className="mr-1" /> Ingresar
                  </Button>
                </CardContent>
              </Card>
            ))}
            {allUsers.length === 0 && (
              <Card className="bg-[#0A0A0F] border-white/5">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 font-body">No hay usuarios registrados</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-[#0A0A0F] border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto" data-testid="create-event-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Nuevo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} placeholder="Titulo del evento" className="bg-black/50 border-white/10 text-white" data-testid="event-title-input" />
            <Input value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} placeholder="Descripcion" className="bg-black/50 border-white/10 text-white" />
            <Input value={eventForm.sport} onChange={e => setEventForm({...eventForm, sport: e.target.value})} placeholder="Deporte (ej: Futbol)" className="bg-black/50 border-white/10 text-white" />
            <div>
              <p className="text-xs font-mono text-gray-500 mb-2">Opciones (nombre + cuota)</p>
              {eventForm.options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={opt.name} onChange={e => { const opts = [...eventForm.options]; opts[i].name = e.target.value; setEventForm({...eventForm, options: opts}); }} placeholder="Nombre opcion" className="bg-black/50 border-white/10 text-white flex-1" />
                  <Input type="number" step="0.1" value={opt.odds} onChange={e => { const opts = [...eventForm.options]; opts[i].odds = e.target.value; setEventForm({...eventForm, options: opts}); }} placeholder="Cuota" className="bg-black/50 border-white/10 text-white w-24" />
                  {eventForm.options.length > 1 && (
                    <Button onClick={() => { const opts = eventForm.options.filter((_, j) => j !== i); setEventForm({...eventForm, options: opts}); }} variant="ghost" size="icon" className="text-red-400 h-9 w-9"><Trash2 size={14} /></Button>
                  )}
                </div>
              ))}
              <Button onClick={() => setEventForm({...eventForm, options: [...eventForm.options, { name: '', odds: '' }]})} variant="ghost" className="text-primary text-xs" size="sm">
                <Plus size={12} className="mr-1" /> Agregar opcion
              </Button>
            </div>
            <Button onClick={createEvent} className="w-full bg-primary text-black font-bold" data-testid="submit-event-btn">Crear Evento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Athlete Dialog */}
      <Dialog open={showAthleteDialog} onOpenChange={setShowAthleteDialog}>
        <DialogContent className="bg-[#0A0A0F] border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto" data-testid="create-athlete-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Nuevo Atleta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={athleteForm.name} onChange={e => setAthleteForm({...athleteForm, name: e.target.value})} placeholder="Nombre" className="bg-black/50 border-white/10 text-white" data-testid="athlete-name-input" />
            <Input value={athleteForm.position} onChange={e => setAthleteForm({...athleteForm, position: e.target.value})} placeholder="Posicion" className="bg-black/50 border-white/10 text-white" />
            <Input value={athleteForm.team} onChange={e => setAthleteForm({...athleteForm, team: e.target.value})} placeholder="Equipo" className="bg-black/50 border-white/10 text-white" />
            <Input value={athleteForm.image_url} onChange={e => setAthleteForm({...athleteForm, image_url: e.target.value})} placeholder="URL imagen (opcional)" className="bg-black/50 border-white/10 text-white" />
            <div className="flex gap-2">
              {['common', 'rare', 'epic', 'legendary'].map(r => (
                <button key={r} onClick={() => setAthleteForm({...athleteForm, rarity: r})} className={`flex-1 py-2 rounded text-xs font-body font-medium transition-all ${athleteForm.rarity === r ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-mono text-gray-500 block mb-1">Rating: {athleteForm.overall_rating}</label>
              <input type="range" min="40" max="99" value={athleteForm.overall_rating} onChange={e => setAthleteForm({...athleteForm, overall_rating: Number(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">VEL: {athleteForm.stats.vel}</label>
                <input type="range" min="1" max="99" value={athleteForm.stats.vel} onChange={e => setAthleteForm({...athleteForm, stats: {...athleteForm.stats, vel: Number(e.target.value)}})} className="w-full accent-primary" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">POT: {athleteForm.stats.pot}</label>
                <input type="range" min="1" max="99" value={athleteForm.stats.pot} onChange={e => setAthleteForm({...athleteForm, stats: {...athleteForm.stats, pot: Number(e.target.value)}})} className="w-full accent-primary" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">TEC: {athleteForm.stats.tec}</label>
                <input type="range" min="1" max="99" value={athleteForm.stats.tec} onChange={e => setAthleteForm({...athleteForm, stats: {...athleteForm.stats, tec: Number(e.target.value)}})} className="w-full accent-primary" />
              </div>
            </div>
            <Button onClick={createAthlete} className="w-full bg-primary text-black font-bold" data-testid="submit-athlete-btn">Crear Atleta</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Event Dialog */}
      <Dialog open={!!resolveEvent} onOpenChange={() => setResolveEvent(null)}>
        <DialogContent className="bg-[#0A0A0F] border-green-500/20 max-w-sm" data-testid="resolve-event-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Resolver: {resolveEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-body">Selecciona la opcion ganadora:</p>
            {resolveEvent?.options?.map(opt => (
              <button
                key={opt.name}
                onClick={() => setWinningOption(opt.name)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  winningOption === opt.name ? 'border-green-500 bg-green-500/10' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <p className="text-sm font-body text-gray-200">{opt.name}</p>
                <p className="text-xs text-gray-500">x{opt.odds}</p>
              </button>
            ))}
            <Button onClick={handleResolve} disabled={!winningOption} className="w-full bg-green-600 text-white font-bold" data-testid="confirm-resolve-btn">
              <CheckCircle size={14} className="mr-1" /> Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Balance Dialog */}
      <Dialog open={!!balanceUser} onOpenChange={() => setBalanceUser(null)}>
        <DialogContent className="bg-[#0A0A0F] border-green-500/20 max-w-sm" data-testid="add-balance-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-white">Ingresar saldo a {balanceUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-body">Saldo actual: <span className="text-primary font-bold">{balanceUser?.balance?.toLocaleString('es-ES')}</span> monedas</p>
            <Input
              type="number"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              placeholder="Cantidad a ingresar"
              data-testid="add-balance-amount"
              className="bg-black/50 border-white/10 text-white"
            />
            <Button onClick={addBalance} disabled={!balanceAmount} className="w-full bg-green-600 text-white font-bold" data-testid="confirm-add-balance-btn">
              <Coins size={14} className="mr-1" /> Ingresar Monedas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
