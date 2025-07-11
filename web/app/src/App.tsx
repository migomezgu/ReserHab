import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import HotelSignup from './pages/HotelSignup';
import HotelSelector from './components/HotelSelector';
import RoomsPage from './pages/RoomsPage';
import ClientsPage from './pages/ClientsPage';
import ReservationsPage from './pages/ReservationsPage';
import CalendarPage from './pages/CalendarPage';
import PreCheckInPage from './pages/PreCheckInPage';

// Layout para rutas protegidas que requieren autenticación
function ProtectedLayout() {
  const { user, currentHotel, memberships, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Mostrar selector de hotel si hay más de uno y no hay hotel seleccionado
  if (memberships.length > 0 && !currentHotel) {
    return <HotelSelector />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ReserHab</h1>
          <div className="flex items-center space-x-4">
            {currentHotel && (
              <div className="mr-4">
                <span className="text-sm font-medium text-gray-700">
                  {currentHotel.name || currentHotel.hotelId} ({currentHotel.role})
                </span>
                {memberships.length > 1 && (
                  <button
                    onClick={() => {}}
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            )}
            <span className="text-sm text-gray-700">
              {user.email}
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
        <Outlet />
      </main>
    </div>
  );
}

// Componente para el dashboard del hotel
function HotelDashboard() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const { currentHotel } = useAuth();

  // Verificar que el hotel de la ruta coincida con el hotel actual
  if (!currentHotel || currentHotel.hotelId !== hotelId) {
    return <Navigate to={`/${currentHotel?.hotelId || ''}`} replace />;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        ¡Bienvenido a {currentHotel.name || 'tu hotel'}!
      </h2>
      <p className="text-gray-600">Panel de control del sistema de gestión hotelera</p>
      
      {/* Secciones basadas en roles */}
      <div className="mt-8 space-y-6">
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reservaciones</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p>Lista de reservaciones recientes para {currentHotel.name || 'este hotel'}</p>
            {/* Aquí iría el componente de reservaciones */}
          </div>
        </section>

        {currentHotel.role === 'admin' && (
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
  );
}

// Componente para manejar la redirección basada en autenticación
function AuthRedirect() {
  const location = useLocation();
  const { user, currentHotel } = useAuth();

  if (user && currentHotel) {
    return <Navigate to={`/${currentHotel.hotelId}`} state={{ from: location }} replace />;
  }
  
  return <Navigate to="/login" state={{ from: location }} replace />;
}

// Componente principal de la aplicación
function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<HotelSignup />} />
        
        {/* Rutas protegidas */}
        <Route element={<ProtectedLayout />}>
          <Route path="/:hotel" element={<HotelDashboard />}>
          <Route index element={<HotelDashboard />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="precheckin/:resId" element={<PreCheckInPage />} />
        </Route>
          
          {/* Redirigir / a /hotelId si hay un hotel seleccionado */}
          <Route path="/" element={<AuthRedirect />} />
        </Route>
        
        {/* Redirigir rutas no encontradas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Componente raíz que envuelve todo con el AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
