# Plan Individual — Genaro (Sistema de Filtrado, Comparativa AMG vs. Tec y UI del Asistente)

**Rol:** Exploración de Datos, Sistema de Filtrado, Comparativa AMG vs. Tec (Fase 1) y Pantalla del Asistente IA (Fase 2).

---

## Fase 1 — Sistema de Filtrado, Respaldo Offline y Comparativa AMG vs. Tec

**Ramas (PR hacia `dev`):** `genaro/sistema-filtrado-supabase`, `genaro/comparativa-amg-tec`

### 1. Capa de datos y sistema de filtrado (`genaro/sistema-filtrado-supabase`)
- [x] Actualizar `src/data/indicators.ts` / `src/data/indicatorSummaries.ts` y `src/data/filters.ts` para consultar los resúmenes desde Supabase mediante REST/RPC, usando `src/data/raw/bienestar_jovenes_2026_resumen.json` y `amg_2026_filtros_offline.json` como **respaldo automático sin internet** para la encuesta AMG.
- [x] Crear componente reutilizable de barra de filtros (`src/components/FilterBar.tsx`).
- [x] Conectar `HomeScreen.tsx`, `ExploreScreen.tsx` e `IndicatorDetailScreen.tsx` al sistema de filtrado y banner de estado (`DataStatusBanner.tsx`).

### 2. Comparativa Bienestar Joven AMG vs. Encuesta Externa Tec (`genaro/comparativa-amg-tec`)
- [x] Actualizar `CompareScreen.tsx` con comparativa **AMG 2026** vs. **Encuesta Tec** y entre grupos demográficos.

### 3. Construir `AsistenteScreen.tsx` (`genaro/asistente-chat-ui`)
- [x] Crear `src/screens/AsistenteScreen.tsx`, `src/services/askClient.ts` y conectarla en `src/navigation/TabStack.tsx` con renderizado seguro en `<Text>` (`T6`).
- [x] Agregar pruebas unitarias de Jest para `filters.ts`, `indicatorSummaries.ts`, `FilterBar.tsx`, `askClient.ts`, `AsistenteScreen.tsx`, `CompareScreen.tsx`, `HomeScreen.tsx`, `ExploreScreen.tsx`, `IndicatorDetailScreen.tsx`, `DataStatusBanner.tsx` y `useIndicatorStats.ts`.

**Dependencias en Fase 2:**
- Depende de Aaron (Edge Function `/ask`). Mientras se despliega en Supabase, puedes desarrollar toda la pantalla apuntando a `http://localhost:3001/ask` (`evals/ask-server.js`).
