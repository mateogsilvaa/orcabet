import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Target, ShoppingBag, Store, Layers, RotateCw, Users, Shield, Sparkles, LogOut, Coins } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/apuestas', icon: Target, label: 'Apuestas' },
    { to: '/tienda', icon: ShoppingBag, label: 'Tienda' },
    { to: '/mercado', icon: Store, label: 'Mercado' },
    { to: '/coleccion', icon: Layers, label: 'Coleccion' },
    { to: '/ruleta', icon: RotateCw, label: 'Ruleta' },
    { to: '/show', icon: Users, label: 'Show' },
    { to: '/equipo', icon: Sparkles, label: 'Mi Equipo' },
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0A0A0F] border-r border-white/5 fixed h-full z-30">
        <div className="p-5 border-b border-white/5">
          <h1 className="font-heading text-xl font-black text-primary tracking-tighter neon-text" data-testid="sidebar-logo">
            ORCABET
          </h1>
          <p className="text-[10px] text-gray-600 font-mono tracking-[0.2em] mt-1">FANTASY ORCASITAS</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} strokeWidth={1.5} />
              <span className="font-body">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xs">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate font-body">{user?.username}</p>
              <div className="flex items-center gap-1">
                <Coins size={11} className="text-primary" />
                <span className="text-xs text-primary font-mono" data-testid="sidebar-balance">
                  {user?.balance?.toLocaleString('es-ES')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-400 text-xs w-full transition-colors font-body mt-1"
          >
            <LogOut size={14} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-60">
        {/* Mobile Top Bar */}
        <div className="md:hidden sticky top-0 z-20 bg-[#0A0A0F]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading text-base font-black text-primary neon-text">ORCABET</h1>
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-primary" />
            <span className="text-sm font-mono text-primary" data-testid="mobile-balance">
              {user?.balance?.toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-8 pb-24 md:pb-8 cyber-grid min-h-screen">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-md border-t border-white/5 z-30" data-testid="mobile-nav">
          <div className="flex justify-around py-1.5">
            {navItems.slice(0, 5).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-600'
                  }`
                }
              >
                <item.icon size={18} strokeWidth={1.5} />
                <span className="font-body">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
