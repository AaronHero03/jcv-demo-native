import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabStack from './TabStack';
import { tabs } from '../data/pages';
import { colors, tabTheme, type TabId } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Un componente fijo por pestaña (evita recrear el stack en cada render).
const stackFor = Object.fromEntries(tabs.map((t) => [t.id, () => <TabStack tab={t.id} />])) as Record<TabId, () => React.JSX.Element>;

// NIVEL 3 · BOTTOM TABS: Inicio, Explorar, Participar, Comunidad y Perfil (spec §5).
// Tocar la pestaña activa regresa a la raíz de su stack (comportamiento por defecto).
export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontWeight: '700' } }}>
      {tabs.map((t) => (
        <Tab.Screen
          key={t.id}
          name={`${t.id}Tab`}
          component={stackFor[t.id]}
          options={{
            title: t.label,
            tabBarActiveBackgroundColor: `${tabTheme[t.id].color}1A`,
            tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{t.emoji}</Text>,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
