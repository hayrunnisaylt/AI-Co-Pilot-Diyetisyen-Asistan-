import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // NGROK LİNKİNİ GÜNCELLE
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      Alert.alert("Başarılı", "Kayıt oldunuz! Şimdi giriş yapabilirsiniz.");
      router.back(); // Giriş ekranına dön
    } catch (error) {
      Alert.alert("Hata", "Bu kullanıcı adı zaten alınmış olabilir.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🆕 Yeni Hesap</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Kullanıcı Adı Seçin" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Şifre Belirleyin" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />

      <TouchableOpacity style={styles.btn} onPress={handleRegister}>
        <Text style={styles.btnText}>Kayıt Ol</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>Zaten hesabım var</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3498db', marginBottom: 30 },
  input: { width: '100%', padding: 15, backgroundColor: 'white', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  btn: { width: '100%', padding: 15, backgroundColor: '#3498db', borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  linkText: { marginTop: 15, color: '#555' }
});