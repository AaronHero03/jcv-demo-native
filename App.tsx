import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppStateContext';
import InactivityLockGate from './src/components/InactivityLockGate';
import RootNavigator from './src/navigation/RootNavigator';

// Punto de entrada: proveedores globales. Toda la navegación vive en src/navigation.
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <InactivityLockGate>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </InactivityLockGate>
        </AppStateProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
