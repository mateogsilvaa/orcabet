import "@/App.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import BettingPage from "@/pages/BettingPage";
import ShopPage from "@/pages/ShopPage";
import CollectionPage from "@/pages/CollectionPage";
import RoulettePage from "@/pages/RoulettePage";
import MarketPage from "@/pages/MarketPage";
import ShowPage from "@/pages/ShowPage";
import AdminPage from "@/pages/AdminPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm tracking-widest uppercase">Cargando...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/apuestas" element={<ProtectedRoute><Layout><BettingPage /></Layout></ProtectedRoute>} />
      <Route path="/tienda" element={<ProtectedRoute><Layout><ShopPage /></Layout></ProtectedRoute>} />
      <Route path="/coleccion" element={<ProtectedRoute><Layout><CollectionPage /></Layout></ProtectedRoute>} />
      <Route path="/ruleta" element={<ProtectedRoute><Layout><RoulettePage /></Layout></ProtectedRoute>} />
      <Route path="/mercado" element={<ProtectedRoute><Layout><MarketPage /></Layout></ProtectedRoute>} />
      <Route path="/show" element={<ProtectedRoute><Layout><ShowPage /></Layout></ProtectedRoute>} />
      <Route path="/show/:userId" element={<ProtectedRoute><Layout><ShowPage /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#141414',
              border: '1px solid #333',
              color: '#f5f5f5',
              fontFamily: 'Montserrat, sans-serif',
            },
          }}
        />
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
