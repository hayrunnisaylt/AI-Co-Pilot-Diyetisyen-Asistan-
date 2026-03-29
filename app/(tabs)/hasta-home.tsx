import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HastaHome() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  // ---------------------------------------------------------
  // BURAYA GÜNCEL NGROK LİNKİNİ YAPIŞTIR (Sonunda / işareti olmasın)
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 
  // ---------------------------------------------------------

  // Fotoğraf Seçme veya Çekme
  const pickImage = async () => {
    // İzin iste
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galeri izni gerekiyor!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setSonuc(null); // Yeni foto seçince eski sonucu sil
    }
  };

  // Backend'e Gönderme
  // Backend'e Gönderme
  const uploadImage = async () => {
    if (!image) {
      Alert.alert("Uyarı", "Lütfen önce bir fotoğraf seçin!");
      return;
    }

    // --- DEĞİŞEN KISIM BAŞLANGIÇ ---
    const username = await AsyncStorage.getItem('username'); // Hafızadan ismi al
    const gonderilecekIsim = username || "Bilinmeyen Kullanıcı"; 
    // --- DEĞİŞEN KISIM BİTİŞ ---

    setLoading(true);
    const formData = new FormData();
    
    // Artık dinamik isim gidiyor!
    formData.append('hasta_adi', gonderilecekIsim); 

    // ... kodun geri kalanı aynı ...
    // React Native için özel dosya formatı
    const filename = image.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('file', {
      uri: image,
      name: filename || 'photo.jpg',
      type: type,
    } as any); // TypeScript hatasını geçmek için 'as any'

    try {
      const response = await axios.post(`${API_URL}/tahmin-et`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Gelen cevabı ekrana yaz
      const yemekAdi = response.data.sonuc[0].yemek_adi;
      const kalori = response.data.sonuc[0].kalori;
      setSonuc(`🍽️ Yemek: ${yemekAdi}\n🔥 Kalori: ${kalori} kcal`);
      Alert.alert("Başarılı!", "Yemek diyetisyene gönderildi.");
      
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Sunucuyla bağlantı kurulamadı. Ngrok linkini kontrol et.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 Diyet Günlüğüm</Text>
      
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Fotoğraf Seç / Çek</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      {image && (
        <TouchableOpacity 
          style={[styles.button, styles.sendButton, loading && styles.disabledBtn]} 
          onPress={uploadImage}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analiz Et ve Gönder</Text>}
        </TouchableOpacity>
      )}

      {sonuc && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{sonuc}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  image: { width: 300, height: 300, borderRadius: 15, marginVertical: 20 },
  button: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  sendButton: { backgroundColor: '#27ae60' },
  disabledBtn: { backgroundColor: '#95a5a6' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultCard: { marginTop: 20, padding: 20, backgroundColor: 'white', borderRadius: 10, elevation: 3, width: '100%' },
  resultText: { fontSize: 18, color: '#2c3e50', textAlign: 'center', fontWeight: 'bold' }
});