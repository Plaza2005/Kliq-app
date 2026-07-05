import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';

const TOKENS = [
  { symbol: 'BTC',  name: 'Bitcoin',          icon: 'B',   color: '#F7931A' },
  { symbol: 'ETH',  name: 'Ethereum',          icon: 'E',   color: '#8B5CF6' },
  { symbol: 'USDT', name: 'Tether',            icon: 'U',   color: '#26A17B' },
  { symbol: 'NGN',  name: 'Nigerian Naira',    icon: 'N',   color: Colors.NGN },
  { symbol: 'KES',  name: 'Kenyan Shilling',   icon: 'K',   color: Colors.KES },
  { symbol: 'GHS',  name: 'Ghana Cedi',        icon: 'G',   color: Colors.GHS },
];

const BALANCES: Record<string, { amount: number; usdValue: number }> = {
  BTC:  { amount: 0.00234, usdValue: 145.2  },
  ETH:  { amount: 0.182,   usdValue: 520.4  },
  USDT: { amount: 340.0,   usdValue: 340.0  },
  NGN:  { amount: 85000,   usdValue: 56.3   },
  KES:  { amount: 12500,   usdValue: 97.1   },
  GHS:  { amount: 2300,    usdValue: 195.2  },
};

const MOCK_TXS = [
  { id: '1', type: 'receive', token: 'USDT', amount: 50,     usdValue: 50,   from: '@creator_1',    time: '2h ago'  },
  { id: '2', type: 'send',    token: 'NGN',  amount: 5000,   usdValue: 3.3,  to:   '@marketplace',  time: '5h ago'  },
  { id: '3', type: 'receive', token: 'BTC',  amount: 0.0001, usdValue: 6.2,  from: 'Tip',           time: '1d ago'  },
  { id: '4', type: 'buy',     token: 'USDT', amount: 100,    usdValue: 100,  time: '2d ago'                         },
  { id: '5', type: 'send',    token: 'ETH',  amount: 0.01,   usdValue: 28.5, to:   '@creator_7',    time: '3d ago'  },
];

export default function WalletScreen() {
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [modal, setModal] = useState<'send' | 'receive' | 'swap' | null>(null);
  const [modalToken, setModalToken] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');

  const totalUsd = Object.values(BALANCES).reduce((s, b) => s + b.usdValue, 0);

  const openModal = (type: 'send' | 'receive' | 'swap', token = 'USDT') => {
    setModalToken(token);
    setModal(type);
    setAmount('');
    setAddress('');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={[styles.balanceCard, glowBox(Colors.primary, 16)]}>
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
          <Text style={[styles.balanceAmount, glowText(Colors.primary)]}>
            ${totalUsd.toFixed(2)}
          </Text>
          <Text style={styles.balanceChange}>+2.4% today</Text>
          <View style={styles.actionRow}>
            {(['Send', 'Receive', 'Swap', 'Buy'] as const).map((action) => (
              <TouchableOpacity key={action} style={styles.actionBtn} onPress={() => {
                if (action === 'Send') openModal('send');
                else if (action === 'Receive') openModal('receive');
                else if (action === 'Swap') openModal('swap');
              }}>
                <View style={[styles.actionIcon, glowBox(Colors.primary, 6)]}>
                  <Text style={[styles.actionIconText, glowText(Colors.primary)]}>
                    {action === 'Send' ? '↑' : action === 'Receive' ? '↓' : action === 'Swap' ? '⇌' : '+'}
                  </Text>
                </View>
                <Text style={styles.actionLabel}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>ASSETS</Text>
        {TOKENS.map((token) => {
          const bal = BALANCES[token.symbol];
          const isActive = activeToken === token.symbol;
          return (
            <View key={token.symbol}>
              <TouchableOpacity
                style={[styles.assetRow, isActive && styles.assetRowActive]}
                onPress={() => setActiveToken(isActive ? null : token.symbol)}
              >
                <View style={[styles.tokenIcon, { backgroundColor: token.color + '18', borderColor: token.color + '40', borderWidth: 1 }]}>
                  <Text style={[styles.tokenIconText, { color: token.color }]}>{token.icon}</Text>
                </View>
                <View style={styles.assetInfo}>
                  <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.assetAmount}>{bal.amount}</Text>
                  <Text style={styles.assetUsd}>${bal.usdValue.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
              {isActive && (
                <View style={styles.tokenActions}>
                  <TouchableOpacity style={[styles.tokenActionBtn, glowBorder(token.color)]} onPress={() => openModal('send', token.symbol)}>
                    <Text style={[styles.tokenActionText, { color: token.color }]}>↑ Send</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tokenActionBtn, glowBorder(token.color)]} onPress={() => openModal('receive', token.symbol)}>
                    <Text style={[styles.tokenActionText, { color: token.color }]}>↓ Receive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tokenActionBtn, glowBorder(token.color)]} onPress={() => openModal('swap', token.symbol)}>
                    <Text style={[styles.tokenActionText, { color: token.color }]}>⇌ Swap</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        {MOCK_TXS.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={[styles.txIcon, {
              backgroundColor: tx.type === 'receive' ? Colors.successGlow : Colors.primaryGlow,
              borderWidth: 1,
              borderColor: tx.type === 'receive' ? Colors.success + '40' : Colors.primary + '40',
            }]}>
              <Text style={[styles.txIconText, { color: tx.type === 'receive' ? Colors.success : Colors.primary }]}>
                {tx.type === 'receive' ? '↓' : tx.type === 'send' ? '↑' : tx.type === 'buy' ? '+' : '⇌'}
              </Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} {tx.token}</Text>
              <Text style={styles.txMeta}>{(tx as any).from ?? (tx as any).to ?? ''} · {tx.time}</Text>
            </View>
            <View style={styles.txAmount}>
              <Text style={[styles.txAmountText, { color: tx.type === 'receive' ? Colors.success : Colors.text }]}>
                {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.token}
              </Text>
              <Text style={styles.txUsd}>${tx.usdValue.toFixed(2)}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Send modal */}
      <Modal visible={modal === 'send'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, glowBorder(Colors.primary)]}>
            <Text style={styles.modalTitle}>Send {modalToken}</Text>
            <View style={styles.tokenPicker}>
              {TOKENS.map((t) => (
                <TouchableOpacity key={t.symbol} style={[styles.tokenChip, modalToken === t.symbol && { backgroundColor: t.color + '22', borderColor: t.color }]} onPress={() => setModalToken(t.symbol)}>
                  <Text style={[styles.tokenChipText, modalToken === t.symbol && { color: t.color }]}>{t.symbol}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.modalInput} placeholder="Recipient address or @username" placeholderTextColor={Colors.textMuted} value={address} onChangeText={setAddress} />
            <TextInput style={styles.modalInput} placeholder={`Amount (${modalToken})`} placeholderTextColor={Colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <TouchableOpacity style={[styles.modalBtn, glowBox(Colors.primary, 6)]} onPress={() => setModal(null)}>
              <Text style={styles.modalBtnText}>Send {modalToken}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receive modal */}
      <Modal visible={modal === 'receive'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, glowBorder(Colors.primary)]}>
            <Text style={styles.modalTitle}>Receive {modalToken}</Text>
            <View style={styles.tokenPicker}>
              {TOKENS.map((t) => (
                <TouchableOpacity key={t.symbol} style={[styles.tokenChip, modalToken === t.symbol && { backgroundColor: t.color + '22', borderColor: t.color }]} onPress={() => setModalToken(t.symbol)}>
                  <Text style={[styles.tokenChipText, modalToken === t.symbol && { color: t.color }]}>{t.symbol}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.qrPlaceholder, glowBorder(Colors.primary)]}>
              <Text style={[styles.qrText, glowText(Colors.primary)]}>[ QR ]</Text>
            </View>
            <Text style={styles.addressText}>0x1a2b3c4d...ef56</Text>
            <TouchableOpacity style={[styles.modalBtn, glowBox(Colors.primary, 6)]}>
              <Text style={styles.modalBtnText}>Copy Address</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Swap modal */}
      <Modal visible={modal === 'swap'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, glowBorder(Colors.secondary)]}>
            <Text style={[styles.modalTitle, glowText(Colors.secondary)]}>Swap</Text>
            <TextInput style={styles.modalInput} placeholder={`From: ${modalToken} amount`} placeholderTextColor={Colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Text style={{ color: Colors.secondary, textAlign: 'center', marginVertical: 10, fontSize: 22 }}>⇌</Text>
            <TextInput style={styles.modalInput} placeholder="To: token (e.g. USDT)" placeholderTextColor={Colors.textMuted} />
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.secondaryGlow, borderColor: Colors.secondary }, glowBox(Colors.secondary, 6)]} onPress={() => setModal(null)}>
              <Text style={[styles.modalBtnText, { color: Colors.secondary }]}>Swap</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  balanceCard: {
    margin: 16, marginTop: 52, borderRadius: 20, padding: 24,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1, borderColor: Colors.borderGlow,
  },
  balanceLabel: { color: Colors.primary + 'AA', fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 2, textTransform: 'uppercase' },
  balanceAmount: { color: Colors.primary, fontSize: 42, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4 },
  balanceChange: { color: Colors.success, fontSize: 13, marginBottom: 24, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center' },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.background + '88',
    borderWidth: 1, borderColor: Colors.primary + '40',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  actionIconText: { color: Colors.primary, fontSize: 18 },
  actionLabel: { color: Colors.text, fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', opacity: 0.7 },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 1.5, marginHorizontal: 16, marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  assetRowActive: { backgroundColor: Colors.surface },
  tokenIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenIconText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  assetInfo: { flex: 1 },
  tokenSymbol: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  tokenName: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  assetBalance: { alignItems: 'flex-end' },
  assetAmount: { color: Colors.text, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  assetUsd: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'SpaceGrotesk_500Medium' },
  tokenActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tokenActionBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tokenActionText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIconText: { fontSize: 16 },
  txInfo: { flex: 1 },
  txType: { color: Colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  txMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  txAmount: { alignItems: 'flex-end' },
  txAmountText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
  txUsd: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'SpaceGrotesk_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.primary, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 16 },
  tokenPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tokenChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  tokenChipText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  modalInput: { backgroundColor: Colors.surfaceAlt, color: Colors.text, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: 'Inter_400Regular' },
  modalBtn: { backgroundColor: Colors.primaryGlow, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.primary },
  modalBtnText: { color: Colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  qrPlaceholder: { alignItems: 'center', marginVertical: 20, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  qrText: { color: Colors.primary, fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 8 },
  addressText: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, marginBottom: 20, fontFamily: 'Inter_400Regular' },
});
