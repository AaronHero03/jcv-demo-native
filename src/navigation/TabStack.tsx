import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuButton from '../components/MenuButton';
import CommunityScreen from '../screens/CommunityScreen';
import CompareScreen from '../screens/CompareScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ForumScreen from '../screens/ForumScreen';
import HomeScreen from '../screens/HomeScreen';
import IndicatorDetailScreen from '../screens/IndicatorDetailScreen';
import MapMockScreen from '../screens/MapMockScreen';
import NewsScreen from '../screens/NewsScreen';
import PageScreen from '../screens/PageScreen';
import ParticipateScreen from '../screens/ParticipateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SurveyScreen from '../screens/SurveyScreen';
import TopicScreen from '../screens/TopicScreen';
import VerificationScreen from '../screens/VerificationScreen';
import { pages, tabStacks, type PageId } from '../data/pages';
import { tabTheme, type TabId } from '../theme/colors';

const Stack = createNativeStackNavigator();

const screenByPageId: Partial<Record<PageId, ComponentType>> = {
  inicio: HomeScreen,
  explorar: ExploreScreen,
  indicador: IndicatorDetailScreen,
  comparar: CompareScreen,
  mapa: MapMockScreen,
  participar: ParticipateScreen,
  encuesta: SurveyScreen,
  comunidad: CommunityScreen,
  noticias: NewsScreen,
  foro: ForumScreen,
  tema: TopicScreen,
  perfil: ProfileScreen,
  favoritos: FavoritesScreen,
  verificacion: VerificationScreen,
};

// NIVEL 4 · STACK: cada pestaña tiene su propia pila, así conserva su historial al cambiar de pestaña.
export default function TabStack({ tab }: { tab: TabId }) {
  const theme = tabTheme[tab];
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.color }, headerTintColor: theme.ink, headerTitleStyle: { fontWeight: '700' } }}>
      {tabStacks[tab].map((id, i) => (
        <Stack.Screen
          key={id}
          name={id}
          component={screenByPageId[id] ?? PageScreen}
          initialParams={{ tab }}
          // La raíz muestra ☰ (drawer); las demás muestran ← automáticamente (pop).
          options={{ title: pages[id].title, headerLeft: i === 0 ? () => <MenuButton color={theme.ink} /> : undefined }}
        />
      ))}
    </Stack.Navigator>
  );
}
