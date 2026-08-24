import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { RootStackParamList, ChatMessage } from '../types';
import { COLORS } from '../constants/app';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { conversationId, otherUserName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    setCurrentUserId(userId);

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!error) setMessages((data || []) as ChatMessage[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const message = payload.new as ChatMessage;
          setMessages(previous =>
            previous.some(item => item.id === message.id)
              ? previous
              : [message, ...previous],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUserId)
      .then(({ error }) => {
        if (error) console.error('[ChatRoom] gagal menandai pesan dibaca:', error.message);
      });
  }, [conversationId, currentUserId, messages.length]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !currentUserId || sending) return;

    setSending(true);
    const clientMessageId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body,
        client_message_id: clientMessageId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[ChatRoom] gagal mengirim pesan:', error.message);
    } else if (data) {
      setMessages(previous => [data as ChatMessage, ...previous]);
      setDraft('');
    }
    setSending(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.messageBody, isMine && styles.messageBodyMine]}>{item.body}</Text>
          <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
            {new Date(item.created_at).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{otherUserName}</Text>
          <Text style={styles.subtitle}>Percakapan pribadi</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada pesan. Mulai percakapan.</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Tulis pesan..."
          placeholderTextColor={COLORS.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          accessibilityLabel="Kirim pesan"
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: {
    backgroundColor: COLORS.white,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.primary, fontSize: 22 },
  titleBlock: { flex: 1, marginLeft: 12 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, flexGrow: 1, justifyContent: 'flex-start' },
  messageRow: { marginVertical: 4, flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 5 },
  bubbleOther: { backgroundColor: COLORS.white, borderBottomLeftRadius: 5 },
  messageBody: { color: COLORS.text, fontSize: 15, lineHeight: 20 },
  messageBodyMine: { color: COLORS.white },
  messageTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right' },
  messageTimeMine: { color: 'rgba(255,255,255,0.75)' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
});