import * as admin from 'firebase-admin';
import * as readline from 'readline';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

// Configurar interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  try {
    console.log('=== Configuración de Usuario Administrador para ReserHab ===\n');
    
    // Solicitar credenciales de Firebase
    console.log('Para continuar, necesitamos las credenciales de servicio de Firebase.');
    console.log('1. Ve a Firebase Console > Configuración del proyecto > Cuentas de servicio');
    console.log('2. Haz clic en "Generar nueva clave privada"');
    console.log('3. Guarda el archivo JSON en la carpeta del proyecto\n');
    
    let serviceAccountPath = await prompt('Ruta al archivo de credenciales de servicio (o arrástralo aquí): ');
    
    // Limpiar la ruta si se arrastró el archivo
    serviceAccountPath = serviceAccountPath.trim().replace(/^['"]|['"]$/g, '');
    
    if (!existsSync(serviceAccountPath)) {
      console.error('Error: El archivo de credenciales no existe.');
      rl.close();
      return;
    }
    
    // Cargar credenciales
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    // Inicializar Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    
    // Solicitar datos del administrador
    console.log('\n=== Datos del Administrador ===');
    const email = await prompt('Correo electrónico: ');
    const password = await prompt('Contraseña (mínimo 6 caracteres): ');
    const displayName = await prompt('Nombre para mostrar: ');
    
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Crear usuario en Firebase Auth
    console.log('\nCreando usuario administrador...');
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
    
    console.log(`✅ Usuario creado exitosamente: ${userRecord.uid}`);
    
    // Establecer rol de administrador en Firestore
    const db = admin.firestore();
    const userDoc = db.doc(`hotels/default/users/${userRecord.uid}`);
    
    await userDoc.set({
      uid: userRecord.uid,
      email,
      displayName,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Rol de administrador asignado correctamente');
    console.log('\n=== Configuración completada ===');
    console.log(`Correo: ${email}`);
    console.log(`Contraseña: ${'*'.repeat(password.length)}`);
    console.log('\nGuarda esta información en un lugar seguro.');
    
  } catch (error) {
    console.error('\n❌ Error durante la configuración:');
    console.error(error.message || error);
  } finally {
    rl.close();
  }
}

// Ejecutar script
main().catch(console.error);
