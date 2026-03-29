import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // NGROK LİNKİNİ GÜNCELLE
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 

  // Uygulama açılınca daha önce giriş yapılmış mı kontrol et
  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const user = await AsyncStorage.getItem('username');
    if (user) {
      // Eğer kullanıcı kayıtlıysa direkt ana sayfaya at
      router.replace('/(tabs)/hasta-home');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      
      if (response.data.status === 'success') {
        // İsmi telefona kaydet
        await AsyncStorage.setItem('username', username);
        Alert.alert("Hoşgeldin!", `Merhaba ${username}`);
        router.replace('/(tabs)/hasta-home');
      }
    } catch (error) {
      Alert.alert("Hata", "Kullanıcı adı veya şifre yanlış!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🥗 Diyet App</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Kullanıcı Adı" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Şifre" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Giriş Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
      </TouchableOpacity>
      
      {/* Diyetisyen girişi için gizli buton gibi düşünebilirsin veya ayrı buton koyabilirsin */}
      <TouchableOpacity onPress={() => router.push('/(tabs)/diyetisyen-home')} style={{marginTop: 20}}>
         <Text style={{color:'gray'}}>Diyetisyen Girişi (Demo)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2ecc71', marginBottom: 40 },
  input: { width: '100%', padding: 15, backgroundColor: 'white', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  btn: { width: '100%', padding: 15, backgroundColor: '#2ecc71', borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  linkText: { marginTop: 15, color: '#3498db', fontWeight: 'bold' }
});