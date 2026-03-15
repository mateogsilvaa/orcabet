import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Coins, ArrowRight, UserPlus, LogIn } from 'lucide-react';

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
        toast.success('Cuenta creada! Recibes 1000 monedas de regalo');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error de autenticacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 cyber-grid relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#00F3FF]/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl md:text-5xl font-black text-primary neon-text tracking-tighter" data-testid="auth-logo">
            ORCABET
          </h1>
          <p className="text-xs text-gray-600 font-mono tracking-[0.3em] mt-2">FANTASY ORCASITAS</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-2xl p-8" data-testid="auth-form-container">
          <h2 className="font-heading text-lg font-bold text-white mb-6">
            {isLogin ? 'Iniciar Sesion' : 'Crear Cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                data-testid="auth-email-input"
                className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                  Nombre de usuario
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="TuAlias"
                  data-testid="auth-username-input"
                  className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500 mb-1.5 block">
                Contrasena
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                data-testid="auth-password-input"
                className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full bg-primary text-black font-heading font-bold uppercase tracking-widest h-11 hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]"
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
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Coins size={16} className="text-primary flex-shrink-0" />
              <p className="text-xs text-gray-400 font-body">Recibiras <span className="text-primary font-bold">1.000 monedas</span> de bienvenida</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              data-testid="auth-toggle-btn"
              className="text-sm text-gray-500 hover:text-primary transition-colors font-body"
            >
              {isLogin ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Inicia sesion'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-700 font-mono mt-8">
          ORCABET 2026 &middot; FANTASY ORCASITAS
        </p>
      </div>
    </div>
  );
}
