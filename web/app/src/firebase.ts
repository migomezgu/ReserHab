import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

// Configuración de Firebase - Reemplaza con tus valores reales
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "reserhab.firebaseapp.com",
  projectId: "reserhab",
  storageBucket: "reserhab.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

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
