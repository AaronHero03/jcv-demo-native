# Plan Individual — Genaro (Sistema de Filtrado, Comparativa AMG vs. Tec y UI del Asistente)

**Rol:** Exploración de Datos, Sistema de Filtrado, Comparativa AMG vs. Tec (Fase 1) y Pantalla del Asistente IA (Fase 2).

---

## Fase 1 — Sistema de Filtrado, Respaldo Offline y Comparativa AMG vs. Tec

**Ramas (PR hacia `dev`):** `genaro/sistema-filtrado-supabase`, `genaro/comparativa-amg-tec`

### 1. Capa de datos y sistema de filtrado (`genaro/sistema-filtrado-supabase`)
- [ ] Actualizar `src/data/indicators.ts` para consultar los resúmenes desde Supabase mediante `get_filtered_indicator`, usando `src/data/raw/bienestar_jovenes_2026_resumen.json` y `amg_2026_summaries.json` como **respaldo automático sin internet** para la encuesta AMG.
- [ ] Crear componente reutilizable de barra de filtros (`dimension`, `gender`, `age_group`, `estrato`, `dataset_source`).
- [ ] Conectar `HomeScreen.tsx`, `ExploreScreen.tsx` e `IndicatorDetailScreen.tsx` al sistema de filtrado:
  - Búsqueda y filtros combinados.
  - Mensaje claro cuando no haya datos o se esté en modo *offline* (sin mostrar desglose por municipio no significativo).
  - Conectar botón de favoritos con `AppStateContext`.

### 2. Comparativa Bienestar Joven AMG vs. Encuesta Externa Tec (`genaro/comparativa-amg-tec`)
- [ ] Actualizar `CompareScreen.tsx` usando `compare_datasets(p_indicator_id, p_filter_type, p_filter_value)`.
- [ ] Soportar dos modos de comparación con `BarChart.tsx`:
  - **Modo 1:** **AMG 2026** vs. **Encuesta Tec** (actualizada en tiempo real).
  - **Modo 2:** Comparación entre grupos dentro de un mismo estudio (ej. `Hombre` vs. `Mujer`, `Estrato Alto` vs. `Bajo`).
- [ ] Manejar casos donde la encuesta Tec aún tenga pocos registros o falte un indicador.

**Dependencias en Fase 1:**
- Depende de Carlos (`src/types/database.ts`, funciones `get_filtered_indicator` y `compare_datasets`, y datos semilla `tec_2026`).
- Depende de Aaron solo para guardar favoritos en cuenta autenticada (las pantallas de lectura funcionan desde el Día 1 con el cliente/JSON).

---

## Fase 2 — Pantalla del Asistente IA

**Rama (PR hacia `dev`):** `genaro/asistente-chat-ui`

### 1. Construir `AsistenteScreen.tsx` (`genaro/asistente-chat-ui`)
- [ ] Crear `src/screens/AsistenteScreen.tsx` y conectarla en `src/navigation/TabStack.tsx` (reemplazando el placeholder de `'asistente'`).
- [ ] Enviar `{ question }` con el token de sesión del usuario hacia `/ask`.
- [ ] Mostrar la respuesta (`answer`) y las fuentes (`sources[]`).
- [ ] **Seguridad `T6`:** mostrar las respuestas únicamente dentro de componentes `<Text>` como texto plano (sin `WebView`, HTML ni apertura automática de links).
- [ ] Mostrar mensajes claros ante errores `413` (pregunta muy larga), `429` (demasiadas peticiones) y `503` (servicio no disponible).

**Dependencias en Fase 2:**
- Depende de Aaron (Edge Function `/ask`). Mientras se despliega en Supabase, puedes desarrollar toda la pantalla apuntando a `http://localhost:3001/ask` (`evals/ask-server.js`).
