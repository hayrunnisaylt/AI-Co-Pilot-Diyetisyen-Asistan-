import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function Sohbet() {
  const [mesajInput, setMesajInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchEmail = async () => {
      const email = await AsyncStorage.getItem('email');
      if (email) setUserEmail(email);
    };
    fetchEmail();
  }, []);

  // Başlangıç (Örnek) Mesajları
  const [mesajlar, setMesajlar] = useState([
    { id: '1', text: 'Merhaba! Ben senin AI Diyet Koçunum. Bugün sana nasıl yardımcı olabilirim?', sender: 'ai', time: '10:00' },
  ]);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const mesajGonder = async () => {
    if (mesajInput.trim() === '') return;

    const userMsgText = mesajInput;

    // Kullanıcının mesajını ekle
    const yeniKullaniciMesaji = {
      id: Date.now().toString(),
      text: userMsgText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMesajlar(prev => [...prev, yeniKullaniciMesaji]);
    setMesajInput('');
    setIsTyping(true);

    // Scroll'u en alta kaydır
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await axios.post(`${API_URL}/ai-chat`, {
        mesaj: userMsgText,
        hasta_email: userEmail || 'danisan@gmail.com'
      }, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      const aiCevapText = response.data.cevap || 'Şu an yanıt veremiyorum, lütfen daha sonra tekrar deneyiniz.';

      const aiCevap = {
        id: (Date.now() + 1).toString(),
        text: aiCevapText,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMesajlar(prev => [...prev, aiCevap]);
    } catch (error) {
      console.error("AI Chat Hatası:", error);
      const hataMesaji = {
        id: (Date.now() + 1).toString(),
        text: "Üzgünüm, şu an bağlantı kuramadım. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMesajlar(prev => [...prev, hataMesaji]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerName}>AI Koç & Diyetisyen</Text>
            <Text style={styles.headerStatus}>Çevrimiçi</Text>
          </View>
        </View>
      </View>

      {/* SOHBET ALANI */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatArea} 
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {mesajlar.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageBubbleWrapper, 
                msg.sender === 'user' ? styles.messageUserWrapper : styles.messageAiWrapper
              ]}
            >
              <View style={[
                styles.messageBubble, 
                msg.sender === 'user' ? styles.messageUser : styles.messageAi
              ]}>
                <Text style={[
                  styles.messageText, 
                  msg.sender === 'user' ? styles.messageTextUser : styles.messageTextAi
                ]}>
                  {msg.text}
                </Text>
                <Text style={[
                  styles.messageTime, 
                  msg.sender === 'user' ? styles.messageTimeUser : styles.messageTimeAi
                ]}>
                  {msg.time}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubbleWrapper, styles.messageAiWrapper]}>
              <View style={[styles.messageBubble, styles.messageAi, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color="#27ae60" style={{ marginRight: 4 }} />
                <Text style={[styles.messageText, styles.messageTextAi, { color: '#666', fontStyle: 'italic' }]}>
                  AI Koç düşünüyor...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* MESAJ YAZMA ALANI */}
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.textInput}
            placeholder="Bir şeyler yaz..."
            placeholderTextColor="#999"
            value={mesajInput}
            onChangeText={setMesajInput}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={mesajGonder}>
            <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#eee',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { backgroundColor: '#3498db', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#2A3439' },
  headerStatus: { fontSize: 12, color: '#27ae60', fontWeight: '500' },
  
  chatArea: { padding: 15, paddingBottom: 20 },
  messageBubbleWrapper: { marginBottom: 15, flexDirection: 'row' },
  messageUserWrapper: { justifyContent: 'flex-end' },
  messageAiWrapper: { justifyContent: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  messageUser: { backgroundColor: '#27ae60', borderBottomRightRadius: 4 },
  messageAi: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
  
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#fff' },
  messageTextAi: { color: '#333' },
  
  messageTime: { fontSize: 11, marginTop: 5, alignSelf: 'flex-end' },
  messageTimeUser: { color: 'rgba(255,255,255,0.7)' },
  messageTimeAi: { color: '#aaa' },
  
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15, 
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' 
  },
  textInput: { 
    flex: 1, backgroundColor: '#f5f7fa', borderRadius: 20, paddingHorizontal: 15, 
    paddingTop: 12, paddingBottom: 12, fontSize: 15, color: '#333', maxHeight: 100 
  },
  sendButton: { 
    backgroundColor: '#2A3439', width: 45, height: 45, borderRadius: 25, 
    justifyContent: 'center', alignItems: 'center', marginLeft: 10 
  }
});