import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, Platform } from 'react-native';
import { Colors, getColors } from '../../constants/colors';
import { useAppStore } from '../../lib/store';
import FeedScreen from './feed';
import DiscoveryScreen from './discovery';
import ChatScreen from './chat';
import ProfileScreen from './profile';
import SettingsScreen from './settings';
import StudioScreen from './studio';

const TIKTOK_RED  = '#FE2C55';
const TIKTOK_CYAN = '#25F4EE';

const SCREENS = [FeedScreen, DiscoveryScreen, ChatScreen, ProfileScreen] as const;

// Visual tab slots: 0=Home 1=Discover 2=[+create] 3=Inbox 4=Profile
// Page indices:     0      1           —           2      3
// pageToVisual: page → visual slot index (accounts for the + gap at slot 2)
const VISUAL_TABS = [
  { key: 'home',    icon: '⊞', label: 'Home'     },
  { key: 'search',  icon: '◎', label: 'Discover'  },
  { key: 'inbox',   icon: '✉', label: 'Inbox'     },
  { key: 'me',      icon: '○', label: 'Profile'   },
];

function CreateButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.createWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.createCyan} />
      <View style={styles.createPink} />
      <View style={styles.createCenter}>
        <Text style={styles.createPlus}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const [activePage, setActivePage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const C = getColors(theme);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>

      {/* ── Screen stack — all mounted, only active one is visible ── */}
      <View style={{ flex: 1 }}>
        {SCREENS.map((Screen, i) => (
          <View
            key={VISUAL_TABS[i].key}
            style={[styles.screenSlot, activePage !== i && styles.screenHidden]}
          >
            {i === 3
              ? <ProfileScreen onOpenSettings={() => setSettingsOpen(true)} />
              : <Screen />
            }
          </View>
        ))}
      </View>

      {/* ── TikTok-style bottom tab bar ── */}
      <View style={[styles.tabBar, { backgroundColor: C.background }]}>

        {/* Home */}
        <TabBtn label="Home" icon={activePage === 0 ? '⊞' : '⊟'} active={activePage === 0} onPress={() => setActivePage(0)} />

        {/* Discover */}
        <TabBtn label="Discover" icon="◎" active={activePage === 1} onPress={() => setActivePage(1)} />

        {/* Create + */}
        <View style={styles.createSlot}>
          <CreateButton onPress={() => setCreateOpen(true)} />
        </View>

        {/* Inbox */}
        <TabBtn label="Inbox" icon={activePage === 2 ? '✉' : '✉'} active={activePage === 2} onPress={() => setActivePage(2)} />

        {/* Profile */}
        <TabBtn label="Profile" icon={activePage === 3 ? '●' : '○'} active={activePage === 3} onPress={() => setActivePage(3)} />
      </View>

      {/* Modals */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}>
        <SettingsScreen onClose={() => setSettingsOpen(false)} />
      </Modal>

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <StudioScreen onClose={() => setCreateOpen(false)} />
      </Modal>
    </View>
  );
}

function TabBtn({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Screen slots — all mounted; only the active one participates in layout
  screenSlot: { flex: 1 },
  screenHidden: { display: 'none' },

  // Bottom tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    alignItems: 'flex-start',
  },

  tabItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  tabIcon: { fontSize: 22, color: Colors.textMuted },
  tabIconActive: { color: '#fff' },
  tabLabel: { fontSize: 9, fontFamily: 'SpaceGrotesk_500Medium', letterSpacing: 0.1, color: Colors.textMuted },
  tabLabelActive: { color: '#fff' },

  // Create button slot
  createSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 },
  createWrap: {
    width: 52, height: 30,
    position: 'relative', alignItems: 'center', justifyContent: 'center',
  },
  createCyan: {
    position: 'absolute', left: 0,
    width: 44, height: 30, borderRadius: 8,
    backgroundColor: TIKTOK_CYAN,
  },
  createPink: {
    position: 'absolute', right: 0,
    width: 44, height: 30, borderRadius: 8,
    backgroundColor: TIKTOK_RED,
  },
  createCenter: {
    position: 'absolute',
    width: 44, height: 30, borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  createPlus: {
    color: '#000', fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 22,
  },
});
