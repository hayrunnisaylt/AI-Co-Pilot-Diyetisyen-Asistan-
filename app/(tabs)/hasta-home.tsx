import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function HastaHome() {
  const [hastaAdi, setHastaAdi] = useState('Danışan');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Aşamaları kontrol etmek için state'ler
  const [sonuc, setSonuc] = useState<any>(null); // YOLOv8'den dönen ilk tahmin
  const [onaylandi, setOnaylandi] = useState(false); // Hasta tahmini onayladı mı?
  const [geriBildirim, setGeriBildirim] = useState<string | null>(null); // AI Koç mesajı

  // 🔴
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 

  useEffect(() => {
    kullaniciAdiniAl();
  }, []);

  const kullaniciAdiniAl = async () => {
    const isim = await AsyncStorage.getItem('username');
    if (isim) setHastaAdi(isim);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galerinize erişim izni vermeniz gerekiyor!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // Yeni fotoğraf seçildiğinde tüm eski aşamaları sıfırla
      setSonuc(null); 
      setOnaylandi(false);
      setGeriBildirim(null);
    }
  };

  // ADIM 1: Sadece Analiz Et (Henüz Veritabanına Kaydetme)
  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    // Normalde burada sadece analiz API'sine gitmeliyiz ama şu anki backendimiz 
    // tahmin-et kısmında direkt db'ye de yazıyor. 
    // Not: İleride backend'de 'kaydet' ve 'sadece_tahmin_et' diye iki ayrı uç nokta yapılabilir.
    formData.append('hasta_adi', hastaAdi); 

    const filename = image.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('file', { uri: image, name: filename || 'photo.jpg', type } as any); 

    try {
      const response = await axios.post(`${API_URL}/tahmin-et`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.sonuc && response.data.sonuc.length > 0) {
        setSonuc(response.data.sonuc[0]); // YOLO Tahminini ekrana bas
      } else {
        Alert.alert("Bilgi", "Yemek tam olarak tanımlanamadı.");
      }
    } catch (error) {
      Alert.alert("Hata", "Sunucuyla bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  };

  // ADIM 2: Hastanın Tahmini Onaylaması ve Anlık Geri Bildirim
  const handleOnay = () => {
    setIsSaving(true);
    
    // Anlık Geri Bildirim Simülasyonu (Burası ileride LLM / GPT API'sine bağlanacak)
    setTimeout(() => {
      let mesaj = "";
      // Basit bir kural motoru simülasyonu
      if (sonuc.kalori > 400) {
        mesaj = `Bu öğün (${sonuc.yemek_adi}), diyetisyeninizin belirlediği hedeflerle biraz çelişiyor. Bir dahaki sefere daha hafif bir alternatif tercih etmeye ne dersiniz?`;
      } else {
        mesaj = `Harika seçim! Bu öğün (${sonuc.yemek_adi}), günlük hedeflerinize ulaşmanıza çok yardımcı olacak. Aynen böyle devam!`;
      }

      setGeriBildirim(mesaj);
      setOnaylandi(true);
      setIsSaving(false);
      
    }, 1500); // 1.5 saniye yapay zeka düşünme efekti
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Akıllı Günlük & Koç</Text>
            <Text style={styles.nameText}>Merhaba, {hastaAdi}</Text>
          </View>
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="person" size={24} color="#2A3439" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Bugün neler yedin? Fotoğrafını çek ve anında geri bildirim al.</Text>

        {/* FOTOĞRAF ALANI */}
        <View style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={60} color="#ccc" />
              <Text style={styles.placeholderText}>Yemeğinizin fotoğrafını yükleyin</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
          <Ionicons name="images" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>{image ? "Farklı Fotoğraf Seç" : "Fotoğraf Seç"}</Text>
        </TouchableOpacity>

        {/* ANALİZ BUTONU (Sadece fotoğraf varsa ve henüz analiz edilmediyse görünür) */}
        {image && !sonuc && (
          <TouchableOpacity 
            style={[styles.analyzeButton, loading && styles.disabledButton]} 
            onPress={analyzeImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.analyzeButtonText}>Yapay Zeka Analiz Et</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ADIM 1: TAHMİN VE ONAY KARTI */}
        {sonuc && !onaylandi && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Yapay Zeka Tahmini</Text>
            <Text style={styles.resultValue}>Fotoğrafta <Text style={{color:'#3498db'}}>{sonuc.yemek_adi}</Text> (Tahmini {sonuc.kalori} kcal) görüyorum.</Text>
            <Text style={styles.questionText}>Bu tahmini onaylıyor musunuz?</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => setSonuc(null)}>
                <Text style={styles.rejectBtnText}>Hayır, Tekrar Dene</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.confirmBtn} onPress={handleOnay} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Evet, Onaylıyorum</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ADIM 2: ANLIK GERİ BİLDİRİM KARTI (AI KOÇ) */}
        {onaylandi && geriBildirim && (
          <View style={[styles.feedbackCard, sonuc.kalori > 400 ? styles.feedbackWarning : styles.feedbackSuccess]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <Ionicons name={sonuc.kalori > 400 ? "alert-circle" : "checkmark-circle"} size={24} color={sonuc.kalori > 400 ? "#e67e22" : "#27ae60"} />
              <Text style={styles.feedbackTitle}>AI Koç Geri Bildirimi</Text>
            </View>
            <Text style={styles.feedbackText}>{geriBildirim}</Text>
            <Text style={styles.infoText}>Bu kayıt diyetisyeninize başarıyla iletildi!</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  scrollContent: { padding: 25, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  greetingText: { fontSize: 14, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  nameText: { fontSize: 28, fontWeight: 'bold', color: '#2A3439', letterSpacing: -0.5 },
  profileIcon: { backgroundColor: '#e2d1c3', padding: 12, borderRadius: 50 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 25, lineHeight: 22 },
  
  imageContainer: { width: '100%', height: 250, backgroundColor: '#f5f7fa', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  imagePlaceholder: { alignItems: 'center' },
  placeholderText: { marginTop: 10, color: '#aaa', fontSize: 14 },
  imagePreview: { width: '100%', height: '100%' },
  
  actionButton: { flexDirection: 'row', backgroundColor: '#343541', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  analyzeButton: { backgroundColor: '#2A3439', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  disabledButton: { backgroundColor: '#95a5a6' },
  analyzeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  resultCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#888', marginBottom: 10 },
  resultValue: { fontSize: 18, fontWeight: '600', color: '#2A3439', lineHeight: 26 },
  questionText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 15, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e74c3c', alignItems: 'center' },
  rejectBtnText: { color: '#e74c3c', fontWeight: 'bold' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#3498db', alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },

  feedbackCard: { padding: 20, borderRadius: 15, marginTop: 10 },
  feedbackSuccess: { backgroundColor: '#eafaf1', borderWidth: 1, borderColor: '#a3e4d7' },
  feedbackWarning: { backgroundColor: '#fef5e7', borderWidth: 1, borderColor: '#f8c471' },
  feedbackTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  feedbackText: { fontSize: 15, color: '#444', lineHeight: 22 },
  infoText: { marginTop: 15, fontSize: 12, color: '#888', fontStyle: 'italic', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 10 },
});