# Nivel Gym - Sistema de Reservas

Sistema de reservas para gimnasio desarrollado en Next.js con TypeScript y Tailwind CSS.

## 🌟 Características

### Para Clientes
- **Reserva en 2 pasos**: Seleccionar fecha y luego horario/entrenador
- **Calendario interactivo** para selección de fechas
- **Grid de horarios** mostrando disponibilidad de entrenadores
- **Modales de confirmación** para un flujo de reserva profesional
- **Interfaz responsive** que funciona en todos los dispositivos

### Para Entrenadores
- **Registro de horario**: Configurar disponibilidad semanal de forma visual
- **Vista de citas**: Calendario semanal con todas las reservas
- **Gestión de especialización**: Categorización por tipo de entrenamiento
- **Dashboard intuitivo** con navegación por pestañas

## 🚀 Demo

El sitio está desplegado en GitHub Pages: [https://rcastillejo.github.io/nivel-ui](https://rcastillejo.github.io/nivel-ui)

## 🛠️ Tecnologías

- **Next.js 16** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Styling utility-first
- **React DatePicker** - Selección de fechas
- **date-fns** - Manipulación de fechas
- **GitHub Pages** - Hosting estático

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/rcastillejo/nivel-ui.git
cd nivel-ui

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Abrir en el navegador
open http://localhost:3000
```

## 🏗️ Build y Despliegue

### Build Local
```bash
# Generar build estático
npm run build

# Los archivos estáticos se generan en la carpeta 'out'
```

### Despliegue en GitHub Pages
```bash
# Desplegar directamente (requiere configuración de gh-pages)
npm run deploy
```

### Despliegue Automático
El proyecto está configurado con GitHub Actions para despliegue automático:
- Se ejecuta al hacer push a la rama `main`
- Construye la aplicación estáticamente
- Despliega automáticamente en GitHub Pages

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                 # Página principal
│   ├── trainer/
│   │   └── page.tsx            # Dashboard del entrenador
│   └── layout.tsx              # Layout principal
├── components/
│   ├── BookingWizard.tsx       # Flujo de reservas para clientes
│   ├── CalendarStep.tsx        # Paso 1: Selección de fecha
│   ├── TimeGridStep.tsx        # Paso 2: Selección de horario
│   ├── ConfirmationModal.tsx   # Modal de confirmación de reserva
│   ├── SuccessModal.tsx        # Modal de reserva exitosa
│   └── trainer/
│       ├── TrainerSchedule.tsx     # Registro de horarios
│       ├── TrainerAppointments.tsx # Vista de citas
│       ├── SaveScheduleModal.tsx   # Modal de confirmación de horario
│       └── ScheduleSavedModal.tsx  # Modal de horario guardado
```

## 🎯 Funcionalidades Implementadas

### ✅ Sistema de Reservas (Cliente)
- [x] Selección de fecha con calendario
- [x] Grid de horarios por entrenador
- [x] Modal de confirmación de reserva
- [x] Modal de éxito con detalles
- [x] Validaciones de formulario
- [x] Interfaz responsive

### ✅ Panel del Entrenador
- [x] Registro de horarios semanales
- [x] Vista de citas en calendario
- [x] Modal de confirmación para guardar horario
- [x] Modal de éxito al guardar
- [x] Navegación entre secciones
- [x] Datos mock para demo

### ✅ Configuración y Despliegue
- [x] Configuración para exportación estática
- [x] GitHub Actions para CI/CD
- [x] Optimización para GitHub Pages
- [x] Build automático y despliegue

## 🎨 Diseño

- **Estilo**: Minimalista y profesional
- **Colores**: Azul primario con acentos verdes para confirmaciones
- **Tipografía**: System fonts para mejor rendimiento
- **Iconos**: Heroicons SVG integrados
- **Layout**: Responsive con breakpoints móvil/tablet/desktop

## 📱 Responsive Design

- **Móvil (< 768px)**: Layout de una columna, navegación optimizada
- **Tablet (768px - 1024px)**: Layout de dos columnas para formularios
- **Desktop (> 1024px)**: Layout completo con todas las características

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run start        # Servidor de producción local
npm run lint         # Linting con ESLint
npm run export       # Exportación estática
npm run deploy       # Despliegue a GitHub Pages
```

## 🌐 Configuración de GitHub Pages

El proyecto está configurado para despliegue automático en GitHub Pages:

1. **Base Path**: `/nivel-ui` para el repositorio GitHub
2. **Static Export**: Generación de archivos estáticos
3. **GitHub Actions**: Workflow automático en `.github/workflows/deploy.yml`
4. **Asset Optimization**: Imágenes y recursos optimizados

## 🚀 Próximas Mejoras

- [ ] Integración con backend real (API)
- [ ] Autenticación de usuarios
- [ ] Notificaciones por email
- [ ] Sistema de pagos
- [ ] Historial de reservas
- [ ] Cancelación de citas
- [ ] Ratings y reviews
- [ ] Panel de administración

## 📄 Licencia

Este proyecto es un prototipo desarrollado para demostración.

---

Desarrollado con ❤️ por [Ricardo Castillejo](https://github.com/rcastillejo)
