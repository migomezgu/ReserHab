import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore'

// Configuración de Firebase - Reemplaza con tus valores reales
const firebaseConfig = {
  apiKey: "AIzaSyBo-v8vClhzOXFa_E_krZDdVOfXxkdG7Fc",
  authDomain: "reserhab.firebaseapp.com",
  projectId: "reserhab",
  storageBucket: "reserhab.firebasestorage.app",
  messagingSenderId: "867773059792",
  appId: "1:867773059792:web:adfca1cd4630a7fee504d5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Conectar a emuladores en desarrollo
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  console.log('Usando emuladores de Firebase')
}

// Habilitar persistencia offline
try {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistencia offline no soportada en múltiples pestañas')
      } else if (err.code === 'unimplemented') {
        console.warn('El navegador no soporta persistencia offline')
      }
    })
} catch (err) {
  console.error('Error al habilitar persistencia offline:', err)
}
