import { StatusBar } from 'expo-status-bar';
import { createNavigationContainerRef, NavigationContainer, type ParamListBase } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppStateContext';
import InactivityLockGate from './src/components/InactivityLockGate';
import RootNavigator from './src/navigation/RootNavigator';

const navigationRef = createNavigationContainerRef<ParamListBase>();

// Punto de entrada: proveedores globales. Toda la navegación vive en src/navigation.
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <InactivityLockGate
            onLogoutNavigate={() => {
              if (navigationRef.isReady()) {
                navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              }
            }}
          >
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
          </InactivityLockGate>
        </AppStateProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
