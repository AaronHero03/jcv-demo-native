import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Hero from '../components/Hero';
import NavRow from '../components/NavRow';
import { useAppState } from '../context/AppStateContext';
import { colors, tabTheme } from '../theme/colors';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { userMode, userEmail, userRole, isTecVerified, favoriteIds, completedSurveyIds } = useAppState();
  const theme = tabTheme.perfil;

  const roleBadge = userRole === 'admin' ? ' · 🛡️ Admin' : isTecVerified ? ' · 🎓 Verificado TEC' : '';
  const statusText =
    userMode === 'user' && userEmail
      ? `${userEmail}${roleBadge}`
      : 'Modo invitado (sin cuenta)';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Hero
        page={{
          emoji: '👤',
          title: userMode === 'user' ? 'Mi Perfil' : 'Invitado',
          text: statusText,
        }}
        color={theme.color}
        ink={theme.ink}
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{favoriteIds.length}</Text>
          <Text style={styles.statLabel}>Favoritos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedSurveyIds.length}</Text>
          <Text style={styles.statLabel}>Encuestas</Text>
        </View>
      </View>

      <View style={styles.links}>
        <NavRow
          emoji="⭐"
          label="Mis favoritos"
          tint={theme.color}
          onPress={() => navigation.push('favoritos', { tab: 'perfil' })}
        />
        <NavRow
          emoji="🎓"
          label={isTecVerified ? 'Verificación TEC (Completada)' : 'Verificación TEC'}
          tint={theme.color}
          onPress={() => navigation.push('verificacion', { tab: 'perfil' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  links: { gap: 10 },
});
