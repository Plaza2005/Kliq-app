import { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';
import OtherUserProfile from '../../components/shared/OtherUserProfile';
import { MOCK_USERS, MockUser } from '../../constants/users';

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  isCommunity: boolean;
  online: boolean;
  color: string;
  memberCount?: number;
};

type Message = {
  id: string;
  text: string;
  sender: string;
  time: string;
  isMine: boolean;
  type: 'text' | 'crypto' | 'media';
  amount?: number;
  token?: string;
};

const MOCK_CONVOS: Conversation[] = [
  { id: '1', name: 'African Entrepreneurs', lastMessage: 'Who wants to collab?',    time: '2m',  unread: 12, isGroup: true,  isCommunity: true,  online: false, color: Colors.secondary, memberCount: 4812  },
  { id: '2', name: 'creator_1',             lastMessage: 'Thanks for the tip',       time: '15m', unread: 0,  isGroup: false, isCommunity: false, online: true,  color: Colors.primary                    },
  { id: '3', name: 'SuperApp Official',      lastMessage: 'New features dropped!',   time: '1h',  unread: 3,  isGroup: false, isCommunity: false, online: true,  color: Colors.accent                     },
  { id: '4', name: 'Naija Tech Hub',         lastMessage: 'Join the space tonight',  time: '3h',  unread: 0,  isGroup: true,  isCommunity: true,  online: false, color: Colors.success,   memberCount: 237  },
  { id: '5', name: 'seller_5',               lastMessage: 'Item is ready to ship',   time: '5h',  unread: 1,  isGroup: false, isCommunity: false, online: false, color: Colors.NGN                        },
  { id: '6', name: 'Crypto Traders Africa',  lastMessage: 'BTC just broke $70k!',   time: '1d',  unread: 27, isGroup: true,  isCommunity: true,  online: false, color: Colors.accent,    memberCount: 18300 },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', text: 'Hey! Loved your latest video',              sender: 'creator_1', time: '10:30', isMine: false, type: 'text' },
  { id: '2', text: 'Thank you so much! Glad you enjoyed it',    sender: 'me',        time: '10:31', isMine: true,  type: 'text' },
  { id: '3', text: '',                                          sender: 'creator_1', time: '10:32', isMine: false, type: 'crypto', amount: 5, token: 'USDT' },
  { id: '4', text: 'Small tip for your content',                sender: 'creator_1', time: '10:32', isMine: false, type: 'text' },
  { id: '5', text: 'Wow thank you!! This means a lot',          sender: 'me',        time: '10:33', isMine: true,  type: 'text' },
];

function ConvoItem({ item, onPress, onAvatarPress }: { item: Conversation; onPress: () => void; onAvatarPress: () => void }) {
  return (
    <TouchableOpacity style={styles.convoRow} onPress={onPress}>
      <TouchableOpacity style={styles.avatarWrap} onPress={onAvatarPress}>
        <View style={[styles.convoAvatar, { backgroundColor: item.color + '18', borderWidth: 1, borderColor: item.color + '40' }]}>
          <Text style={[styles.convoAvatarText, { color: item.color }]}>
            {item.isGroup ? (item.isCommunity ? '#' : 'G') : item.name[0].toUpperCase()}
          </Text>
        </View>
        {item.online && <View style={[styles.onlineDot, glowBox(Colors.success, 4)]} />}
      </TouchableOpacity>
      <View style={styles.convoInfo}>
        <View style={styles.convoHeader}>
          <Text style={styles.convoName}>{item.isGroup ? item.name : '@' + item.name}</Text>
          <Text style={styles.convoTime}>{item.time}</Text>
        </View>
        <View style={styles.convoFooter}>
          <Text style={styles.convoLast} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unread > 0 && (
            <View style={[styles.unreadBadge, glowBox(Colors.primary, 4)]}>
              <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatRoom({ convo, onBack, onAvatarPress }: { convo: Conversation; onBack: () => void; onAvatarPress?: () => void }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const listRef = useRef<FlatList>(null);

  const statusLine = convo.online
    ? 'online'
    : convo.isGroup && convo.memberCount
    ? `${convo.memberCount.toLocaleString()} members`
    : 'last seen recently';

  const send = () => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { id: String(Date.now()), text, sender: 'me', time: 'now', isMine: true, type: 'text' }]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={!convo.isGroup ? onAvatarPress : undefined}>
          <View style={[styles.chatAvatar, { backgroundColor: convo.color + '18', borderColor: convo.color + '40', borderWidth: 1 }]}>
            <Text style={{ color: convo.color, fontWeight: '800', fontSize: 15 }}>
              {convo.isGroup ? '#' : convo.name[0].toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.chatName}>{convo.isGroup ? convo.name : '@' + convo.name}</Text>
          <Text style={[styles.chatStatus, convo.online && { color: Colors.success }]}>{statusLine}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {msg.type === 'crypto' ? (
              <View style={[styles.cryptoBubble, glowBorder(Colors.success)]}>
                <Text style={[styles.cryptoIcon, glowText(Colors.success)]}>◈</Text>
                <Text style={[styles.cryptoAmount, glowText(Colors.success)]}>+{msg.amount} {msg.token}</Text>
                <Text style={styles.cryptoLabel}>Tip received</Text>
              </View>
            ) : (
              <Text style={[styles.bubbleText, msg.isMine && styles.bubbleTextMine]}>{msg.text}</Text>
            )}
            <Text style={[styles.bubbleTime, msg.isMine && { color: 'rgba(0,207,255,0.5)' }]}>{msg.time}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn}>
          <Text style={{ color: Colors.textMuted, fontSize: 20 }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cryptoBtn}>
          <Text style={[styles.cryptoBtnIcon, glowText(Colors.success)]}>◈</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.msgInput}
          placeholder="Message..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, glowBox(Colors.primary, 6)]} onPress={send}>
          <Text style={[styles.sendBtnText, glowText(Colors.primary)]}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ChatScreen() {
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [tab, setTab] = useState<'chats' | 'communities'>('chats');
  const [openUser, setOpenUser] = useState<MockUser | null>(null);

  const handleAvatarPress = (convo: Conversation) => {
    if (!convo.isGroup) {
      const u = MOCK_USERS[convo.name];
      if (u) setOpenUser(u);
    }
  };

  if (activeConvo) return (
    <>
      <ChatRoom convo={activeConvo} onBack={() => setActiveConvo(null)} onAvatarPress={() => handleAvatarPress(activeConvo)} />
      <OtherUserProfile user={openUser} onClose={() => setOpenUser(null)} />
    </>
  );

  const filtered = MOCK_CONVOS.filter((c) => (tab === 'communities' ? c.isCommunity : !c.isCommunity));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={[styles.newChatBtn, glowBorder(Colors.primary)]}>
          <Text style={[styles.newChatIcon, glowText(Colors.primary)]}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'chats' && styles.tabActive]} onPress={() => setTab('chats')}>
          <Text style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'communities' && styles.tabActive]} onPress={() => setTab('communities')}>
          <Text style={[styles.tabText, tab === 'communities' && styles.tabTextActive]}>Communities</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConvoItem
            item={item}
            onPress={() => setActiveConvo(item)}
            onAvatarPress={() => handleAvatarPress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 76 }} />}
      />

      <OtherUserProfile user={openUser} onClose={() => setOpenUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  title: { color: Colors.text, fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5 },
  newChatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  newChatIcon: { color: Colors.primary, fontSize: 20, fontWeight: '300' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 20 },
  tab: { paddingBottom: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  convoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  convoAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  convoAvatarText: { fontSize: 20, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background },
  convoInfo: { flex: 1 },
  convoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convoName: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  convoTime: { color: Colors.textMuted, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' },
  convoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoLast: { color: Colors.textMuted, fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  unreadBadge: { backgroundColor: Colors.primaryGlow, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8, borderWidth: 1, borderColor: Colors.primary },
  unreadText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  chatContainer: { flex: 1, backgroundColor: Colors.background },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  backBtn: { padding: 4 },
  backBtnText: { color: Colors.primary, fontSize: 28, fontWeight: '300' },
  chatAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  chatName: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  chatStatus: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  messageList: { padding: 16, gap: 8, paddingBottom: 20 },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleMine: { backgroundColor: Colors.primaryGlow, alignSelf: 'flex-end', borderBottomRightRadius: 4, borderWidth: 1, borderColor: Colors.primary + '40' },
  bubbleTheirs: { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { color: Colors.text, fontSize: 15 },
  bubbleTextMine: { color: Colors.primary },
  bubbleTime: { color: Colors.textMuted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  cryptoBubble: { alignItems: 'center', padding: 8, borderRadius: 12 },
  cryptoIcon: { fontSize: 28, color: Colors.success },
  cryptoAmount: { color: Colors.success, fontSize: 18, fontWeight: '800', marginTop: 4 },
  cryptoLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  attachBtn: { padding: 8, justifyContent: 'center' },
  cryptoBtn: { padding: 8, justifyContent: 'center' },
  cryptoBtnIcon: { fontSize: 20, color: Colors.success },
  msgInput: { flex: 1, backgroundColor: Colors.surface, color: Colors.text, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  sendBtnText: { color: Colors.primary, fontSize: 20, fontWeight: '700' },
});
