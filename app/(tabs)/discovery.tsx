import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBorder, glowText } from '../../constants/fx';
import OtherUserProfile from '../../components/shared/OtherUserProfile';
import { MOCK_USERS, MockUser } from '../../constants/users';

const TRENDING_TAGS = ['#africa', '#naija', '#afrobeats', '#nollywood', '#entrepreneur', '#crypto', '#fashion', '#food', '#tech', '#sports'];

const MOCK_VIDEOS = [
  { id: '0',  title: 'How to start a business in Nigeria',   views: 1240000, duration: '14:32', color: '#0A0A1E', type: 'long'  as const, wide: true,  username: 'creator_1'    },
  { id: '1',  title: 'Afrobeats Mix 2025',                   views: 3800000, duration: '0:58',  color: '#0E0A1A', type: 'short' as const, wide: false, username: 'naija_vibes'  },
  { id: '2',  title: 'Ghana Street Food Tour',               views: 920000,  duration: '18:04', color: '#0A0E1A', type: 'long'  as const, wide: false, username: 'chef_ama'     },
  { id: '3',  title: 'Crypto Trading Basics',                views: 542000,  duration: '0:45',  color: '#0A1210', type: 'short' as const, wide: false, username: 'crypto_africa'},
  { id: '4',  title: 'African Fashion Week',                 views: 2100000, duration: '11:20', color: '#120A14', type: 'long'  as const, wide: false, username: 'fashion_ke'   },
  { id: '5',  title: 'Nollywood BTS',                        views: 780000,  duration: '0:30',  color: '#0A0E20', type: 'short' as const, wide: false, username: 'artist_ola'   },
  { id: '6',  title: 'Tech Startups in Kenya',               views: 430000,  duration: '22:15', color: '#0E0A1E', type: 'long'  as const, wide: true,  username: 'code_africa'  },
  { id: '7',  title: 'African Cuisine Recipes',              views: 1670000, duration: '0:52',  color: '#0A1018', type: 'short' as const, wide: false, username: 'chef_ama'     },
  { id: '8',  title: 'Lagos Nightlife Vlog',                 views: 890000,  duration: '16:44', color: '#0A0E1C', type: 'long'  as const, wide: false, username: 'naija_vibes'  },
  { id: '9',  title: 'How Africans Are Winning Crypto',      views: 4200000, duration: '0:38',  color: '#0E0A18', type: 'short' as const, wide: false, username: 'kemi_talks'   },
  { id: '10', title: 'South Africa Wildlife Safari',         views: 3100000, duration: '19:08', color: '#0A0A1E', type: 'long'  as const, wide: false, username: 'fitness_sa'   },
  { id: '11', title: 'Kizz Daniel New Afrobeats Hit',        views: 6700000, duration: '0:59',  color: '#0E0A1A', type: 'short' as const, wide: false, username: 'naija_vibes'  },
  { id: '12', title: 'Forex from Africa',                    views: 960000,  duration: '28:14', color: '#0A0E1A', type: 'long'  as const, wide: true,  username: 'kemi_talks'   },
  { id: '13', title: 'Ethiopian Coffee Ceremony',            views: 1450000, duration: '0:47',  color: '#0A1210', type: 'short' as const, wide: false, username: 'chef_ama'     },
  { id: '14', title: 'Building a Startup in Africa',         views: 720000,  duration: '34:01', color: '#120A14', type: 'long'  as const, wide: false, username: 'creator_1'    },
  { id: '15', title: 'Senegal Art & Culture',                views: 380000,  duration: '0:51',  color: '#0A0E20', type: 'short' as const, wide: false, username: 'artist_ola'   },
  { id: '16', title: 'African Fintech Revolution',           views: 2400000, duration: '15:22', color: '#0E0A1E', type: 'long'  as const, wide: false, username: 'code_africa'  },
  { id: '17', title: 'Nairobi Street Dance Battle',          views: 5900000, duration: '0:33',  color: '#0A1018', type: 'short' as const, wide: false, username: 'dance_ke'     },
  { id: '18', title: 'Africa Tech CEO Interview',            views: 610000,  duration: '42:55', color: '#0A0E1C', type: 'long'  as const, wide: false, username: 'creator_1'    },
  { id: '19', title: 'Jollof Wars: Nigeria vs Ghana',        views: 8100000, duration: '1:00',  color: '#0E0A18', type: 'short' as const, wide: false, username: 'chef_ama'     },
  { id: '20', title: 'African Music History',                views: 1820000, duration: '24:10', color: '#0A0A1E', type: 'long'  as const, wide: false, username: 'naija_vibes'  },
  { id: '21', title: 'Cape Town Travel Guide',               views: 2700000, duration: '0:44',  color: '#0E0A1A', type: 'short' as const, wide: false, username: 'fitness_sa'   },
  { id: '22', title: 'Learn to Code for Free',               views: 3300000, duration: '18:38', color: '#0A0E1A', type: 'long'  as const, wide: false, username: 'code_africa'  },
  { id: '23', title: 'Afrobeats Dance Tutorial',             views: 11200000,duration: '0:49',  color: '#0A1210', type: 'short' as const, wide: false, username: 'dance_ke'     },
];

function formatViews(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

type FilterType = 'All' | 'Videos' | 'Shorts' | 'Channels';

export default function DiscoveryScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [openUser, setOpenUser] = useState<MockUser | null>(null);
  const { width } = useWindowDimensions();
  const cellSize = (width - 4) / 3;

  const filtered = MOCK_VIDEOS.filter((v) => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Shorts' ? v.type === 'short' :
      filter === 'Videos' ? v.type === 'long' :
      true;
    return matchSearch && matchFilter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.searchRow, glowBorder(Colors.primary)]}>
          <Text style={[styles.searchIcon, glowText(Colors.primary)]}>◎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, channels, tags..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: Colors.textMuted, fontSize: 16 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['All', 'Videos', 'Shorts', 'Channels'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!search && (
          <>
            <Text style={styles.sectionTitle}>Trending</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginBottom: 20 }}>
              {TRENDING_TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => setSearch(tag)}>
                  <Text style={[styles.tagText, glowText(Colors.primary)]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>Explore</Text>
          </>
        )}

        {/* 3-column grid */}
        <View style={styles.grid}>
          {filtered.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={[styles.cell, { width: cellSize, height: cellSize }]}
              onPress={() => {
                const u = MOCK_USERS[video.username];
                if (u) setOpenUser(u);
              }}
            >
              <View style={[styles.cellInner, { backgroundColor: video.color }]}>
                <Text style={styles.cellDuration}>{video.type === 'short' ? 'S' : video.duration}</Text>
                {video.type === 'short' && <View style={styles.shortDot} />}
              </View>
              <Text style={styles.cellTitle} numberOfLines={1}>{video.title}</Text>
              <Text style={styles.cellViews}>{formatViews(video.views)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <OtherUserProfile user={openUser} onClose={() => setOpenUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8, color: Colors.primary },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  chipTextActive: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1.5, paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase' },
  tagChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.borderGlow,
  },
  tagText: { color: Colors.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 },
  cell: { overflow: 'hidden' },
  cellInner: { flex: 1, justifyContent: 'flex-end', padding: 6 },
  cellDuration: {
    color: Colors.text, fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold',
    backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
  },
  shortDot: {
    position: 'absolute', top: 6, left: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent,
  },
  cellTitle: { color: Colors.textMuted, fontSize: 10, marginTop: 3, paddingHorizontal: 2, fontFamily: 'Inter_400Regular' },
  cellViews: { color: Colors.textDim, fontSize: 9, paddingHorizontal: 2, marginBottom: 2, fontFamily: 'Inter_400Regular' },
});
