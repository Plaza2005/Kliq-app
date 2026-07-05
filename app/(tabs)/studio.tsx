import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';
import { useAppStore, TIER_NAMES, Tier } from '../../lib/store';

// ─── Mock data ───────────────────────────────────────────────────────────────

const OVERVIEW = {
  views: 24800, followers: 1240, following: 892,
  engagement: 4.8, tips: 87.5, marketRevenue: 224.5,
};

const RECENT_CONTENT = [
  { id: '1', title: 'Building the future of Africa', views: 8400,  likes: 1200, comments: 340, revenue: 12.5,  color: '#0A0A1E', status: 'published' },
  { id: '2', title: 'Afrobeats session in Lagos',   views: 21000, likes: 4800, comments: 920, revenue: 34.2,  color: '#0E0A1A', status: 'published' },
  { id: '3', title: 'Crypto trading from Accra',    views: 5200,  likes: 720,  comments: 180, revenue: 8.1,   color: '#0A0E1A', status: 'published' },
  { id: '4', title: 'Nairobi style on a budget',    views: 3100,  likes: 410,  comments: 95,  revenue: 4.7,   color: '#120A14', status: 'draft'     },
  { id: '5', title: 'African fintech revolution',   views: 0,     likes: 0,    comments: 0,   revenue: 0,     color: '#0A0E20', status: 'scheduled'  },
];

const CHART_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHART_VALS = [320, 580, 410, 920, 640, 1100, 780];
const CHART_MAX  = Math.max(...CHART_VALS);

const TOP_COUNTRIES = [
  { name: 'Nigeria',      pct: 42, color: Colors.NGN   },
  { name: 'Kenya',        pct: 18, color: Colors.KES   },
  { name: 'Ghana',        pct: 14, color: Colors.GHS   },
  { name: 'South Africa', pct: 11, color: Colors.accent },
  { name: 'Other',        pct: 15, color: Colors.textDim },
];

// ─── Upload Modal ─────────────────────────────────────────────────────────────

type UploadStep = 'pick' | 'details' | 'uploading' | 'done';

function UploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<UploadStep>('pick');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setStep('pick');
    setMediaUri(null);
    setTitle('');
    setCaption('');
    setProgress(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos', 'images'],
      quality: 0.8,
      videoMaxDuration: 300,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
      setStep('details');
    }
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 300,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
      setStep('details');
    }
  };

  const handlePublish = () => {
    if (!title.trim()) return;
    setStep('uploading');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); setStep('done'); return 100; }
        return p + Math.random() * 18;
      });
    }, 200);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={uploadStyles.container}>
        {/* Header */}
        <View style={uploadStyles.header}>
          {step !== 'uploading' && step !== 'done' && (
            <TouchableOpacity onPress={step === 'pick' ? handleClose : () => setStep('pick')}>
              <Text style={uploadStyles.headerBack}>{step === 'pick' ? '✕' : '‹'}</Text>
            </TouchableOpacity>
          )}
          <Text style={uploadStyles.headerTitle}>
            {step === 'pick' ? 'New Post' : step === 'details' ? 'Details' : step === 'uploading' ? 'Uploading…' : 'Posted!'}
          </Text>
          {step === 'details' && (
            <TouchableOpacity onPress={handlePublish} style={uploadStyles.publishBtn}>
              <Text style={uploadStyles.publishBtnText}>Share</Text>
            </TouchableOpacity>
          )}
          {(step === 'pick' || step === 'uploading' || step === 'done') && <View style={{ width: 44 }} />}
        </View>

        {/* Pick step */}
        {step === 'pick' && (
          <View style={uploadStyles.pickWrap}>
            <View style={uploadStyles.pickHero}>
              <Text style={uploadStyles.pickHeroIcon}>⬆</Text>
              <Text style={uploadStyles.pickHeroTitle}>Upload Content</Text>
              <Text style={uploadStyles.pickHeroSub}>Share videos and photos with your followers</Text>
            </View>
            <TouchableOpacity style={uploadStyles.pickOption} onPress={pickFromLibrary}>
              <View style={uploadStyles.pickOptionIcon}><Text style={uploadStyles.pickOptionIconText}>▶</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={uploadStyles.pickOptionLabel}>Choose from Library</Text>
                <Text style={uploadStyles.pickOptionSub}>Videos up to 5 minutes · Photos</Text>
              </View>
              <Text style={uploadStyles.pickOptionChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={uploadStyles.pickOption} onPress={recordVideo}>
              <View style={uploadStyles.pickOptionIcon}><Text style={uploadStyles.pickOptionIconText}>◉</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={uploadStyles.pickOptionLabel}>Record Video</Text>
                <Text style={uploadStyles.pickOptionSub}>Record directly in the app</Text>
              </View>
              <Text style={uploadStyles.pickOptionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Details step */}
        {step === 'details' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={uploadStyles.detailsWrap}>
            {/* Preview thumbnail */}
            <View style={uploadStyles.previewThumb}>
              <Text style={uploadStyles.previewThumbIcon}>{mediaType === 'video' ? '▶' : '◻'}</Text>
              <View style={uploadStyles.previewBadge}>
                <Text style={uploadStyles.previewBadgeText}>{mediaType.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={uploadStyles.fieldLabel}>Title *</Text>
            <TextInput
              style={uploadStyles.input}
              placeholder="Give your post a title…"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <Text style={uploadStyles.fieldLabel}>Caption</Text>
            <TextInput
              style={[uploadStyles.input, uploadStyles.inputMulti]}
              placeholder="Write a caption…"
              placeholderTextColor={Colors.textMuted}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
              maxLength={2200}
            />

            <Text style={uploadStyles.fieldLabel}>Visibility</Text>
            <View style={uploadStyles.visibilityRow}>
              {['Public', 'Followers', 'Close Friends'].map((v) => (
                <TouchableOpacity key={v} style={[uploadStyles.visibilityChip, v === 'Public' && uploadStyles.visibilityChipActive]}>
                  <Text style={[uploadStyles.visibilityChipText, v === 'Public' && uploadStyles.visibilityChipTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[uploadStyles.shareBtn, !title.trim() && { opacity: 0.4 }]}
              onPress={handlePublish}
              disabled={!title.trim()}
            >
              <Text style={uploadStyles.shareBtnText}>Share Now</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Uploading step */}
        {step === 'uploading' && (
          <View style={uploadStyles.statusWrap}>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 24 }} />
            <Text style={uploadStyles.statusTitle}>Uploading your content</Text>
            <Text style={uploadStyles.statusSub}>This may take a moment…</Text>
            <View style={uploadStyles.progressTrack}>
              <View style={[uploadStyles.progressFill, { width: `${Math.min(progress, 100)}%` as any }]} />
            </View>
            <Text style={uploadStyles.progressPct}>{Math.min(Math.round(progress), 100)}%</Text>
          </View>
        )}

        {/* Done step */}
        {step === 'done' && (
          <View style={uploadStyles.statusWrap}>
            <View style={uploadStyles.doneCircle}>
              <Text style={uploadStyles.doneCheck}>✓</Text>
            </View>
            <Text style={uploadStyles.statusTitle}>Posted!</Text>
            <Text style={uploadStyles.statusSub}>Your content is now live for your followers.</Text>
            <TouchableOpacity style={uploadStyles.shareBtn} onPress={handleClose}>
              <Text style={uploadStyles.shareBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = Colors.primary }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[styles.statCard, glowBorder(color)]}>
      <Text style={[styles.statValue, glowText(color)]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function LockedCard({ minTier, title }: { minTier: Tier; title: string }) {
  return (
    <View style={[styles.lockedCard, glowBorder(Colors.secondary)]}>
      <Text style={[styles.lockedIcon, glowText(Colors.secondary)]}>◈</Text>
      <Text style={styles.lockedTitle}>{title}</Text>
      <Text style={styles.lockedSub}>Available on Tier {minTier} — {TIER_NAMES[minTier]}</Text>
    </View>
  );
}

function ViewsChart() {
  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>Views — Last 7 Days</Text>
      <View style={styles.chartBars}>
        {CHART_VALS.map((v, i) => (
          <View key={i} style={styles.chartBarWrap}>
            <Text style={styles.chartBarVal}>{v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v}</Text>
            <View style={styles.chartBarTrack}>
              <View style={[styles.chartBar, { height: `${(v / CHART_MAX) * 100}%` as any }, glowBox(Colors.primary, 4)]} />
            </View>
            <Text style={styles.chartDay}>{CHART_DAYS[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ContentRow({ item }: { item: typeof RECENT_CONTENT[0] }) {
  const statusColor = item.status === 'published' ? Colors.success : item.status === 'draft' ? Colors.textMuted : Colors.secondary;
  return (
    <View style={styles.contentRow}>
      <View style={[styles.contentThumb, { backgroundColor: item.color }]}>
        <Text style={styles.contentThumbLabel}>▶</Text>
      </View>
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.contentMeta}>
          <Text style={styles.contentStat}>{item.views.toLocaleString()} views</Text>
          <Text style={styles.contentStat}>♡ {item.likes.toLocaleString()}</Text>
          <Text style={styles.contentStat}>◎ {item.comments}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.contentRevenue}>
        <Text style={[styles.contentRevenueVal, glowText(Colors.success)]}>+${item.revenue.toFixed(2)}</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab screens ─────────────────────────────────────────────────────────────

function DashboardTab({ tier }: { tier: Tier }) {
  const total = OVERVIEW.tips + OVERVIEW.marketRevenue;
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick stats */}
        <View style={styles.statGrid}>
          <StatCard label="Views" value={OVERVIEW.views >= 1000 ? (OVERVIEW.views / 1000).toFixed(1) + 'K' : String(OVERVIEW.views)} />
          <StatCard label="Followers" value={OVERVIEW.followers.toLocaleString()} color={Colors.secondary} />
          <StatCard label="Engagement" value={OVERVIEW.engagement + '%'} color={Colors.success} />
          {tier >= 2
            ? <StatCard label="Earnings" value={'$' + total.toFixed(2)} sub="this month" color={Colors.accent} />
            : <StatCard label="Earnings" value="Tier 2+" color={Colors.textDim} />
          }
        </View>

        {/* Upload CTA */}
        <TouchableOpacity style={styles.uploadCta} onPress={() => setUploadOpen(true)}>
          <Text style={styles.uploadCtaIcon}>⬆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadCtaTitle}>Upload Content</Text>
            <Text style={styles.uploadCtaSub}>Share videos and photos with your followers</Text>
          </View>
          <Text style={styles.uploadCtaArrow}>›</Text>
        </TouchableOpacity>

        {/* Recent content */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR CONTENT</Text>
            <TouchableOpacity onPress={() => setUploadOpen(true)}>
              <Text style={styles.sectionAction}>+ Upload</Text>
            </TouchableOpacity>
          </View>
          {RECENT_CONTENT.map((c) => <ContentRow key={c.id} item={c} />)}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <UploadModal visible={uploadOpen} onClose={() => setUploadOpen(false)} />
    </View>
  );
}

function AnalyticsTab({ tier }: { tier: Tier }) {
  if (tier < 2) return <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}><LockedCard minTier={2} title="Analytics" /></View>;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ViewsChart />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ENGAGEMENT</Text>
        <View style={styles.engagGrid}>
          <View style={styles.engagCard}>
            <Text style={[styles.engagValue, glowText(Colors.primary)]}>4.8%</Text>
            <Text style={styles.engagLabel}>Avg. Engagement</Text>
          </View>
          <View style={styles.engagCard}>
            <Text style={[styles.engagValue, glowText(Colors.secondary)]}>3:42</Text>
            <Text style={styles.engagLabel}>Avg. Watch Time</Text>
          </View>
          <View style={styles.engagCard}>
            <Text style={[styles.engagValue, glowText(Colors.success)]}>68%</Text>
            <Text style={styles.engagLabel}>Completion Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BEST POSTING TIMES</Text>
        <View style={styles.timesRow}>
          {['6pm', '7pm', '8pm', '9pm'].map((t) => (
            <View key={t} style={[styles.timeChip, glowBorder(Colors.primary)]}>
              <Text style={[styles.timeVal, glowText(Colors.primary)]}>{t}</Text>
              <Text style={styles.timeLabel}>peak</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TOP COUNTRIES</Text>
        {TOP_COUNTRIES.map((c) => (
          <View key={c.name} style={styles.countryRow}>
            <Text style={styles.countryName}>{c.name}</Text>
            <View style={styles.countryBar}>
              <View style={[styles.countryFill, { width: `${c.pct}%` as any, backgroundColor: c.color }]} />
            </View>
            <Text style={[styles.countryPct, { color: c.color }]}>{c.pct}%</Text>
          </View>
        ))}
      </View>

      {tier >= 3 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADVANCED — TIER 3</Text>
          <View style={styles.statGrid}>
            <StatCard label="Revenue" value="$312" color={Colors.accent} />
            <StatCard label="Growth" value="+28%" color={Colors.success} />
            <StatCard label="Retention" value="68%" color={Colors.secondary} />
            <StatCard label="Ad Revenue" value="$44" color={Colors.primary} />
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MonetizationTab({ tier }: { tier: Tier }) {
  if (tier < 2) return <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}><LockedCard minTier={2} title="Monetization" /></View>;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Earnings summary */}
      <View style={[styles.earningsCard, glowBox(Colors.success, 12)]}>
        <Text style={styles.earningsLabel}>TOTAL EARNINGS</Text>
        <Text style={[styles.earningsTotal, glowText(Colors.success)]}>
          ${(OVERVIEW.tips + OVERVIEW.marketRevenue).toFixed(2)}
        </Text>
        <Text style={styles.earningsSub}>This month · +14% vs last month</Text>
        <TouchableOpacity style={[styles.withdrawBtn, glowBox(Colors.success, 8)]}>
          <Text style={styles.withdrawBtnText}>Withdraw to Wallet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BREAKDOWN</Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, glowBorder(Colors.primary)]}>
            <Text style={styles.breakdownIcon}>◈</Text>
            <Text style={[styles.breakdownVal, glowText(Colors.primary)]}>$87.50</Text>
            <Text style={styles.breakdownLabel}>Tips Received</Text>
            <Text style={styles.breakdownCount}>34 tips</Text>
          </View>
          <View style={[styles.breakdownCard, glowBorder(Colors.secondary)]}>
            <Text style={styles.breakdownIcon}>◇</Text>
            <Text style={[styles.breakdownVal, glowText(Colors.secondary)]}>$224.50</Text>
            <Text style={styles.breakdownLabel}>Marketplace</Text>
            <Text style={styles.breakdownCount}>12 sales</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT PAYOUTS</Text>
        {[
          { date: 'Jun 01', amount: 145.20, method: 'USDT Wallet', status: 'complete' },
          { date: 'May 15', amount: 98.40,  method: 'NGN Transfer', status: 'complete' },
          { date: 'May 01', amount: 210.00, method: 'USDT Wallet',  status: 'complete' },
        ].map((p, i) => (
          <View key={i} style={styles.payoutRow}>
            <View>
              <Text style={styles.payoutDate}>{p.date}</Text>
              <Text style={styles.payoutMethod}>{p.method}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.payoutAmount, glowText(Colors.success)]}>+${p.amount.toFixed(2)}</Text>
              <Text style={[styles.payoutStatus, { color: Colors.success }]}>{p.status}</Text>
            </View>
          </View>
        ))}
      </View>

      {tier >= 3 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STOREFRONT PERKS — TIER 3</Text>
          <View style={[styles.perksCard, glowBorder(Colors.accent)]}>
            <View style={styles.perkRow}><Text style={[styles.perkDot, { color: Colors.accent }]}>◆</Text><Text style={styles.perkText}>Priority placement in search results</Text></View>
            <View style={styles.perkRow}><Text style={[styles.perkDot, { color: Colors.accent }]}>◆</Text><Text style={styles.perkText}>Featured Seller badge on your store</Text></View>
            <View style={styles.perkRow}><Text style={[styles.perkDot, { color: Colors.accent }]}>◆</Text><Text style={styles.perkText}>0% platform fee on first 10 sales/mo</Text></View>
            <View style={styles.perkRow}><Text style={[styles.perkDot, { color: Colors.accent }]}>◆</Text><Text style={styles.perkText}>Dedicated seller support</Text></View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function LiveTab({ tier }: { tier: Tier }) {
  const [isLiveModalOpen, setLiveModalOpen] = useState(false);
  if (tier < 2) return <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}><LockedCard minTier={2} title="Live Studio" /></View>;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.liveHero, glowBox(Colors.accent, 16)]}>
        <Text style={[styles.liveHeroIcon, glowText(Colors.accent)]}>◉</Text>
        <Text style={styles.liveHeroTitle}>Go Live</Text>
        <Text style={styles.liveHeroSub}>Broadcast to your followers in real time</Text>
        <TouchableOpacity style={[styles.goLiveBtn, glowBox(Colors.accent, 10)]} onPress={() => setLiveModalOpen(true)}>
          <Text style={styles.goLiveBtnText}>Start Live Stream</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STREAM SETTINGS</Text>
        <View style={styles.sectionBody}>
          {[
            ['Stream Key', 'sk-••••••••••••••••'],
            ['Quality', '1080p 30fps'],
            ['Latency', 'Low'],
            ['Chat',    'Enabled'],
          ].map(([k, v]) => (
            <View key={k} style={styles.streamRow}>
              <Text style={styles.streamKey}>{k}</Text>
              <Text style={styles.streamVal}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PAST STREAMS</Text>
        {[
          { date: 'Jun 12', title: 'Afrobeats Session',    viewers: 1240, duration: '1h 22m', revenue: 34.5  },
          { date: 'Jun 07', title: 'Tech Talk Africa',      viewers: 880,  duration: '48m',    revenue: 18.0  },
          { date: 'May 30', title: 'Friday Night Vibes',    viewers: 2100, duration: '2h 05m', revenue: 61.2  },
        ].map((s, i) => (
          <View key={i} style={styles.streamRecord}>
            <View style={[styles.streamThumb, glowBorder(Colors.accent)]} />
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle}>{s.title}</Text>
              <Text style={styles.streamMeta}>{s.date} · {s.duration} · {s.viewers.toLocaleString()} viewers</Text>
            </View>
            <Text style={[styles.streamRevenue, glowText(Colors.success)]}>+${s.revenue.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />

      <Modal visible={isLiveModalOpen} transparent animationType="slide" onRequestClose={() => setLiveModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, glowBorder(Colors.accent)]}>
            <Text style={[styles.modalTitle, { color: Colors.accent }]}>Start Live Stream</Text>
            <View style={[styles.livePreview, glowBox(Colors.accent, 6)]}>
              <Text style={[styles.livePreviewText, glowText(Colors.accent)]}>◉  LIVE PREVIEW</Text>
            </View>
            <Text style={styles.modalNote}>Your camera & mic will be requested when the stream starts.</Text>
            <TouchableOpacity style={[styles.goLiveBtn, glowBox(Colors.accent, 10), { marginTop: 16 }]} onPress={() => setLiveModalOpen(false)}>
              <Text style={styles.goLiveBtnText}>Go Live Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLiveModalOpen(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Analytics', 'Monetize', 'Live'] as const;
type StudioTab = typeof TABS[number];

export default function StudioScreen({ onClose }: { onClose?: () => void }) {
  const tier = useAppStore((s) => s.tier);
  const [activeTab, setActiveTab] = useState<StudioTab>('Dashboard');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.headerTitle, glowText(Colors.primary)]}>Creator Studio</Text>
          <Text style={styles.headerSub}>Tier {tier} — {TIER_NAMES[tier]}</Text>
        </View>
        <View style={[styles.tierBadge, glowBox(Colors.primary, 4)]}>
          <Text style={[styles.tierBadgeText, glowText(Colors.primary)]}>T{tier}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            {activeTab === t && <View style={[styles.tabUnderline, glowBox(Colors.primary, 3)]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Dashboard'  && <DashboardTab tier={tier} />}
        {activeTab === 'Analytics'  && <AnalyticsTab tier={tier} />}
        {activeTab === 'Monetize'   && <MonetizationTab tier={tier} />}
        {activeTab === 'Live'       && <LiveTab tier={tier} />}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backBtnText: { color: Colors.primary, fontSize: 28 },
  headerTitle: { color: Colors.primary, fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5 },
  headerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1, fontFamily: 'Inter_400Regular' },
  tierBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  tierBadgeText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', position: 'relative' },
  tabActive: {},
  tabText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  tabTextActive: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, borderRadius: 1, backgroundColor: Colors.primary,
  },

  // Stats
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  statCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { color: Colors.primary, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  statLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: 'SpaceGrotesk_500Medium' },
  statSub: { color: Colors.textDim, fontSize: 10, marginTop: 2, fontFamily: 'Inter_400Regular' },

  // Section
  section: { marginTop: 6, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  sectionAction: { color: Colors.primary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
  sectionBody: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },

  // Content rows
  contentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  contentThumb: {
    width: 64, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  contentThumbLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  contentInfo: { flex: 1 },
  contentTitle: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 4 },
  contentMeta: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  contentStat: { color: Colors.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', borderWidth: 1 },
  statusText: { fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase' },
  contentRevenue: { alignItems: 'flex-end', gap: 6 },
  contentRevenueVal: { color: Colors.success, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },
  editBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  editBtnText: { color: Colors.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Chart
  chart: { margin: 16, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartBarVal: { color: Colors.textDim, fontSize: 9, marginBottom: 3 },
  chartBarTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 4, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary },
  chartDay: { color: Colors.textMuted, fontSize: 9, marginTop: 4 },

  // Engagement
  engagGrid: { flexDirection: 'row', gap: 10 },
  engagCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  engagValue: { color: Colors.primary, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  engagLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 4, textAlign: 'center', fontFamily: 'SpaceGrotesk_500Medium' },

  // Best times
  timesRow: { flexDirection: 'row', gap: 10 },
  timeChip: { flex: 1, backgroundColor: Colors.primaryGlow, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  timeVal: { color: Colors.primary, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  timeLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: 'SpaceGrotesk_500Medium' },

  // Countries
  countryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  countryName: { color: Colors.text, fontSize: 13, width: 90 },
  countryBar: { flex: 1, height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  countryFill: { height: '100%', borderRadius: 3 },
  countryPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  // Earnings
  earningsCard: {
    margin: 16, marginTop: 16, borderRadius: 20, padding: 24,
    backgroundColor: Colors.successGlow, borderWidth: 1, borderColor: Colors.success + '40',
  },
  earningsLabel: { color: Colors.success + 'AA', fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 2, textTransform: 'uppercase' },
  earningsTotal: { color: Colors.success, fontSize: 40, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4 },
  earningsSub: { color: Colors.success + '88', fontSize: 13, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  withdrawBtn: {
    backgroundColor: Colors.success + '22', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.success,
  },
  withdrawBtnText: { color: Colors.success, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },

  // Breakdown
  breakdownRow: { flexDirection: 'row', gap: 10 },
  breakdownCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  breakdownIcon: { color: Colors.primary, fontSize: 24, marginBottom: 8 },
  breakdownVal: { color: Colors.primary, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  breakdownLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4, fontFamily: 'SpaceGrotesk_500Medium' },
  breakdownCount: { color: Colors.textDim, fontSize: 11, marginTop: 2, fontFamily: 'Inter_400Regular' },

  // Payouts
  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  payoutDate: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  payoutMethod: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  payoutAmount: { color: Colors.success, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  payoutStatus: { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'SpaceGrotesk_500Medium' },

  // Storefront perks
  perksCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.accent + '40' },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  perkDot: { fontSize: 10 },
  perkText: { color: Colors.text, fontSize: 14, flex: 1, fontFamily: 'Inter_400Regular' },

  // Live
  liveHero: {
    margin: 16, borderRadius: 20, padding: 24, alignItems: 'center',
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + '40',
  },
  liveHeroIcon: { fontSize: 40, color: Colors.accent, marginBottom: 10 },
  liveHeroTitle: { color: Colors.text, fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 6 },
  liveHeroSub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20, fontFamily: 'Inter_400Regular' },
  goLiveBtn: {
    backgroundColor: Colors.accentGlow, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.accent,
  },
  goLiveBtnText: { color: Colors.accent, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },

  streamRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  streamKey: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  streamVal: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  streamRecord: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  streamThumb: { width: 56, height: 36, borderRadius: 8, backgroundColor: Colors.surface },
  streamInfo: { flex: 1 },
  streamTitle: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  streamMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2, fontFamily: 'Inter_400Regular' },
  streamRevenue: { color: Colors.success, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },

  livePreview: {
    width: '100%', height: 140, borderRadius: 12,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.accent,
    marginVertical: 16,
  },
  livePreviewText: { color: Colors.accent, fontWeight: '800', fontSize: 16, letterSpacing: 2 },
  modalNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },

  // Upload CTA
  uploadCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: Colors.surfaceAlt, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  uploadCtaIcon: { color: Colors.primary, fontSize: 22, width: 28, textAlign: 'center' },
  uploadCtaTitle: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  uploadCtaSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  uploadCtaArrow: { color: Colors.textMuted, fontSize: 20 },

  // Locked
  lockedCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.secondary,
  },
  lockedIcon: { fontSize: 40, color: Colors.secondary, marginBottom: 14 },
  lockedTitle: { color: Colors.text, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 8 },
  lockedSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 8 },
});

const uploadStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerBack: { color: Colors.primary, fontSize: 26, width: 44 },
  headerTitle: { color: Colors.text, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  publishBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  publishBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  pickWrap: { flex: 1, padding: 24 },
  pickHero: { alignItems: 'center', paddingVertical: 32 },
  pickHeroIcon: { color: Colors.primary, fontSize: 48, marginBottom: 14 },
  pickHeroTitle: { color: Colors.text, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 6 },
  pickHeroSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  pickOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surfaceAlt, borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickOptionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  pickOptionIconText: { color: Colors.primary, fontSize: 18 },
  pickOptionLabel: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  pickOptionSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  pickOptionChevron: { color: Colors.textMuted, fontSize: 22 },

  detailsWrap: { padding: 16, paddingBottom: 40 },
  previewThumb: {
    width: '100%', height: 200, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, position: 'relative',
    borderWidth: 1, borderColor: Colors.border,
  },
  previewThumbIcon: { color: 'rgba(255,255,255,0.2)', fontSize: 56 },
  previewBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.overlay, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  previewBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1 },

  fieldLabel: {
    color: Colors.textMuted, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceAlt, color: Colors.text,
    borderRadius: 12, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border,
    fontFamily: 'Inter_400Regular',
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },

  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  visibilityChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  visibilityChipText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  visibilityChipTextActive: { color: '#fff' },

  shareBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },

  statusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  statusTitle: { color: Colors.text, fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 8 },
  statusSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 24 },

  progressTrack: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: Colors.surfaceAlt, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  progressPct: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

  doneCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  doneCheck: { color: Colors.primary, fontSize: 36 },
});
