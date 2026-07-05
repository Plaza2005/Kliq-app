import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, StatusBar,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Colors } from '../../constants/colors';
import { useAppStore } from '../../lib/store';
import StudioScreen from './studio';
import OtherUserProfile from '../../components/shared/OtherUserProfile';
import { MOCK_USERS, MockUser } from '../../constants/users';

const TIKTOK_RED  = '#FE2C55';
const TIKTOK_CYAN = '#25F4EE';

const POSTS = [
  {
    id: '0', username: 'creator_1',
    caption: 'Building the future of Africa 🌍 This is what we\'ve been working on',
    hashtags: '#africa #tech #startup',
    sound: 'Original Sound - creator_1',
    likes: 84200, comments: 3100, shares: 1420,
    isLive: false, color: '#0D0D1F',
  },
  {
    id: '1', username: 'naija_vibes',
    caption: 'Afrobeats session in Lagos tonight 🎵 Who\'s coming through?',
    hashtags: '#naija #music #afrobeats',
    sound: 'Essence - Wizkid ft. Tems',
    likes: 212000, comments: 8400, shares: 14200,
    isLive: true, color: '#1F0D0D',
  },
  {
    id: '2', username: 'crypto_africa',
    caption: 'How I made $10k trading crypto from Accra 📈 Thread below',
    hashtags: '#crypto #ghana #finance',
    sound: 'Money - Cardi B',
    likes: 54700, comments: 2200, shares: 8800,
    isLive: false, color: '#0D1F0D',
  },
  {
    id: '3', username: 'chef_ama',
    caption: 'Jollof rice recipe that hits different 🍛 Watch till end',
    hashtags: '#food #ghana #jollof',
    sound: 'Original Sound - chef_ama',
    likes: 310000, comments: 14200, shares: 32100,
    isLive: false, color: '#1F1A0D',
  },
  {
    id: '4', username: 'fashion_ke',
    caption: 'Nairobi style on a budget 👗 Full outfit breakdown in comments',
    hashtags: '#kenya #fashion #style',
    sound: 'Sawa - Bien',
    likes: 67300, comments: 1800, shares: 4200,
    isLive: false, color: '#0D141F',
  },
  {
    id: '5', username: 'code_africa',
    caption: 'Teaching 10,000 Africans to code in 2025 💻 Join the movement',
    hashtags: '#tech #africa #code',
    sound: 'Original Sound - code_africa',
    likes: 98100, comments: 4300, shares: 7600,
    isLive: false, color: '#0D0D1A',
  },
  {
    id: '6', username: 'artist_ola',
    caption: 'New art collection dropping next week 🎨 Drop a 🔥 if you want first access',
    hashtags: '#art #nigeria #afroart',
    sound: 'Burn - Tems',
    likes: 43200, comments: 990, shares: 2100,
    isLive: false, color: '#1A0D10',
  },
  {
    id: '7', username: 'fitness_sa',
    caption: 'Morning run in Cape Town 🏃 5am club, who else?',
    hashtags: '#southafrica #fitness #health',
    sound: 'Running - Original Sound',
    likes: 28600, comments: 720, shares: 1300,
    isLive: false, color: '#0D1A14',
  },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function SoundDisc() {
  return (
    <View style={styles.soundDisc}>
      <Text style={styles.soundDiscNote}>♪</Text>
    </View>
  );
}

function VideoCard({
  item,
  onPressUser,
}: {
  item: typeof POSTS[0];
  onPressUser: (u: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <View style={styles.card}>
      {/* Mock video background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: item.color }]}>
        <View style={styles.mockVideoInner}>
          <Text style={styles.mockPlayIcon}>▶</Text>
        </View>
      </View>

      {/* Bottom scrim for text legibility */}
      <View pointerEvents="none" style={styles.scrimTop} />
      <View pointerEvents="none" style={styles.scrimBottom} />

      {/* ── Right action bar ── */}
      <View style={styles.sideBar}>
        {/* Profile avatar + follow */}
        <TouchableOpacity style={styles.avatarWrap} onPress={() => onPressUser(item.username)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
          </View>
          {!following && (
            <TouchableOpacity style={styles.followPlus} onPress={() => setFollowing(true)}>
              <Text style={styles.followPlusText}>+</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionItem} onPress={() => setLiked(!liked)}>
          <Text style={[styles.actionIcon, liked && { color: TIKTOK_RED }]}>
            {liked ? '♥' : '♡'}
          </Text>
          <Text style={styles.actionCount}>{formatCount(item.likes + (liked ? 1 : 0))}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionIcon}>◎</Text>
          <Text style={styles.actionCount}>{formatCount(item.comments)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionCount}>{formatCount(item.shares)}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionItem} onPress={() => setSaved(!saved)}>
          <Text style={[styles.actionIcon, saved && { color: Colors.primary }]}>
            {saved ? '◆' : '◇'}
          </Text>
        </TouchableOpacity>

        {/* Sound disc */}
        <SoundDisc />
      </View>

      {/* ── Bottom info (left) ── */}
      <View style={styles.bottomInfo}>
        {item.isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● LIVE</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => onPressUser(item.username)}>
          <Text style={styles.videoUsername}>@{item.username}</Text>
        </TouchableOpacity>
        <Text style={styles.videoCaption} numberOfLines={2}>{item.caption}</Text>
        <Text style={styles.videoHashtags}>{item.hashtags}</Text>
        <View style={styles.soundRow}>
          <Text style={styles.soundIcon}>♪</Text>
          <Text style={styles.soundText} numberOfLines={1}>{item.sound}</Text>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [studioOpen, setStudioOpen] = useState(false);
  const [openUser, setOpenUser] = useState<MockUser | null>(null);
  const { tier } = useAppStore();

  const handlePressUser = useCallback((username: string) => {
    const u = MOCK_USERS[username];
    if (u) setOpenUser(u);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen vertical video pager */}
      <PagerView
        style={styles.pager}
        orientation="vertical"
        initialPage={0}
      >
        {POSTS.map((post) => (
          <View key={post.id} style={{ flex: 1 }}>
            <VideoCard item={post} onPressUser={handlePressUser} />
          </View>
        ))}
      </PagerView>

      {/* ── Top overlay (For You / Following + icons) ── */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity onPress={() => setStudioOpen(true)}>
          <Text style={styles.topIcon}>⊕</Text>
        </TouchableOpacity>

        <View style={styles.topTabs} pointerEvents="box-none">
          <TouchableOpacity onPress={() => setTab('following')}>
            <Text style={[styles.topTab, tab === 'following' && styles.topTabActive]}>Following</Text>
            {tab === 'following' && <View style={styles.topTabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('foryou')}>
            <Text style={[styles.topTab, tab === 'foryou' && styles.topTabActive]}>For You</Text>
            {tab === 'foryou' && <View style={styles.topTabUnderline} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={styles.topIcon}>◎</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={studioOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStudioOpen(false)}>
        <StudioScreen onClose={() => setStudioOpen(false)} />
      </Modal>

      <OtherUserProfile user={openUser} onClose={() => setOpenUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  pager: { flex: 1 },

  // Video card
  card: { flex: 1, backgroundColor: '#000' },
  mockVideoInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mockPlayIcon: { color: 'rgba(255,255,255,0.06)', fontSize: 80 },

  // Scrims
  scrimTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scrimBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Top bar (For You / Following)
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  topIcon: { color: '#fff', fontSize: 22 },
  topTabs: { flexDirection: 'row', gap: 20, alignItems: 'flex-end' },
  topTab: {
    color: 'rgba(255,255,255,0.6)', fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.2,
  },
  topTabActive: { color: '#fff' },
  topTabUnderline: {
    height: 2, backgroundColor: '#fff', borderRadius: 1, marginTop: 3,
  },

  // Right action bar
  sideBar: {
    position: 'absolute', right: 10, bottom: 100,
    alignItems: 'center', gap: 20,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 4 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  followPlus: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: TIKTOK_RED,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -10,
  },
  followPlusText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 20 },

  actionItem: { alignItems: 'center', gap: 4 },
  actionIcon: { color: '#fff', fontSize: 32 },
  actionCount: { color: '#fff', fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },

  soundDisc: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 6, borderColor: '#2A2A2A',
    justifyContent: 'center', alignItems: 'center',
  },
  soundDiscNote: { color: '#fff', fontSize: 14 },

  // Bottom info
  bottomInfo: {
    position: 'absolute', left: 14, right: 80, bottom: 90,
    gap: 4,
  },
  liveBadge: {
    backgroundColor: TIKTOK_RED, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 2,
  },
  liveBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1 },
  videoUsername: {
    color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold',
  },
  videoCaption: {
    color: 'rgba(255,255,255,0.9)', fontSize: 13,
    fontFamily: 'Inter_400Regular', lineHeight: 19,
  },
  videoHashtags: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  soundIcon: { color: '#fff', fontSize: 13 },
  soundText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium', flex: 1,
  },
});
