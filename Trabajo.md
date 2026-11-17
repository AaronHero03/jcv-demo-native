# Plan de Desarrollo — Fase 2: Pantallas Funcionales con Integración de Datos Reales

Este documento define el plan de trabajo para la **siguiente fase lógica** de **Jalisco Cómo Vamos (`jcv-demo-native`)**, estructurado para ser ejecutado por agentes de desarrollo y dividido entre **Genaro** y **Aaron**.

---

## 1. Objetivo y Alcance de la Fase

Actualmente la aplicación cuenta con una arquitectura de navegación completa en 4 niveles (`RootNavigator` → `DrawerNavigator` → `TabNavigator` → `TabStack`), pero todas las pantallas internas son vistas genéricas (`PageScreen.tsx`) alimentadas por textos estáticos en `src/data/pages.ts`.

El objetivo de la **Fase 2** es reemplazar las pantallas genéricas principales por **pantallas reales e interactivas**, integrando directamente los **datos reales disponibles** (indicadores, municipios, encuestas, noticias/comunidad) junto con **estado local en memoria (React Context)** para las acciones del usuario.

### Dentro del alcance
- **Ingesta y normalización de datos reales:** Adaptadores tipados en TypeScript para transformar los datos reales (archivos JSON/TS locales o respuestas de API de solo lectura) al modelo de la app.
- **Estado global de aplicación en memoria:** Sesión demo/invitado, favoritos, encuestas completadas y comentarios agregados en foro durante la sesión.
- **Pantallas interactivas** para las 5 pestañas principales (`Inicio`, `Explorar`, `Participar`, `Comunidad`, `Perfil`) y sus subpantallas de flujo, mostrando información real.
- **Manejo de casos reales de datos:** Estados vacíos, valores faltantes (`null`/`undefined`), etiquetas largas y distintas unidades (`%`, promedios, escalas).
- **Componentes visuales reutilizables** (tarjetas, gráficas de barras en React Native puro, chips de filtro, formularios).

### Fuera de alcance (fases posteriores)
- Escritura en backend remoto (persistencia en base de datos de respuestas de encuestas, comentarios del foro o favoritos en la nube).
- Autenticación real (OAuth, JWT, Firebase/Supabase).
- Mapas geográficos nativos (`react-native-maps`) o librerías con código nativo que requieran rebuild.
- Asistente conversacional con IA o entrada de voz real (`asistente` se mantiene como pantalla informativa o acceso rápido).
- Funcionalidad del panel de `Administración` y páginas informativas del Drawer (`Acerca de`, `Metodología`, `Privacidad`, `Ayuda`), que seguirán usando `PageScreen.tsx`.

---

## 2. Reglas para los Agentes

Antes de escribir código, todo agente asignado a una tarea debe cumplir con lo siguiente:

1. **Stack y navegación:** El proyecto usa **Expo SDK 58**, **React Native 0.88** y **React Navigation 7** (no usar `expo-router`). Respetar la jerarquía en `src/navigation/`.
2. **Estilos y tema:** Usar exclusivamente la paleta definida en `src/theme/colors.ts` (`colors` y `tabTheme`). Mantener el estilo visual limpio, tarjetas redondeadas y buen contraste.
3. **Sin dependencias nativas nuevas:** Implementar gráficas, selectores y formularios con componentes nativos de React Native (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `FlatList`).
4. **Fidelidad de los datos:** No inventar cifras ni modificar métricas reales; si un campo real viene vacío o sin desagregación municipal, mostrar un estado claro (p. ej. `"Sin dato disponible"`).
5. **Cero conflictos entre ramas:** Respetar estrictamente la propiedad de archivos asignada a cada desarrollador. El punto de unión será únicamente el contrato de tipos/contexto y la conexión final en `App.tsx` y `src/navigation/TabStack.tsx`.
6. **Verificación obligatoria:** Antes de dar por terminada cualquier tarea, ejecutar:
   ```bash
   npx tsc --noEmit
   ```
   y confirmar que no existan errores de tipos.

---

## 3. Contrato Compartido (Punto de Sincronización)

Para que **Genaro** y **Aaron** trabajen en paralelo sin bloquearse, ambos deben respetar la siguiente interfaz del estado global que expondrá `src/context/AppStateContext.tsx`:

```ts
export interface AppStateContextValue {
  // Sesión simulada
  userMode: 'guest' | 'user';
  userEmail: string | null;
  isTecVerified: boolean;
  loginAsGuest: () => void;
  loginAsUser: (email?: string) => void;
  verifyTecEmail: (email: string) => boolean;
  logout: () => void;

  // Favoritos (IDs reales de indicadores o noticias)
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Encuestas
  completedSurveyIds: string[];
  submitSurvey: (surveyId: string, answers: Record<string, string>) => void;

  // Foro
  addForumReply: (topicId: string, author: string, text: string) => void;
}
```

> **Nota para Genaro:** Si se trabaja en paralelo antes de que `AppStateContext.tsx` esté fusionado, Genaro puede consumir `useAppState()` asumiendo esta firma exacta o crear un stub temporal que luego se elimina al integrar.

---

## 4. División de Trabajo

### Bloque A — Genaro: Integración de Datos Reales e Indicadores

**Responsabilidad:** Conectar los datos reales de indicadores de Jalisco Cómo Vamos y dar vida al núcleo analítico (`Inicio`, `Explorar`, `Indicador`, `Comparar A/B`, `Mapa municipal`).

#### Archivos a crear / modificar
- `src/data/raw/` *(carpeta opcional para colocar los JSON/datasets reales si son archivos locales)*
- `src/data/indicators.ts` *(adaptador y catálogo tipado a partir de los datos reales)*
- `src/components/BarChart.tsx` *(nuevo)*
- `src/components/IndicatorCard.tsx` *(nuevo)*
- `src/screens/HomeScreen.tsx` *(nuevo — reemplaza `inicio`)*
- `src/screens/ExploreScreen.tsx` *(nuevo — reemplaza `explorar`)*
- `src/screens/IndicatorDetailScreen.tsx` *(nuevo — reemplaza `indicador`)*
- `src/screens/CompareScreen.tsx` *(nuevo — reemplaza `comparar`)*
- `src/screens/MapMockScreen.tsx` *(nuevo — reemplaza `mapa`)*

#### Tareas detalladas
1. **Ingesta y normalización (`src/data/indicators.ts`):**
   - Definir las interfaces `Indicator`, `MunicipalityResult` y las categorías reales presentes en el dataset.
   - Mapear/normalizar los datos reales (ya sea importando archivos de `src/data/raw/` o transformando la estructura real) para exponer arreglos y helpers (`getIndicatorById`, `getIndicatorsByCategory`, `searchIndicators`).
   - Contemplar valores opcionales o faltantes en municipios/series sin romper el renderizado.
2. **Componentes visuales (`BarChart.tsx`, `IndicatorCard.tsx`):**
   - `BarChart`: Gráfica de barras horizontal construida con `View` y porcentajes dinámicos, soportando distintas escalas/unidades reales (`%`, promedio, puntaje) y modo comparativo (A vs B).
   - `IndicatorCard`: Tarjeta con categoría, título, dato destacado real, periodo y botón de favorito (`⭐` / `☆`).
3. **Pantalla `HomeScreen.tsx` (`Inicio`):**
   - Mostrar saludo según modo (`Invitado` o `Usuario`), sección de **Indicadores destacados** reales (navegables a `indicador` pasando `{ tab: 'inicio', indicatorId }`), acceso directo a encuesta vigente (navegación a tab `participarTab`) y acceso rápido al asistente.
4. **Pantalla `ExploreScreen.tsx` (`Explorar`):**
   - Barra de búsqueda (`TextInput`) que filtre los indicadores reales por título, pregunta o descripción.
   - Chips horizontales generados dinámicamente a partir de las categorías reales del dataset.
   - Listado con `FlatList` (para buen rendimiento si el catálogo real es grande) y estado vacío amigable cuando no haya coincidencias.
5. **Pantalla `IndicatorDetailScreen.tsx` (`Indicador`):**
   - Leer `indicatorId` de `route.params` (con fallback al primer indicador).
   - Mostrar pregunta exacta, gráfica (`BarChart`), fuente oficial, periodo y notas metodológicas si existen en los datos reales.
   - Botón para **Guardar en Favoritos** conectado a `toggleFavorite(indicator.id)`.
   - Botones de acción (`NavRow`) para ir a `comparar` y `mapa` pasando el `indicatorId`.
6. **Pantalla `CompareScreen.tsx` (`Comparar A/B`):**
   - Permitir seleccionar un indicador real y dos grupos/municipios disponibles en ese indicador (Selector A y Selector B).
   - Renderizar la comparación visual lado a lado usando `BarChart` y calcular la diferencia entre A y B (manejando el caso en que alguno no tenga dato).
7. **Pantalla `MapMockScreen.tsx` (`Mapa municipal`):**
   - Selector de indicador + listado ordenado por municipio con los valores reales disponibles y barra/indicador visual de desempeño.

---

### Bloque B — Aaron: Estado Global, Participación, Comunidad y Perfil

**Responsabilidad:** Implementar el estado compartido de la app, la experiencia de usuario/sesión e integrar los datos reales de encuestas, noticias y comunidad.

#### Archivos a crear / modificar
- `src/context/AppStateContext.tsx` *(nuevo)*
- `src/data/surveys.ts` *(adaptador/datos reales de encuestas)*
- `src/data/community.ts` *(adaptador/datos reales de noticias y foro)*
- `src/screens/WelcomeScreen.tsx` *(modificar)*
- `src/components/DrawerContent.tsx` *(modificar)*
- `src/screens/ParticipateScreen.tsx` *(nuevo — reemplaza `participar`)*
- `src/screens/SurveyScreen.tsx` *(nuevo — reemplaza `encuesta`)*
- `src/screens/CommunityScreen.tsx` *(nuevo — reemplaza `comunidad`)*
- `src/screens/NewsScreen.tsx` *(nuevo — reemplaza `noticias`)*
- `src/screens/ForumScreen.tsx` *(nuevo — reemplaza `foro`)*
- `src/screens/TopicScreen.tsx` *(nuevo — reemplaza `tema`)*
- `src/screens/ProfileScreen.tsx` *(nuevo — reemplaza `perfil`)*
- `src/screens/FavoritesScreen.tsx` *(nuevo — reemplaza `favoritos`)*
- `src/screens/VerificationScreen.tsx` *(nuevo — reemplaza `verificacion`)*

#### Tareas detalladas
1. **Estado global (`src/context/AppStateContext.tsx`):**
   - Implementar `AppStateProvider` y hook `useAppState()` cumpliendo exactamente el **Contrato Compartido** de la Sección 3.
   - Inicializar el foro con los temas/respuestas reales cargados desde `community.ts`, permitiendo agregar nuevas respuestas en memoria durante la sesión.
2. **Acceso y cierre de sesión (`WelcomeScreen.tsx`, `DrawerContent.tsx`):**
   - En `WelcomeScreen.tsx`: conectar `Explorar sin cuenta` a `loginAsGuest()` y `Iniciar sesión` a `loginAsUser('ciudadano@jalisco.mx')` antes de ejecutar `navigation.replace('Main')`.
   - En `DrawerContent.tsx`: al presionar `Cerrar sesión`, ejecutar `logout()` además de `StackActions.replace('Welcome')`.
3. **Módulo Participar (`surveys.ts`, `ParticipateScreen.tsx`, `SurveyScreen.tsx`):**
   - Normalizar en `surveys.ts` las encuestas reales (título, descripción, preguntas y opciones).
   - `ParticipateScreen`: listar encuestas separando visualmente **Disponibles** de **Completadas** (usando `completedSurveyIds`).
   - `SurveyScreen`: recibir `surveyId`, permitir seleccionar respuestas por pregunta, validar que estén contestadas, llamar a `submitSurvey(...)` y navegar a `enviada`.
4. **Módulo Comunidad (`community.ts`, `CommunityScreen.tsx`, `NewsScreen.tsx`, `ForumScreen.tsx`, `TopicScreen.tsx`):**
   - Integrar las noticias y temas reales en `community.ts`.
   - `CommunityScreen`: resumen con accesos a Noticias recientes y Temas activos del Foro.
   - `NewsScreen`: tarjetas de noticias reales con resumen editorial, medio, fecha y botón de favorito (`toggleFavorite`).
   - `ForumScreen`: lista de temas con contador de respuestas y navegación a `tema` pasando `topicId`.
   - `TopicScreen`: publicación principal, lista de comentarios y un campo `TextInput` + botón `Publicar` para añadir una nueva respuesta al hilo usando `addForumReply`.
5. **Módulo Perfil (`ProfileScreen.tsx`, `FavoritesScreen.tsx`, `VerificationScreen.tsx`):**
   - `ProfileScreen`: mostrar estado de cuenta (`Invitado` vs `Usuario`), insignia de verificación TEC si aplica, resumen numérico (cantidad de favoritos y encuestas respondidas) y accesos a `favoritos` y `verificacion`.
   - `FavoritesScreen`: leer `favoriteIds` del contexto y cruzarlos con los datos reales de indicadores (`indicators.ts`) y noticias (`community.ts`), permitiendo quitar favoritos desde la lista.
   - `VerificationScreen`: formulario con `TextInput` para correo institucional; validar dominio `@tec.mx` (o el dominio institucional requerido), actualizar `isTecVerified` mediante `verifyTecEmail` y mostrar confirmación visual o mensaje de error.

---

## 5. Orden de Ejecución e Integración

### Paso 0 — Incorporación de los Datasets Reales
- Colocar los archivos de datos reales (JSON/TS) en `src/data/raw/` (o definir las URLs/fuentes si se consumen vía servicio) y validar qué campos trae cada entidad (indicadores, encuestas, noticias, foro) para alinear las interfaces de `indicators.ts`, `surveys.ts` y `community.ts`.

### Paso 1 — Base de Contrato
- Aaron crea `src/context/AppStateContext.tsx` y lo envuelve en `App.tsx` alrededor de `NavigationContainer`.

### Paso 2 — Desarrollo en Paralelo
- **Genaro** implementa todo el **Bloque A** (adaptador de indicadores reales + 5 pantallas + 2 componentes).
- **Aaron** implementa todo el **Bloque B** (adaptadores reales de encuestas/comunidad + actualización de Welcome/Drawer + 9 pantallas de Participar, Comunidad y Perfil).

### Paso 3 — Conexión en `src/navigation/TabStack.tsx`
Una vez completados ambos bloques, actualizar `TabStack.tsx` para mapear cada `PageId` a su componente correspondiente en lugar de usar `PageScreen` para todas las rutas:

- `inicio` → `HomeScreen`
- `explorar` → `ExploreScreen`
- `indicador` → `IndicatorDetailScreen`
- `comparar` → `CompareScreen`
- `mapa` → `MapMockScreen`
- `participar` → `ParticipateScreen`
- `encuesta` → `SurveyScreen`
- `comunidad` → `CommunityScreen`
- `noticias` → `NewsScreen`
- `foro` → `ForumScreen`
- `tema` → `TopicScreen`
- `perfil` → `ProfileScreen`
- `favoritos` → `FavoritesScreen`
- `verificacion` → `VerificationScreen`
- *Resto (`asistente`, `enviada` y páginas del Drawer)* → mantienen `PageScreen`.

---

## 6. Criterios de Aceptación (Definition of Done)

La Fase 2 se considera terminada cuando:
- [ ] `npx tsc --noEmit` termina con **0 errores**.
- [ ] La app inicia en Expo (`npx expo start`) sin pantallas rojas ni advertencias críticas de navegación.
- [ ] Todos los indicadores, municipios, encuestas y noticias mostrados corresponden a los **datos reales integrados** (sin datos ficticios residuales).
- [ ] Es posible buscar un indicador en `Explorar`, abrir su detalle, marcarlo como favorito y verlo reflejado en `Perfil → Favoritos`.
- [ ] Es posible comparar dos municipios en `Comparar A/B` y ver el desglose en `Mapa municipal`, manejando correctamente municipios sin dato.
- [ ] Es posible responder una encuesta en `Participar`, enviarla y verla marcada como completada.
- [ ] Es posible publicar un comentario nuevo en un hilo del `Foro` y verlo aparecer en la conversación.
- [ ] Es posible simular la verificación de correo `@tec.mx` en `Verificación TEC` y ver la insignia actualizada en `Perfil`.
- [ ] Al cerrar sesión desde el Drawer, el estado se reinicia y se regresa a `WelcomeScreen`.
