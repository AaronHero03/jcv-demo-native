import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import DrawerNavigator from './DrawerNavigator';

const Stack = createNativeStackNavigator();

// NIVEL 1 · STACK RAÍZ: Bienvenida → App. Separa el acceso (entrar/registrarse) del resto de la app.
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Main" component={DrawerNavigator} />
    </Stack.Navigator>
  );
}
