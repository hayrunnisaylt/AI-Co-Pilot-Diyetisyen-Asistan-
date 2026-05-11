import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // true ise Giriş, false ise Kayıt ekranı
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Sadece kayıt olurken kullanılacak rol seçimi (Varsayılan: danisan)
  const [role, setRole] = useState('danisan'); 

  // 🔴
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert("Uyarı", "Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      if (isLogin) {
        // --- GİRİŞ YAPMA İŞLEMİ ---
        const response = await axios.post(`${API_URL}/login`, { username, password });
        
        if (response.data.status === 'success') {
          const userRole = response.data.role; // Backend'den (MongoDB) dönen rol
          
          // Bilgileri cihaza kaydet
          await AsyncStorage.setItem('username', username);
          await AsyncStorage.setItem('role', userRole);
          
          // Role göre yönlendir
          if (userRole === 'diyetisyen') {
            router.replace('/(tabs)/diyetisyen-home');
          } else {
            router.replace('/(tabs)/hasta-home');
          }
        }
      } else {
        // --- KAYIT OLMA İŞLEMİ ---
        const response = await axios.post(`${API_URL}/register`, { 
          username, 
          password, 
          role 
        });
        
        if (response.data.status === 'success') {
          Alert.alert("Başarılı", "Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.");
          setIsLogin(true); // Kayıt başarılıysa giriş ekranına döndür
          setPassword(''); // Şifreyi temizle
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Sunucuya ulaşılamadı. Ngrok linkini kontrol et.";
      Alert.alert("Hata", errorMsg);
    }
  };

  return (
    <LinearGradient colors={['#fdfcfb', '#e2d1c3']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.content}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{isLogin ? 'Hoşgeldin' : 'Kayıt Ol'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Devam etmek için giriş yapın.' : 'Yeni bir hesap oluşturun.'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Kullanıcı Adı" 
            placeholderTextColor="#888"
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize="none"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Şifre" 
            placeholderTextColor="#888"
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />

          {/* Sadece kayıt ekranında rol seçimi gösterilecek */}
          {!isLogin && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Hesap Türü:</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity 
                  style={[styles.roleBtn, role === 'danisan' && styles.roleBtnActive]}
                  onPress={() => setRole('danisan')}
                >
                  <Text style={[styles.roleBtnText, role === 'danisan' && styles.roleBtnTextActive]}>Danışan</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleBtn, role === 'diyetisyen' && styles.roleBtnActive]}
                  onPress={() => setRole('diyetisyen')}
                >
                  <Text style={[styles.roleBtnText, role === 'diyetisyen' && styles.roleBtnTextActive]}>Diyetisyen</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.mainButton} activeOpacity={0.8} onPress={handleAuth}>
            <Text style={styles.mainButtonText}>{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {isLogin ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.footerLink}>{isLogin ? "Kayıt Ol" : "Giriş Yap"}</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  headerContainer: { marginBottom: 40 },
  title: { fontSize: 38, fontWeight: '900', color: '#2d2d3a', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#555', marginTop: 10, fontWeight: '500' },
  formContainer: { gap: 15 },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  roleContainer: { marginTop: 5, marginBottom: 5 },
  roleLabel: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '600' },
  roleButtons: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  roleBtnActive: { backgroundColor: '#2d2d3a', borderColor: '#2d2d3a' },
  roleBtnText: { color: '#555', fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },
  mainButton: {
    backgroundColor: '#2d2d3a',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  footerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#555', fontSize: 15 },
  footerLink: { color: '#2d2d3a', fontSize: 15, fontWeight: 'bold' },
});