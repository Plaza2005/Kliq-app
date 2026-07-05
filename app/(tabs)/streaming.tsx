import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';
import { useAppStore } from '../../lib/store';

const CATEGORIES = ['All', 'Movies', 'Series', 'Sports', 'Live', 'Originals'];

const MOCK_CONTENT = [
  { id: '1',  title: 'King of Boys 3',         type: 'Movie',   category: 'Movies',    year: '2025', rating: '8.2', duration: '2h 14m',    color: '#0A0A1E', genre: 'Drama',       isLive: false },
  { id: '2',  title: 'Gangs of Lagos S2',       type: 'Series',  category: 'Series',    year: '2025', rating: '8.7', duration: '8 episodes', color: '#0E0A1A', genre: 'Crime',       isLive: false },
  { id: '3',  title: 'AFCON 2025 Final',         type: 'Sport',   category: 'Live',      year: '2025', rating: '9.0', duration: 'LIVE',       color: '#0A0E1A', genre: 'Football',    isLive: true  },
  { id: '4',  title: 'Sugar Rush',              type: 'Movie',   category: 'Movies',    year: '2024', rating: '7.5', duration: '1h 48m',    color: '#0A1210', genre: 'Comedy',      isLive: false },
  { id: '5',  title: 'African Origins',          type: 'Series',  category: 'Originals', year: '2025', rating: '8.9', duration: '6 episodes', color: '#120A14', genre: 'Documentary', isLive: false },
  { id: '6',  title: 'Naija vs Ghana',           type: 'Sport',   category: 'Sports',    year: '2025', rating: '8.1', duration: '90m',        color: '#0A0E20', genre: 'Football',    isLive: false },
  { id: '7',  title: 'The Black Book',           type: 'Movie',   category: 'Movies',    year: '2024', rating: '7.8', duration: '2h 1m',     color: '#0E0A1E', genre: 'Thriller',    isLive: false },
  { id: '8',  title: 'Blood & Water S4',         type: 'Series',  category: 'Series',    year: '2025', rating: '8.3', duration: '10 episodes',color: '#0A1018', genre: 'Drama',       isLive: false },
  { id: '9',  title: 'Wizkid Live Concert',      type: 'Concert', category: 'Live',      year: '2025', rating: '9.5', duration: 'LIVE',       color: '#0A0E1C', genre: 'Music',       isLive: true  },
  { id: '10', title: 'Juju Stories',             type: 'Movie',   category: 'Originals', year: '2025', rating: '8.0', duration: '1h 32m',    color: '#0E0A18', genre: 'Horror',      isLive: false },
  { id: '11', title: 'Kizz Daniel: Afro Classic',type: 'Concert', category: 'Originals', year: '2025', rating: '8.8', duration: '1h 20m',    color: '#0A0A1E', genre: 'Music',       isLive: false },
  { id: '12', title: 'MTN Afrika Cup',           type: 'Sport',   category: 'Sports',    year: '2025', rating: '8.5', duration: '90m',        color: '#0E0A1A', genre: 'Basketball',  isLive: false },
];

function ContentCard({ item, onPress }: { item: typeof MOCK_CONTENT[0]; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.cardThumb, { backgroundColor: item.color }]}>
        <Text style={[styles.cardTypeLabel, { color: item.isLive ? Colors.accent : Colors.primary }]}>
          {item.type[0]}
        </Text>
        {item.isLive && (
          <View style={[styles.liveBadge, glowBox(Colors.accent, 4)]}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardMeta}>{item.genre} · ★ {item.rating}</Text>
    </TouchableOpacity>
  );
}

function LockedOverlay() {
  return (
    <View style={styles.lockedOverlay}>
      <View style={[styles.lockedCard, glowBorder(Colors.secondary)]}>
        <Text style={[styles.lockedIcon, glowText(Colors.secondary)]}>◈</Text>
        <Text style={styles.lockedTitle}>Premium Streaming</Text>
        <Text style={styles.lockedSub}>Upgrade to Tier 2 or higher to unlock premium streaming, movies, live sports and originals.</Text>
        <View style={[styles.lockedBadge, glowBox(Colors.secondary, 6)]}>
          <Text style={styles.lockedBadgeText}>Tier 2 — Creator · $9.99/mo</Text>
        </View>
      </View>
    </View>
  );
}

export default function StreamingScreen() {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<typeof MOCK_CONTENT[0] | null>(null);
  const tier = useAppStore((s) => s.tier);

  if (tier < 2) return <LockedOverlay />;

  const filtered = MOCK_CONTENT.filter((c) => category === 'All' || c.category === category);

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroBadge, glowBox(Colors.primary, 4)]}>
          <Text style={styles.heroBadgeText}>FEATURED</Text>
        </View>
        <Text style={styles.heroTitle}>King of Boys 3</Text>
        <Text style={styles.heroMeta}>Drama · 2025 · 2h 14m · ★ 8.2</Text>
        <View style={styles.heroActions}>
          <TouchableOpacity style={[styles.playBtn, glowBox(Colors.primary, 8)]}>
            <Text style={styles.playBtnText}>▶  Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.watchlistBtn}>
            <Text style={styles.watchlistText}>+ Watchlist</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <ContentCard item={item} onPress={() => setSelected(item)} />}
        ListFooterComponent={<View style={{ height: 80 }} />}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, glowBorder(Colors.primary)]}>
              <View style={[styles.modalThumb, { backgroundColor: selected.color }]}>
                <Text style={[styles.modalTypeLabel, glowText(selected.isLive ? Colors.accent : Colors.primary)]}>
                  {selected.type[0]}
                </Text>
                {selected.isLive && (
                  <View style={[styles.liveBadge, { top: 12, left: 12 }, glowBox(Colors.accent, 4)]}>
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <Text style={styles.modalMeta}>{selected.genre} · {selected.year} · ★ {selected.rating}</Text>
              <Text style={[styles.modalDuration, glowText(Colors.secondary)]}>{selected.duration}</Text>

              <TouchableOpacity style={[styles.watchBtn, glowBox(Colors.primary, 8)]} onPress={() => setSelected(null)}>
                <Text style={styles.watchBtnText}>▶  {selected.isLive ? 'Watch Live' : 'Watch Now'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => setSelected(null)}>
                <Text style={styles.addBtnText}>+ Add to Watchlist</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  lockedOverlay: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockedCard: {
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 28, alignItems: 'center', borderWidth: 1, borderColor: Colors.secondary,
    width: '100%', maxWidth: 340,
  },
  lockedIcon: { fontSize: 48, color: Colors.secondary, marginBottom: 16 },
  lockedTitle: { color: Colors.text, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 12, textAlign: 'center' },
  lockedSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  lockedBadge: {
    backgroundColor: Colors.secondaryGlow, borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.secondary,
  },
  lockedBadgeText: { color: Colors.secondary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },

  hero: { height: 220, backgroundColor: '#0A0A1E', justifyContent: 'flex-end', padding: 20, marginBottom: 16 },
  heroBadge: {
    backgroundColor: Colors.primaryGlow, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8,
    borderWidth: 1, borderColor: Colors.primary,
  },
  heroBadgeText: { color: Colors.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1.5 },
  heroTitle: { color: Colors.text, fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 4 },
  heroMeta: { color: Colors.textMuted, fontSize: 13, marginBottom: 14, fontFamily: 'Inter_400Regular' },
  heroActions: { flexDirection: 'row', gap: 12 },
  playBtn: {
    backgroundColor: Colors.primaryGlow, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.primary,
  },
  playBtnText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  watchlistBtn: {
    backgroundColor: Colors.surface, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  watchlistText: { color: Colors.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  catScroll: { marginBottom: 16, maxHeight: 40 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  catText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  catTextActive: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' },
  grid: { paddingHorizontal: 16 },
  card: { flex: 1 },
  cardThumb: {
    height: 110, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, overflow: 'hidden', position: 'relative',
  },
  cardTypeLabel: { fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', opacity: 0.5 },
  liveBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.accent,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  liveText: { color: Colors.accent, fontSize: 9, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1 },
  cardTitle: { color: Colors.text, fontSize: 11, fontFamily: 'Inter_600SemiBold', lineHeight: 15 },
  cardMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  modalThumb: { height: 180, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  modalTypeLabel: { fontSize: 72, fontFamily: 'PlusJakartaSans_800ExtraBold', opacity: 0.4 },
  modalTitle: { color: Colors.text, fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 6 },
  modalMeta: { color: Colors.textMuted, fontSize: 14, marginBottom: 4, fontFamily: 'Inter_400Regular' },
  modalDuration: { color: Colors.secondary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 20 },
  watchBtn: {
    backgroundColor: Colors.primaryGlow, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.primary,
  },
  watchBtnText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  addBtn: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  addBtnText: { color: Colors.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
});
