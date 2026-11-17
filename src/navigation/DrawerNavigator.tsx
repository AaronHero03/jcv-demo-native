import { createDrawerNavigator } from '@react-navigation/drawer';
import DrawerContent from '../components/DrawerContent';
import PageScreen from '../screens/PageScreen';
import TabNavigator from './TabNavigator';
import { drawerPages, pages } from '../data/pages';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator();

// NIVEL 2 · DRAWER: envuelve a los tabs y agrega páginas secundarias que no caben en la barra inferior.
export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.white, drawerActiveTintColor: colors.navy, drawerActiveBackgroundColor: '#FFF4D6' }}
    >
      <Drawer.Screen name="Principal" component={TabNavigator} options={{ headerShown: false, drawerLabel: '🏠  Principal' }} />
      {drawerPages.map((id) => (
        <Drawer.Screen key={id} name={id} component={PageScreen} options={{ title: pages[id].title, drawerLabel: `${pages[id].emoji}  ${pages[id].title}` }} />
      ))}
    </Drawer.Navigator>
  );
}
