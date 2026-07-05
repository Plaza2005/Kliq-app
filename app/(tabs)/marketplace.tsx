import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowBorder, glowText } from '../../constants/fx';
import { useAppStore } from '../../lib/store';

const CATEGORIES = ['All', 'Digital', 'Physical', 'Services', 'NFTs', 'Storefronts'];

const SALES_COUNTS = [312, 87, 44, 201, 9, 158, 72, 19, 430, 63];

const MOCK_LISTINGS = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  title: ['Beat Pack Vol.1', 'Logo Design', 'Vintage Sneakers', 'E-Book: Crypto 101', 'Hair Braiding Service', 'Art Commission', 'Domain Name', 'Laptop HP 14"', 'DJ Set 4hrs', 'Premium Template'][i % 10],
  price: [5, 15, 80, 10, 25, 50, 20, 200, 150, 12][i % 10],
  currency: ['USDT', 'USDT', 'NGN', 'USDT', 'KES', 'USDT', 'USDT', 'GHS', 'KES', 'USDT'][i % 10],
  category: ['Digital', 'Services', 'Physical', 'Digital', 'Services', 'Digital', 'Digital', 'Physical', 'Services', 'Digital'][i % 10],
  seller: `@seller_${i + 1}`,
  rating: (3.5 + (i % 5) * 0.3).toFixed(1),
  sales: SALES_COUNTS[i % 10],
  color: ['#0A0A1E', '#0E0A1A', '#0A0E1A', '#0A1210', '#120A14'][i % 5],
}));

function ListingCard({ item, onPress }: { item: typeof MOCK_LISTINGS[0]; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.cardImage, { backgroundColor: item.color }]}>
        <Text style={styles.cardType}>
          {item.category === 'Digital' ? 'D' : item.category === 'Services' ? 'S' : 'P'}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardSeller}>{item.seller}</Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, glowText(Colors.primary)]}>{item.price} {item.currency}</Text>
          <Text style={styles.cardRating}>★ {item.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof MOCK_LISTINGS[0] | null>(null);
  const tier = useAppStore((s) => s.tier);

  const filtered = MOCK_LISTINGS.filter(
    (l) => (category === 'All' || l.category === category) &&
            l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        {tier >= 2 && (
          <TouchableOpacity style={[styles.storeBtn, glowBox(Colors.primary, 6)]}>
            <Text style={styles.storeBtnText}>+ My Store</Text>
          </TouchableOpacity>
        )}
        {tier === 1 && (
          <TouchableOpacity style={styles.storeBtnLocked} onPress={() => {}}>
            <Text style={styles.storeBtnLockedText}>Store — Tier 2+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search products, services..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
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
        keyExtractor={(i) => i.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <ListingCard item={item} onPress={() => setSelected(item)} />}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, glowBorder(Colors.primary)]}>
              <View style={[styles.modalImage, { backgroundColor: selected.color }]}>
                <Text style={[styles.modalTypeIcon, glowText(Colors.primary)]}>
                  {selected.category === 'Digital' ? 'D' : selected.category === 'Services' ? 'S' : 'P'}
                </Text>
              </View>
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <Text style={styles.modalSeller}>{selected.seller} · ★ {selected.rating} · {selected.sales} sales</Text>
              <Text style={styles.modalCategory}>{selected.category}</Text>
              <Text style={[styles.modalPrice, glowText(Colors.primary)]}>{selected.price} {selected.currency}</Text>
              <Text style={styles.modalFee}>Platform fee: {(selected.price * 0.05).toFixed(2)} {selected.currency} (5%)</Text>

              <TouchableOpacity style={[styles.buyBtn, glowBox(Colors.primary, 8)]} onPress={() => setSelected(null)}>
                <Text style={styles.buyBtnText}>Buy Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageBtn} onPress={() => setSelected(null)}>
                <Text style={styles.messageBtnText}>Message Seller</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Cancel</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  title: { color: Colors.text, fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5 },
  storeBtn: {
    backgroundColor: Colors.primaryGlow, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.primary,
  },
  storeBtnText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },
  storeBtnLocked: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  storeBtnLockedText: { color: Colors.textDim, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' },
  searchRow: { paddingHorizontal: 16, marginBottom: 12 },
  search: {
    backgroundColor: Colors.surface, color: Colors.text, borderRadius: 12,
    padding: 12, fontSize: 14, borderWidth: 1, borderColor: Colors.border,
    fontFamily: 'Inter_400Regular',
  },
  catScroll: { marginBottom: 12, maxHeight: 40 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  catText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  catTextActive: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' },
  grid: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  cardImage: { height: 120, justifyContent: 'center', alignItems: 'center' },
  cardType: { color: Colors.primary, fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', opacity: 0.6 },
  cardInfo: { padding: 10 },
  cardTitle: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, marginBottom: 2 },
  cardSeller: { color: Colors.textMuted, fontSize: 11, marginBottom: 6, fontFamily: 'Inter_400Regular' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
  cardRating: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  modalImage: { height: 160, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTypeIcon: { fontSize: 64, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.primary },
  modalTitle: { color: Colors.text, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 4 },
  modalSeller: { color: Colors.textMuted, fontSize: 13, marginBottom: 8, fontFamily: 'Inter_400Regular' },
  modalCategory: { color: Colors.secondary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  modalPrice: { color: Colors.primary, fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 4 },
  modalFee: { color: Colors.textMuted, fontSize: 12, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  buyBtn: {
    backgroundColor: Colors.primaryGlow, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.primary,
  },
  buyBtnText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  messageBtn: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  messageBtnText: { color: Colors.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
});
