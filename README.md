# Jalisco Cómo Vamos · Demo de navegación (React Native)

Demo sin funcionalidad: solo muestra la navegación básica (**stack**, **drawer** y **bottom tabs**) definida en el spec (§5).

Hecha con **Expo SDK 58** y **React Navigation 7**.

## Cómo correrla

```bash
npm install
npx expo start
```

Escanea el QR con **Expo Go** (Android/iOS), o presiona `w` para abrirla en el navegador.

## Estructura de archivos y por qué

```
App.tsx                      Entrada: solo proveedores globales (gestos, safe area, NavigationContainer)
src/
├── navigation/              CÓMO se mueve el usuario. Un archivo por nivel de navegación:
│   ├── RootNavigator.tsx      1. Stack raíz:   Bienvenida → App
│   ├── DrawerNavigator.tsx    2. Drawer:       App principal + páginas secundarias
│   ├── TabNavigator.tsx       3. Bottom tabs:  Inicio · Explorar · Participar · Comunidad · Perfil
│   └── TabStack.tsx           4. Stack por pestaña: Explorar → Indicador → Comparar…
├── screens/                 QUÉ se ve. Pantallas completas
│   ├── WelcomeScreen.tsx
│   └── PageScreen.tsx         Pantalla genérica: toma su contenido de data/
├── components/              Piezas visuales reutilizables (Hero, NavRow, MenuButton, DrawerContent)
├── data/
│   └── pages.ts             Contenido y mapa de navegación (qué pantalla lleva a cuál)
└── theme/
    └── colors.ts            Paleta del manual JCV y color de cada pestaña
```

**Ideas para explicarla:**

1. **La carpeta `navigation/` refleja la jerarquía de navegación.** Cada navegador está dentro del anterior: Stack raíz → Drawer → Tabs → Stack de cada pestaña. Leer los archivos del 1 al 4 es leer el árbol de la app.
2. **Navegación separada de pantallas.** `navigation/` decide *cómo* se llega; `screens/` decide *qué* se ve. Se puede cambiar una sin romper la otra.
3. **Contenido separado de la interfaz.** Para agregar una pantalla o un botón solo se edita `data/pages.ts`; no hace falta crear otro componente.
4. **Componentes reutilizables.** Todas las pantallas usan el mismo encabezado (`Hero`) y los mismos botones (`NavRow`), así la app se ve consistente.
5. **Tema centralizado.** Los colores de marca (spec §15) están en un solo archivo.

## Por qué cada tipo de navegación

| Tipo | Uso en la demo | Motivo (spec §5) |
|---|---|---|
| **Stack raíz** | Bienvenida → App, con `replace` | Al entrar, el botón atrás no regresa a la Bienvenida. Al cerrar sesión se vuelve a ella. |
| **Drawer** | Acerca de, Metodología, Privacidad, Ayuda, Administración | Son páginas secundarias que no caben en la barra inferior. |
| **Bottom tabs** | Inicio, Explorar, Participar, Comunidad, Perfil | Son los 5 destinos principales que pide el spec. |
| **Stack por pestaña** | Explorar → Indicador → Comparar / Mapa | Cada pestaña guarda su historial: si cambias de pestaña y regresas, sigues donde estabas. Tocar la pestaña activa vuelve a su raíz. |
