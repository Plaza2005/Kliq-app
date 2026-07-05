import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Switch } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';
import { useAppStore, TIER_NAMES, TIER_PRICES, TIER_FEATURES, GLOW_PRESETS, Tier } from '../../lib/store';
import { getColors } from '../../constants/colors';
import StudioScreen from './studio';
import ProfileScreen from './profile';

// ─── Flat Instagram-style row ─────────────────────────────────────────────────

function Row({
  icon, label, value, onPress, danger, trailing,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress && !trailing}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {trailing ?? null}
        {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// Section label — plain gray, no card
function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// Divider between sections
function Divider() {
  return <View style={styles.sectionDivider} />;
}

// ─── Tier upgrade modal ───────────────────────────────────────────────────────

function TierModal({ visible, onClose, glowColor }: { visible: boolean; onClose: () => void; glowColor: string }) {
  const { tier, setTier } = useAppStore();
  const tiers: Tier[] = [1, 2, 3];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, glowBorder(glowColor)]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Choose Your Plan</Text>
          <Text style={styles.modalSub}>Unlock more of SuperApp</Text>

          {tiers.map((t) => {
            const active = tier === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tierCard, active && [styles.tierCardActive, { borderColor: glowColor }]]}
                onPress={() => { setTier(t); onClose(); }}
              >
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={[styles.tierName, active && { color: glowColor }]}>
                      Tier {t} — {TIER_NAMES[t]}
                    </Text>
                    <Text style={[styles.tierPrice, active && { color: glowColor + 'AA' }]}>
                      {TIER_PRICES[t]}
                    </Text>
                  </View>
                  {t === 2 && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  {active && <Text style={[styles.activeCheck, { color: glowColor }]}>✓</Text>}
                </View>
                {TIER_FEATURES[t].map((f, i) => (
                  <Text key={i} style={[styles.tierFeature, active && { color: Colors.textMuted }]}>· {f}</Text>
                ))}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen({ onClose }: { onClose?: () => void }) {
  const { tier, signOut, glowColor, setGlowColor, theme, setTheme, profileName, profileHandle } = useAppStore();
  const C = getColors(theme);
  const [tierModal, setTierModal] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  const initials = profileName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.background }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Settings and activity</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile card — Instagram style ── */}
        <TouchableOpacity style={styles.profileRow} onPress={() => setProfileOpen(true)}>
          <View style={[styles.profileAvatar, { borderColor: glowColor }, glowBox(glowColor, 10)]}>
            <Text style={[styles.profileInitials, { color: glowColor }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileSub}>@{profileHandle} · Tier {tier} {TIER_NAMES[tier]}</Text>
          </View>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        <Divider />

        {/* ── Appearance ── */}
        <SectionLabel title="Appearance" />
        <View style={styles.themeRow}>
          {(['dark', 'dim'] as const).map((t) => {
            const active = theme === t;
            const bgPreview = t === 'dark' ? '#000000' : '#1A1A1A';
            return (
              <TouchableOpacity
                key={t}
                style={[styles.themeOption, active && { borderColor: glowColor }]}
                onPress={() => setTheme(t)}
              >
                <View style={[styles.themeSwatch, { backgroundColor: bgPreview }]}>
                  <View style={styles.themeSwatchInner} />
                </View>
                <Text style={[styles.themeLabel, active && { color: Colors.text }]}>
                  {t === 'dark' ? 'Dark' : 'Dim'}
                </Text>
                {active && <Text style={[styles.themeCheck, { color: glowColor }]}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Divider />

        {/* ── Creator Studio ── */}
        <TouchableOpacity style={styles.row} onPress={() => setStudioOpen(true)}>
          <Text style={[styles.rowIcon, { color: glowColor }]}>◈</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: glowColor }]}>Creator Studio</Text>
            <Text style={styles.rowSub}>Content · Analytics · Monetization · Live</Text>
          </View>
          <Text style={[styles.rowChevron, { color: glowColor }]}>›</Text>
        </TouchableOpacity>

        <Divider />

        {/* ── Accent Color ── */}
        <SectionLabel title="Accent Color" />
        <View style={styles.glowGrid}>
          {GLOW_PRESETS.map((preset) => {
            const active = glowColor === preset.color;
            return (
              <TouchableOpacity
                key={preset.color}
                style={[styles.glowSwatch, { borderColor: active ? preset.color : Colors.surfaceAlt }]}
                onPress={() => setGlowColor(preset.color)}
              >
                <View style={[styles.glowDot, { backgroundColor: preset.color }, active && glowBox(preset.color, 8)]} />
                <Text style={[styles.glowName, { color: active ? preset.color : Colors.textMuted }]}>{preset.name}</Text>
                {active && <Text style={[styles.glowCheck, { color: preset.color }]}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Divider />

        {/* ── For professionals (Tier 2+) ── */}
        {tier >= 2 && (
          <>
            <SectionLabel title="For creators" />
            <Row icon="◎" label="Insights" value={tier >= 2 ? '24.8K views / 30d' : undefined} onPress={() => {}} />
            <Row icon="◆" label="Subscription plan" value={`Tier ${tier} · ${TIER_NAMES[tier]}`} onPress={() => setTierModal(true)} />
            <Row icon="◇" label="Account type and tools" onPress={() => {}} />
            <Divider />
          </>
        )}

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <Row icon="○" label="Personal information" onPress={() => {}} />
        <Row icon="◉" label="Password and security" onPress={() => {}} />
        <Row icon="□" label="Linked accounts" onPress={() => {}} />
        <Row
          icon="▷"
          label="Subscription plan"
          value={`Tier ${tier}`}
          onPress={() => setTierModal(true)}
        />

        <Divider />

        {/* ── Who can see your content ── */}
        <SectionLabel title="Who can see your content" />
        <Row icon="△" label="Account privacy" value="Public" onPress={() => {}} />
        <Row icon="◎" label="Close Friends" value="0" onPress={() => {}} />
        <Row icon="⊘" label="Blocked" value="0" onPress={() => {}} />
        <Row icon="◷" label="Story and live settings" onPress={() => {}} />

        <Divider />

        {/* ── How others can interact ── */}
        <SectionLabel title="How others can interact with you" />
        <Row icon="◯" label="Messages and replies" onPress={() => {}} />
        <Row icon="◎" label="Tags and mentions" onPress={() => {}} />
        <Row icon="□" label="Comments" onPress={() => {}} />
        <Row icon="◷" label="Sharing and reuse" onPress={() => {}} />

        <Divider />

        {/* ── What you see ── */}
        <SectionLabel title="What you see" />
        <Row icon="☆" label="Favourites" value="0" onPress={() => {}} />
        <Row icon="○" label="Content preferences" onPress={() => {}} />
        <Row icon="◇" label="Like and share counts" onPress={() => {}} />

        <Divider />

        {/* ── Notifications ── */}
        <SectionLabel title="Notifications" />
        <Row
          icon="◎"
          label="Push notifications"
          trailing={
            <Switch
              value={notifPush}
              onValueChange={setNotifPush}
              trackColor={{ false: Colors.surfaceAlt, true: glowColor + '66' }}
              thumbColor={notifPush ? glowColor : Colors.textMuted}
            />
          }
        />
        <Row
          icon="□"
          label="Email alerts"
          trailing={
            <Switch
              value={notifEmail}
              onValueChange={setNotifEmail}
              trackColor={{ false: Colors.surfaceAlt, true: glowColor + '66' }}
              thumbColor={notifEmail ? glowColor : Colors.textMuted}
            />
          }
        />

        <Divider />

        {/* ── Your app and media ── */}
        <SectionLabel title="Your app and media" />
        <Row icon="□" label="Device permissions" onPress={() => {}} />
        <Row icon="▽" label="Archiving and downloading" onPress={() => {}} />
        <Row icon="○" label="Language" onPress={() => {}} />
        <Row icon="◎" label="Data usage and quality" onPress={() => {}} />

        <Divider />

        {/* ── More info and support ── */}
        <SectionLabel title="More info and support" />
        <Row icon="○" label="Help and support" onPress={() => {}} />
        <Row icon="□" label="Privacy Center" onPress={() => {}} />
        <Row icon="○" label="About SuperApp" onPress={() => {}} />
        <Row icon="□" label="Terms of Service" onPress={() => {}} />

        <Divider />

        {/* ── Login ── */}
        <SectionLabel title="Login" />
        <TouchableOpacity style={styles.row} onPress={signOut}>
          <Text style={[styles.rowLabel, { color: Colors.danger }]}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.rowLabel, { color: Colors.danger, opacity: 0.7 }]}>Delete account</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      <TierModal visible={tierModal} onClose={() => setTierModal(false)} glowColor={glowColor} />

      <Modal visible={studioOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStudioOpen(false)}>
        <StudioScreen onClose={() => setStudioOpen(false)} />
      </Modal>

      <Modal visible={profileOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProfileOpen(false)}>
        <ProfileScreen onClose={() => setProfileOpen(false)} onOpenSettings={() => setProfileOpen(false)} />
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backBtnText: { color: Colors.primary, fontSize: 28, fontWeight: '300' },
  headerTitle: { color: Colors.text, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },

  // Profile card at top (still prominent)
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitials: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  profileSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: 'SpaceGrotesk_500Medium' },

  // Flat rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    gap: 14,
  },
  rowIcon: { fontSize: 18, color: Colors.text, width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, color: Colors.text, fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowSub: { color: Colors.textMuted, fontSize: 12, marginTop: 1, fontFamily: 'SpaceGrotesk_500Medium' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { color: Colors.textMuted, fontSize: 14, fontFamily: 'SpaceGrotesk_500Medium' },
  rowChevron: { color: Colors.textMuted, fontSize: 20, fontWeight: '300' },

  // Section labels
  sectionLabel: {
    color: Colors.textMuted, fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    height: 8, backgroundColor: Colors.surfaceAlt,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },

  // Theme toggle
  themeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  themeOption: {
    flex: 1, borderRadius: 14, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 8,
  },
  themeSwatch: {
    width: 56, height: 36, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, justifyContent: 'flex-end',
  },
  themeSwatchInner: {
    height: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  themeLabel: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  themeCheck: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Glow swatches
  glowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  glowSwatch: {
    width: '30%', flexGrow: 1, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6,
  },
  glowDot: { width: 28, height: 28, borderRadius: 14 },
  glowName: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
  glowCheck: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Tier modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44,
    borderWidth: 1, borderColor: Colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.textDim, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { color: Colors.text, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' },
  modalSub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20, marginTop: 4, fontFamily: 'SpaceGrotesk_500Medium' },
  tierCard: {
    borderRadius: 16, padding: 16, marginBottom: 10,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
  },
  tierCardActive: { backgroundColor: Colors.primaryGlow },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tierName: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  tierPrice: { color: Colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: 'SpaceGrotesk_500Medium' },
  tierFeature: { color: Colors.textMuted, fontSize: 13, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  activeCheck: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' },
  popularBadge: { backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  popularText: { color: '#fff', fontSize: 9, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1 },
  closeBtn: { marginTop: 8, padding: 14, alignItems: 'center' },
  closeBtnText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'SpaceGrotesk_500Medium' },
});
