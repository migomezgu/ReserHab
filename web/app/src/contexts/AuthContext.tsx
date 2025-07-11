import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { collection, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface HotelMembership {
  hotelId: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  currentHotel: HotelMembership | null;
  memberships: HotelMembership[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentHotel: (hotel: HotelMembership) => void;
  loading: boolean;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<HotelMembership[]>([]);
  const [currentHotel, setCurrentHotel] = useState<HotelMembership | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar los hoteles a los que pertenece el usuario
  const loadUserMemberships = async (userId: string): Promise<HotelMembership[]> => {
    try {
      // Buscar en todos los hoteles donde el usuario tenga un rol
      const q = query(
        collection(db, 'hotels'),
        where(`users.${userId}.role`, '!=', null)
      );
      
      const querySnapshot = await getDocs(q);
      const userMemberships: HotelMembership[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data().users?.[userId];
        if (userData?.role) {
          userMemberships.push({
            hotelId: doc.id,
            role: userData.role,
            name: doc.data().name
          });
        }
      });
      
      return userMemberships;
    } catch (error) {
      console.error('Error al cargar memberships:', error);
      return [];
    }
  };

  // Actualizar los memberships del usuario
  const refreshMemberships = async () => {
    if (!user) return;
    const userMemberships = await loadUserMemberships(user.uid);
    setMemberships(userMemberships);
    
    // Si hay un hotel actual pero ya no está en los memberships, limpiarlo
    if (currentHotel && !userMemberships.some(m => m.hotelId === currentHotel.hotelId)) {
      setCurrentHotel(null);
    }
    
    // Si no hay hotel actual pero hay memberships, seleccionar el primero
    if (!currentHotel && userMemberships.length > 0) {
      const storedHotelId = localStorage.getItem('currentHotelId');
      const hotelToSelect = storedHotelId 
        ? userMemberships.find(m => m.hotelId === storedHotelId) || userMemberships[0]
        : userMemberships[0];
      
      if (hotelToSelect) {
        setCurrentHotel(hotelToSelect);
        localStorage.setItem('currentHotelId', hotelToSelect.hotelId);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        await refreshMemberships();
      } else {
        setMemberships([]);
        setCurrentHotel(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // Los memberships se cargarán automáticamente por el onAuthStateChanged
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setMemberships([]);
      setCurrentHotel(null);
      localStorage.removeItem('currentHotelId');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar el hotel actual
  const handleSetCurrentHotel = (hotel: HotelMembership) => {
    setCurrentHotel(hotel);
    localStorage.setItem('currentHotelId', hotel.hotelId);
  };

  const value = {
    user,
    currentHotel,
    memberships,
    login,
    logout,
    setCurrentHotel: handleSetCurrentHotel,
    loading,
    refreshMemberships
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
