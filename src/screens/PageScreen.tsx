import { ScrollView } from 'react-native';
import { useNavigation, useRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Hero from '../components/Hero';
import NavRow from '../components/NavRow';
import { pages, type PageId } from '../data/pages';
import { colors, tabTheme, type TabId } from '../theme/colors';

// Una sola pantalla genérica: lee su contenido de data/pages.ts según el nombre de la ruta.
export default function PageScreen() {
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const page = pages[route.name as PageId];
  const tab = (route.params as { tab?: TabId } | undefined)?.tab;
  const theme = tabTheme[tab ?? 'drawer'];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Hero page={page} color={theme.color} ink={theme.ink} />
      {page.links?.map(([label, to]) => (
        // push = apilar una pantalla nueva encima; la flecha ← del header hace pop.
        <NavRow key={label} emoji={pages[to].emoji} label={label} tint={theme.color} onPress={() => navigation.push(to, { tab })} />
      ))}
    </ScrollView>
  );
}
