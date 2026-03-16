import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Coins, ArrowRight, UserPlus, LogIn } from 'lucide-react';

const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'Este email ya esta registrado',
  'auth/invalid-email': 'Email no valido',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres',
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contrasena incorrecta',
  'auth/invalid-credential': 'Credenciales invalidas',
  'auth/too-many-requests': 'Demasiados intentos. Intenta mas tarde',
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Bienvenido de vuelta!');
      } else {
        if (!username.trim()) {
          toast.error('Introduce un nombre de usuario');
          setLoading(false);
          return;
        }
        await register(email, username, password);
        toast.success('Cuenta creada! Recibes 100 monedas de regalo');
      }
      navigate('/');
    } catch (err) {
      const code = err.code || '';
      const msg = FIREBASE_ERRORS[code] || err.response?.data?.detail || 'Error de autenticacion';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?q=80&w=2070&auto=format&fit=crop')", transform: 'scale(1.05)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-black/70 backdrop-blur-[4px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" data-testid="auth-logo">
            ORCA<span className="text-[#ff5e00]">BET</span>
          </h1>
          <p className="text-xs text-gray-500 tracking-[0.3em] mt-2 uppercase">Fantasy Orcasitas</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-xl p-8" data-testid="auth-form-container">
          <h2 className="text-lg font-bold text-white mb-6">
            {isLogin ? 'Iniciar Sesion' : 'Crear Cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                data-testid="auth-email-input"
                className="bg-black/50 border-[#333] text-white placeholder:text-gray-600 focus:border-[#ff5e00] focus:ring-[#ff5e00]"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                  Nombre de usuario
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="TuAlias"
                  data-testid="auth-username-input"
                  className="bg-black/50 border-[#333] text-white placeholder:text-gray-600 focus:border-[#ff5e00] focus:ring-[#ff5e00]"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                Contrasena
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                data-testid="auth-password-input"
                className="bg-black/50 border-[#333] text-white placeholder:text-gray-600 focus:border-[#ff5e00] focus:ring-[#ff5e00]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full bg-[#ff5e00] text-black font-bold uppercase tracking-widest h-11 hover:bg-[#ff5e00]/90 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {isLogin ? 'Entrar' : 'Crear Cuenta'}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          {!isLogin && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[#ff5e00]/5 border border-[#ff5e00]/10">
              <Coins size={16} className="text-[#ff5e00] flex-shrink-0" />
              <p className="text-xs text-gray-400">Recibiras <span className="text-[#ff5e00] font-bold">100 monedas</span> de bienvenida</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              data-testid="auth-toggle-btn"
              className="text-sm text-gray-500 hover:text-[#ff5e00] transition-colors"
            >
              {isLogin ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Inicia sesion'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-8">
          ORCABET 2026 &middot; FANTASY ORCASITAS
        </p>
      </div>
    </div>
  );
}
