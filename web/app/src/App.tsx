import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';

// Componente para el dashboard
function Dashboard() {
  const { user, role, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ReserHab</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {user?.email} ({role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">¡Bienvenido a ReserHab!</h2>
          <p className="text-gray-600">Panel de control del sistema de gestión hotelera</p>
          
          {/* Secciones basadas en roles */}
          <div className="mt-8 space-y-6">
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reservaciones</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p>Lista de reservaciones recientes</p>
                {/* Aquí iría el componente de reservaciones */}
              </div>
            </section>

            {role === 'admin' && (
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Administración</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p>Herramientas de administración</p>
                  {/* Aquí irían las herramientas de administración */}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente principal de la aplicación
function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Componente raíz que envuelve todo con el AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
