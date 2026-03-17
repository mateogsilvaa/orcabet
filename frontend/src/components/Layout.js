import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Target, ShoppingBag, Store, Layers, RotateCw, Users, Shield, LogOut, Coins } from 'lucide-react';

export default function Layout({ children }) {
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
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0a0a0a] border-r border-[#222] fixed h-full z-30">
        <div className="p-5 border-b border-[#222]">
          <h1 className="text-xl font-extrabold text-white tracking-tight" data-testid="sidebar-logo">
            ORCA<span className="text-[#ff5e00]">BET</span>
          </h1>
          <p className="text-[10px] text-gray-600 tracking-[0.2em] mt-1">FANTASY ORCASITAS</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#ff5e00]/10 text-[#ff5e00] border border-[#ff5e00]/20'
                    : 'text-[#aaa] hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[#222]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#ff5e00]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#ff5e00] font-bold text-xs">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.username}</p>
              <div className="flex items-center gap-1">
                <Coins size={11} className="text-[#ff5e00]" />
                <span className="text-xs text-[#ff5e00] font-semibold" data-testid="sidebar-balance">
                  {user?.balance?.toLocaleString('es-ES')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-400 text-xs w-full transition-colors mt-1"
          >
            <LogOut size={14} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-60">
        {/* Mobile Top Bar */}
        <div className="md:hidden sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-[#222] px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-extrabold text-white">ORCA<span className="text-[#ff5e00]">BET</span></h1>
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-[#ff5e00]" />
            <span className="text-sm font-semibold text-[#ff5e00]" data-testid="mobile-balance">
              {user?.balance?.toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-[#222] z-30" data-testid="mobile-nav">
          <div className="flex justify-around py-1.5">
            {navItems.slice(0, 5).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors ${
                    isActive ? 'text-[#ff5e00]' : 'text-gray-600'
                  }`
                }
              >
                <item.icon size={18} strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
