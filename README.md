# ReserHab

Sistema SaaS para gestionar reservas y operaciones de hoteles pequeños.

## Características principales

- Autenticación de usuarios con roles (admin, recepción)
- Gestión de reservas
- Panel de administración
- PWA (Progressive Web App)
- Despliegue continuo con GitHub Actions

## Configuración inicial

### Requisitos previos

- Node.js 18+
- npm 9+
- Firebase CLI
- Cuenta de Firebase con proyecto configurado

### Configuración del entorno de desarrollo

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/reserhab.git
   cd reserhab
   ```

2. Instalar dependencias del frontend:
   ```bash
   cd web/app
   npm install
   ```

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env.local`
   - Actualizar con tus credenciales de Firebase

### Configurar usuario administrador

1. Instalar dependencias de los scripts de utilidad:
   ```bash
   cd scripts
   npm install
   ```

2. Ejecutar el script de configuración:
   ```bash
   npx ts-node setup-admin.ts
   ```

3. Seguir las instrucciones en pantalla para:
   - Proporcionar las credenciales de servicio de Firebase
   - Ingresar los datos del administrador
   - Confirmar la creación del usuario

## Despliegue

El despliegue se realiza automáticamente a través de GitHub Actions cuando se hace push a las ramas `main` o `develop`.

## Estructura del proyecto

```
reserhab/
├── scripts/               # Scripts de utilidad
├── web/                   # Frontend PWA
│   └── app/               # Aplicación React
│       ├── public/        # Archivos estáticos
│       └── src/           # Código fuente
│           ├── components # Componentes reutilizables
│           ├── contexts   # Contextos de React
│           ├── pages      # Componentes de página
│           └── services   # Servicios y lógica de negocio
└── firebase.json          # Configuración de Firebase
```

## Licencia

[MIT](LICENSE)
