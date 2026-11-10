# Development Guide

## CI/CD Local Validation

Este proyecto incluye scripts y configuraciones para ejecutar las mismas validaciones del CI pipeline localmente antes de hacer commits.

### Scripts Disponibles

#### Validaciones Básicas
```bash
npm run validate          # Ejecuta tests, typecheck y lint
npm run validate:full     # Ejecuta validate + build en producción
npm run typecheck         # Solo verificación de TypeScript
```

#### Verificaciones Individuales
```bash
npm run test:run          # Ejecuta todos los tests una vez
npm run lint              # Ejecuta ESLint
npm run build             # Construye el proyecto en modo producción
```

### Git Hooks Automáticos

El proyecto está configurado con **Husky** para ejecutar validaciones automáticamente:

#### Pre-commit Hook
```bash
# Se ejecuta automáticamente antes de cada commit
npm run precommit         # Equivalente a: npm run validate
```
Verifica:
- ✅ Tests unitarios y de integración
- ✅ TypeScript (sin errores de compilación)
- ✅ ESLint (sin errores, warnings permitidos)

#### Pre-push Hook
```bash
# Se ejecuta automáticamente antes de cada push
npm run prepush          # Equivalente a: npm run validate:full
```
Verifica todo lo anterior más:
- ✅ Build en modo producción

### Uso Recomendado

#### Flujo de Desarrollo Normal
1. Hace cambios en el código
2. `git add .` 
3. `git commit -m "tu mensaje"` - Las validaciones se ejecutan automáticamente
4. `git push` - Se ejecuta la validación completa incluyendo el build

#### Validación Manual Antes de Commit
```bash
# Para verificar rápidamente si todo está ordenado
npm run validate

# Para validación completa (igual al CI)
npm run validate:full
```

#### Omitir Hooks (en casos excepcionales)
```bash
# NO RECOMENDADO - Solo para commits urgentes o debugging
git commit --no-verify -m "mensaje"
git push --no-verify
```

### Comparación con CI Pipeline

| Validación | Local Pre-commit | Local Pre-push | GitHub Actions CI |
|------------|------------------|----------------|-------------------|
| Tests      | ✅               | ✅             | ✅                |
| Typecheck  | ✅               | ✅             | ✅                |
| Lint       | ✅               | ✅             | ✅                |
| Build      | ❌               | ✅             | ✅                |

### Ventajas de Validación Local

- **Feedback rápido**: Detectas errores sin esperar al CI
- **Menos re-trabajos**: Evitas commits fallidos
- **Productividad**: No interrumpe tu flujo de desarrollo
- **Calidad**: Mantiene el mismo estándar que el CI

### Configuración

Los git hooks están en:
- `.husky/pre-commit` - Ejecuta `npm run precommit`
- `.husky/pre-push` - Ejecuta `npm run prepush`

Los scripts están definidos en `package.json` en la sección `"scripts"`.

### Troubleshooting

#### Si un hook falla:
1. Revisa el output del comando fallido
2. Corrige los errores indicados
3. Vuelve a intentar el commit/push

#### Si necesitas hacer cambios urgentes:
```bash
# Último recurso - omite las validaciones
git commit --no-verify -m "fix urgente"
```

#### Si los hooks no se ejecutan:
```bash
# Reinstalar husky
npm install --save-dev husky
npx husky init
chmod +x .husky/pre-commit .husky/pre-push
## Edge Function `bookings` (reservar y cancelar citas)

Las reglas de negocio de reservar y cancelar (anticipación mínima de 1 h en gym / 24 h en
gabinete, devolución de la sesión del programa, instante UTC `starts_at`) se ejecutan en el
backend como una **Supabase Edge Function**. La función reutiliza `src/core` sin cambios: se
empaqueta con esbuild en un único archivo (`supabase/functions/bookings/index.js`, generado y
no versionado).

```bash
npm run build:functions        # genera supabase/functions/bookings/index.js
supabase start                 # stack local (Docker)
supabase functions serve       # sirve la función en http://127.0.0.1:54321/functions/v1/bookings
```

- Código: `src/server/` (handler HTTP, autenticación) y `src/core/models/BookingCommandsModel.ts`.
- La función es la única que escribe reservas con el service role. Sin Supabase configurado
  (modo local) la app ejecuta los mismos casos de uso en el navegador (`LocalBookingCommands`).
- Tras cambiar `src/core` o `src/server`, vuelve a ejecutar `npm run build:functions`.

### Puesta en producción (orden obligatorio)

1. Mergear: `supabase-migrate.yml` aplica `20261110000000_bookings_starts_at.sql` (aditiva).
2. `supabase-functions.yml` despliega la función. Verifica reservar y cancelar con una cuenta de cliente.
3. Desplegar la app (Vercel) que llama a la función.
4. **Recién entonces**, aplicar a mano `supabase/cutover/20261110_bookings_close_direct_writes.sql`
   (cierra las escrituras directas del cliente). Aplicarlo antes impide reservar y cancelar.
