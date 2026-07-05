import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, useWindowDimensions,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowText } from '../../constants/fx';
import { useAppStore, TIER_NAMES } from '../../lib/store';
import { MockUser } from '../../constants/users';

const HIGHLIGHTS = ['Clips', 'Live', 'Top', 'Travel', 'More'];

const PROFILE_TABS = [
  { key: 'posts',  icon: '⊞' },
  { key: 'videos', icon: '▶' },
  { key: 'tagged', icon: '◎' },
] as const;

type ProfileTab = typeof PROFILE_TABS[number]['key'];

// ─── Profile screen (inside modal) ───────────────────────────────────────────

function ProfileContent({ user, glowColor, onClose }: {
  user: MockUser;
  glowColor: string;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  const cellSize = (width - 2) / 3;

  const displayPosts =
    activeTab === 'videos' ? user.posts.filter((p) => p.isVideo) :
    activeTab === 'tagged' ? user.posts.slice(0, 3) :
    user.posts;

  const initials = user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerHandle}>@{user.username}</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Text style={styles.headerMore}>···</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* ── Profile section ── */}
        <View style={styles.profileSection}>
          {/* Top row: avatar LEFT + stats RIGHT */}
          <View style={styles.topRow}>
            <View style={[styles.storyRing, { borderColor: user.color }, glowBox(user.color, 8)]}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarInitials, { color: user.color }]}>{initials}</Text>
                {user.isVerified && (
                  <View style={[styles.verifiedBadge, { borderColor: Colors.success }]}>
                    <Text style={styles.verifiedCheck}>✓</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.statsBlock}>
              <StatItem value={String(user.postCount)} label="Posts" />
              <StatItem value={user.followers} label="Followers" />
              <StatItem value={user.following} label="Following" />
            </View>
          </View>

          {/* Name + bio */}
          <Text style={styles.displayName}>{user.displayName}</Text>
          {user.tier >= 2 && (
            <Text style={[styles.categoryText, { color: user.color }]}>
              {TIER_NAMES[user.tier]} Creator
            </Text>
          )}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.followBtn,
                following
                  ? { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }
                  : { backgroundColor: user.color + '22', borderColor: user.color },
                !following && glowBox(user.color, 4),
              ]}
              onPress={() => setFollowing(!following)}
            >
              <Text style={[styles.followBtnText, { color: following ? Colors.textMuted : user.color }]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.msgBtn}>
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tipBtn, { borderColor: Colors.success + '60' }]}>
              <Text style={[styles.tipIcon, glowText(Colors.success)]}>◈</Text>
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsRow} contentContainerStyle={{ gap: 14 }}>
            {HIGHLIGHTS.map((h) => (
              <TouchableOpacity key={h} style={styles.highlightItem}>
                <View style={[styles.highlightCircle, { borderColor: user.color + '60' }]}>
                  <Text style={[styles.highlightIcon, { color: user.color }]}>◎</Text>
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
        {displayPosts.length > 0 ? (
          <View style={styles.grid}>
            {displayPosts.map((post) => (
              <View
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
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◇</Text>
            <Text style={styles.emptyText}>No content yet</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

export default function OtherUserProfile({ user, onClose }: {
  user: MockUser | null;
  onClose: () => void;
}) {
  const glowColor = useAppStore((s) => s.glowColor);

  return (
    <Modal
      visible={!!user}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {user && (
        <ProfileContent user={user} glowColor={glowColor} onClose={onClose} />
      )}
    </Modal>
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
  headerHandle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  headerMore: { color: Colors.text, fontSize: 20, letterSpacing: 2, textAlign: 'right' },

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
    position: 'relative',
  },
  avatarInitials: { fontSize: 28, fontWeight: '900' },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.success + '22', borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  verifiedCheck: { color: Colors.success, fontSize: 9, fontWeight: '900' },

  statsBlock: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },

  displayName: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  categoryText: { fontSize: 13, marginBottom: 4 },
  bio: { color: Colors.text, fontSize: 14, lineHeight: 20, marginBottom: 4 },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 16 },
  followBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 9,
    alignItems: 'center', borderWidth: 1,
  },
  followBtnText: { fontSize: 14, fontWeight: '700' },
  msgBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 9,
    alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
  },
  msgBtnText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  tipBtn: {
    width: 40, borderRadius: 8, paddingVertical: 9,
    alignItems: 'center', backgroundColor: Colors.successGlow,
    borderWidth: 1,
  },
  tipIcon: { fontSize: 18, color: Colors.success },

  highlightsRow: { marginBottom: 10 },
  highlightItem: { alignItems: 'center', gap: 5, width: 66 },
  highlightCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: Colors.surface, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
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

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyIcon: { color: Colors.textDim, fontSize: 36 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
