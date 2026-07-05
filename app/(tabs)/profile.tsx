import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  useWindowDimensions, Modal,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox } from '../../constants/fx';
import { useAppStore, TIER_NAMES } from '../../lib/store';

// ─── Static post data ─────────────────────────────────────────────────────────

const MOCK_POSTS = [
  { id: '1',  color: '#0A0A1E', isVideo: true,  views: '8.4K'  },
  { id: '2',  color: '#0E0A1A', isVideo: true,  views: '21K'   },
  { id: '3',  color: '#0A0E1A', isVideo: true,  views: '5.2K'  },
  { id: '4',  color: '#0A1210', isVideo: false, views: '3.1K'  },
  { id: '5',  color: '#120A14', isVideo: true,  views: '18K'   },
  { id: '6',  color: '#0A0E20', isVideo: false, views: '940'   },
  { id: '7',  color: '#0E0A1E', isVideo: true,  views: '42K'   },
  { id: '8',  color: '#0A1018', isVideo: false, views: '1.2K'  },
  { id: '9',  color: '#0A0E1C', isVideo: true,  views: '15K'   },
  { id: '10', color: '#0E0A18', isVideo: true,  views: '98K'   },
  { id: '11', color: '#0A1210', isVideo: false, views: '720'   },
  { id: '12', color: '#10080E', isVideo: true,  views: '6.7K'  },
];

const LIKED_POSTS = [
  { id: 'L1', color: '#1A0A0A', isVideo: true,  views: '44K'  },
  { id: 'L2', color: '#0A1A0A', isVideo: false, views: '2.1K' },
  { id: 'L3', color: '#0A0A1A', isVideo: true,  views: '310K' },
  { id: 'L4', color: '#1A1A0A', isVideo: false, views: '890'  },
  { id: 'L5', color: '#0A1A1A', isVideo: true,  views: '77K'  },
  { id: 'L6', color: '#1A0A1A', isVideo: true,  views: '4.2K' },
];

const HIGHLIGHTS = ['Travel', 'Food', 'Tech', 'Style', 'Life'];

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profileName, profileHandle, profileBio, setProfile, glowColor } = useAppStore();
  const [name, setName] = useState(profileName);
  const [handle, setHandle] = useState(profileHandle);
  const [bio, setBio] = useState(profileBio);

  const save = () => {
    setProfile({ name: name.trim() || profileName, handle: handle.trim() || profileHandle, bio: bio.trim() });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.editOverlay}>
        <View style={styles.editSheet}>
          <View style={styles.editHandle} />
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.editCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit profile</Text>
            <TouchableOpacity onPress={save}>
              <Text style={[styles.editDone, { color: glowColor }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar preview */}
          <View style={styles.editAvatarRow}>
            <View style={[styles.editAvatar, { borderColor: glowColor }]}>
              <Text style={[styles.editAvatarText, { color: glowColor }]}>
                {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={[styles.editAvatarBtn, { color: glowColor }]}>Change photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editFields}>
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Name</Text>
              <TextInput
                style={styles.editFieldInput}
                value={name}
                onChangeText={setName}
                placeholderTextColor={Colors.textMuted}
                placeholder="Name"
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Username</Text>
              <View style={styles.editFieldRow}>
                <Text style={styles.editAt}>@</Text>
                <TextInput
                  style={[styles.editFieldInput, { flex: 1 }]}
                  value={handle}
                  onChangeText={(t) => setHandle(t.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="username"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Bio</Text>
              <TextInput
                style={[styles.editFieldInput, { height: 72, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholderTextColor={Colors.textMuted}
                placeholder="Bio"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tab bar icons ────────────────────────────────────────────────────────────

const PROFILE_TABS = [
  { key: 'posts',  icon: '⊞', label: 'Posts'  },
  { key: 'videos', icon: '▶', label: 'Videos' },
  { key: 'tagged', icon: '◎', label: 'Tagged' },
] as const;

type ProfileTab = typeof PROFILE_TABS[number]['key'];

// ─── Main profile screen ──────────────────────────────────────────────────────

export default function ProfileScreen({ onClose, onOpenSettings }: { onClose?: () => void; onOpenSettings?: () => void }) {
  const { width } = useWindowDimensions();
  const { tier, profileName, profileHandle, profileBio, glowColor } = useAppStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [editOpen, setEditOpen] = useState(false);

  const cellSize = (width - 2) / 3;

  const displayPosts =
    activeTab === 'videos' ? MOCK_POSTS.filter((p) => p.isVideo) :
    activeTab === 'tagged' ? LIKED_POSTS :
    MOCK_POSTS;

  const initials = profileName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBack}>‹</Text>
          </TouchableOpacity>
        ) : <View style={styles.headerBtn} />}
        <Text style={styles.headerHandle}>@{profileHandle}</Text>
        <TouchableOpacity onPress={onOpenSettings} style={styles.headerBtn}>
          <Text style={styles.headerMenu}>···</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* ── Profile section ── */}
        <View style={styles.profileSection}>
          {/* Top row: avatar LEFT + stats RIGHT */}
          <View style={styles.topRow}>
            {/* Avatar with story ring */}
            <View style={[styles.storyRing, { borderColor: glowColor }, glowBox(glowColor, 8)]}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarInitials, { color: glowColor }]}>{initials}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsBlock}>
              <StatItem value={String(MOCK_POSTS.length)} label="Posts" />
              <StatItem value="1,248" label="Followers" />
              <StatItem value="892" label="Following" />
            </View>
          </View>

          {/* Name + bio */}
          <Text style={styles.displayName}>{profileName}</Text>
          {tier >= 2 && (
            <Text style={[styles.categoryText, { color: glowColor }]}>
              {TIER_NAMES[tier]} Creator
            </Text>
          )}
          {profileBio ? <Text style={styles.bio}>{profileBio}</Text> : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setEditOpen(true)}>
              <Text style={styles.actionBtnText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Share profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtnSq]}>
              <Text style={[styles.actionBtnText, { color: glowColor }]}>◈</Text>
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsRow} contentContainerStyle={{ gap: 14 }}>
            <TouchableOpacity style={styles.highlightNew} >
              <View style={[styles.highlightCircle, { borderColor: Colors.border }]}>
                <Text style={styles.highlightPlus}>+</Text>
              </View>
              <Text style={styles.highlightLabel}>New</Text>
            </TouchableOpacity>
            {HIGHLIGHTS.map((h) => (
              <TouchableOpacity key={h} style={styles.highlightItem}>
                <View style={[styles.highlightCircle, { borderColor: glowColor + '60' }]}>
                  <Text style={[styles.highlightIcon, { color: glowColor }]}>◎</Text>
                </View>
                <Text style={styles.highlightLabel}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Sticky tab icon bar ── */}
        <View style={styles.tabBar}>
          {PROFILE_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabIcon, activeTab === t.key && { color: Colors.text }]}>
                {t.icon}
              </Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tight 3-col grid ── */}
        <View style={styles.grid}>
          {displayPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.gridCell, { width: cellSize, height: cellSize, backgroundColor: post.color }]}
            >
              {post.isVideo && (
                <View style={styles.videoIndicator}>
                  <Text style={styles.videoIndicatorText}>▶</Text>
                </View>
              )}
              <View style={styles.viewsBadge}>
                <Text style={styles.viewsText}>{post.views}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <EditModal visible={editOpen} onClose={() => setEditOpen(false)} />
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  headerBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerBack: { color: Colors.text, fontSize: 28, fontWeight: '300' },
  headerHandle: { color: Colors.text, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  headerMenu: { color: Colors.text, fontSize: 20, letterSpacing: 2, textAlign: 'right' },

  profileSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },

  storyRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, padding: 3,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 24,
  },
  avatarInner: {
    flex: 1, alignSelf: 'stretch', borderRadius: 99,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold' },

  statsBlock: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  statLabel: { color: Colors.textMuted, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' },

  displayName: { color: Colors.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 },
  categoryText: { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 },
  bio: { color: Colors.text, fontSize: 14, lineHeight: 20, marginBottom: 4, fontFamily: 'Inter_400Regular' },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 16 },
  actionBtn: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnSq: {
    width: 40, backgroundColor: Colors.surfaceElevated, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnText: { color: Colors.text, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },

  highlightsRow: { marginBottom: 10 },
  highlightItem: { alignItems: 'center', gap: 5, width: 66 },
  highlightNew: { alignItems: 'center', gap: 5, width: 66 },
  highlightCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: Colors.surface,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  highlightPlus: { color: Colors.textMuted, fontSize: 24, fontWeight: '300' },
  highlightIcon: { fontSize: 22 },
  highlightLabel: { color: Colors.text, fontSize: 11, textAlign: 'center' },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', position: 'relative' },
  tabItemActive: {},
  tabIcon: { fontSize: 20, color: Colors.textMuted },
  tabUnderline: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: Colors.text,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  gridCell: { overflow: 'hidden', justifyContent: 'flex-end' },
  videoIndicator: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  videoIndicatorText: { color: '#fff', fontSize: 9 },
  viewsBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  viewsText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  editOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  editHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.textDim, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  editCancel: { color: Colors.text, fontSize: 16 },
  editTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  editDone: { fontSize: 16, fontWeight: '700' },
  editAvatarRow: {
    alignItems: 'center', gap: 10, paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  editAvatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.background, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  editAvatarText: { fontSize: 26, fontWeight: '900' },
  editAvatarBtn: { fontSize: 14, fontWeight: '600' },
  editFields: { paddingHorizontal: 0 },
  editField: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 16 },
  editFieldLabel: { color: Colors.text, fontSize: 15, fontWeight: '500', width: 100 },
  editFieldRow: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  editAt: { color: Colors.textMuted, fontSize: 15 },
  editFieldInput: { color: Colors.text, fontSize: 15, flex: 1 },
});
