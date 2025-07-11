import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { slugify } from 'slugify';

export default function HotelSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      setMessage('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Crear el ID del hotel a partir del nombre
      const hotelId = slugify(name, { lower: true, strict: true });
      
      // Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Crear el documento del hotel
      const hotelData = {
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        plan: 'free',
      };

      // Crear el documento del hotel y el usuario admin en una transacción
      const batch = {
        [`hotels/${hotelId}`]: hotelData,
        [`hotels/${hotelId}/users/${user.uid}`]: {
          email,
          role: 'admin',
          createdAt: serverTimestamp(),
        },
      };

      // Ejecutar la transacción
      await Promise.all(
        Object.entries(batch).map(([path, data]) => 
          setDoc(doc(db, ...path.split('/')), data, { merge: true })
        )
      );

      // Redirigir al dashboard del nuevo hotel
      navigate(`/${hotelId}`);
    } catch (error: any) {
      console.error('Error al registrar el hotel:', error);
      setMessage(error.message || 'Ocurrió un error al registrar el hotel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear nuevo hotel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Registra tu hotel para comenzar a usar ReserHab
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${message.includes('éxito') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="hotel-name" className="sr-only">
                Nombre del hotel
              </label>
              <input
                id="hotel-name"
                name="hotelName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nombre del hotel"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña (mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {loading ? 'Registrando...' : 'Registrar hotel'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">¿Ya tienes una cuenta? </span>
            <a 
              href="/login" 
              className="font-medium text-blue-600 hover:text-blue-500"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
            >
              Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
