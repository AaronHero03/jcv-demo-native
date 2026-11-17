import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuButton from '../components/MenuButton';
import PageScreen from '../screens/PageScreen';
import { pages, tabStacks } from '../data/pages';
import { tabTheme, type TabId } from '../theme/colors';

const Stack = createNativeStackNavigator();

// NIVEL 4 · STACK: cada pestaña tiene su propia pila, así conserva su historial al cambiar de pestaña.
export default function TabStack({ tab }: { tab: TabId }) {
  const theme = tabTheme[tab];
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.color }, headerTintColor: theme.ink, headerTitleStyle: { fontWeight: '700' } }}>
      {tabStacks[tab].map((id, i) => (
        <Stack.Screen
          key={id}
          name={id}
          component={PageScreen}
          initialParams={{ tab }}
          // La raíz muestra ☰ (drawer); las demás muestran ← automáticamente (pop).
          options={{ title: pages[id].title, headerLeft: i === 0 ? () => <MenuButton color={theme.ink} /> : undefined }}
        />
      ))}
    </Stack.Navigator>
  );
}
