import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function DiyetisyenHome() {
  const [diyetisyenAdi, setDiyetisyenAdi] = useState('Diyetisyen');
  const [hastalarinYemekleri, setHastalarinYemekleri] = useState([]);

  // 🔴 
const API_URL = process.env.EXPO_PUBLIC_API_URL;
 

  useEffect(() => {
    kullaniciAdiniAl();
    yemekVerileriniGetir();
  }, []);

  const kullaniciAdiniAl = async () => {
    const isim = await AsyncStorage.getItem('username');
    if (isim) setDiyetisyenAdi(isim);
  };

  const yemekVerileriniGetir = async () => {
    try {
      const response = await axios.get(`${API_URL}/diyetisyen-verileri`);
      setHastalarinYemekleri(response.data.veriler);
    } catch (error) {
      console.error("Veri çekilemedi:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ÜST KARANLIK ALAN (HEADER) */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingText}>Hoşgeldiniz Dr.</Text>
              <Text style={styles.nameText}>{diyetisyenAdi}</Text>
            </View>
            <TouchableOpacity style={styles.bellIcon}>
              <Ionicons name="notifications" size={22} color="#fff" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* Arama Çubuğu */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Hasta Arayın"
              placeholderTextColor="#888"
            />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        
        {/* YATAY KART (Diyet Listesi Hazırlayın) */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=600' }} 
          style={styles.actionCard}
          imageStyle={{ borderRadius: 15, opacity: 0.8 }}
        >
          <View style={styles.actionCardOverlay}>
            <Text style={styles.actionCardText}>Hastanıza Diyet Listesi Hazırlayın</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </View>
        </ImageBackground>

        {/* AI CO-PILOT UYARI KARTLARI (Tasarımındaki Kısım) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hastalarınız Neler Yiyor?</Text>
          <Ionicons name="ellipsis-horizontal" size={20} color="#555" />
        </View>

        {/* Kırmızı Uyarı Kartı */}
        <View style={[styles.alertCard, { backgroundColor: '#FF6B6B' }]}>
          <Text style={styles.alertText}>
            Ayşe Yılmaz, son 3 öğünde diyetine (Glutensiz) uymayan 3 gıda yükledi. Müdahale gerekebilir.
          </Text>
        </View>

        {/* Sarı Uyarı Kartı */}
        <View style={[styles.alertCard, { backgroundColor: '#FFD93D' }]}>
          <Text style={[styles.alertText, { color: '#444' }]}>
            Mehmet Demir, 2 gündür sisteme hiçbir öğün veya su girişi yapmadı. Takibi bırakmış olabilir.
          </Text>
        </View>

        {/* Yeşil Bildirim Kartı */}
        <View style={[styles.alertCard, { backgroundColor: '#6BCB77' }]}>
          <Text style={styles.alertText}>
            Zeynep Kaya, su ve protein hedefine 3 gündür ulaşıyor. Bir tebrik mesajı göndermek iyi olabilir.
          </Text>
        </View>

        {/* VERİTABANINDAN GELEN GERÇEK FOTOĞRAF ANALİZLERİ */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Son Gelen Öğün Kayıtları</Text>
        </View>

        {hastalarinYemekleri.map((yemek: any, index) => (
          <View key={index} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logPatientName}>👤 {yemek.hasta_adi}</Text>
              <Text style={styles.logTime}>{yemek.tarih}</Text>
            </View>
            <Text style={styles.logFoodName}>{yemek.yemek_adi}</Text>
            <View style={styles.logDetails}>
              <Text style={styles.logCalories}>🔥 {yemek.kalori} kcal</Text>
              <Text style={styles.logConf}>%{(yemek.guven_orani * 100).toFixed(0)} Doğruluk</Text>
            </View>
          </View>
        ))}
        
        <View style={{ height: 40 }} /> {/* Alt boşluk */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  headerBackground: {
    backgroundColor: '#2A3439', // Tasarımdaki koyu yeşil/siyah ton
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
  },
  safeArea: { paddingHorizontal: 25, paddingTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingText: { color: '#ccc', fontSize: 18, fontWeight: '500' },
  nameText: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 2 },
  bellIcon: { backgroundColor: '#404B52', padding: 10, borderRadius: 50, position: 'relative' },
  notificationDot: {
    position: 'absolute', top: 8, right: 10, width: 8, height: 8,
    backgroundColor: '#FFD93D', borderRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    marginTop: 25, paddingHorizontal: 15, paddingVertical: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  scrollArea: { paddingHorizontal: 20, marginTop: 20 },
  actionCard: {
    width: '100%', height: 130, borderRadius: 15,
    overflow: 'hidden', marginBottom: 25,
  },
  actionCardOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20, justifyContent: 'flex-end', flexDirection: 'row',
    alignItems: 'flex-end', gap: 10,
  },
  actionCardText: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A3439' },
  alertCard: { padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  alertText: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 22 },
  
  // Veritabanı logları için stil
  logCard: {
    backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#3498db',
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  logPatientName: { fontSize: 15, fontWeight: 'bold', color: '#2A3439' },
  logTime: { fontSize: 12, color: '#888' },
  logFoodName: { fontSize: 17, fontWeight: '600', color: '#333', marginVertical: 5 },
  logDetails: { flexDirection: 'row', gap: 15 },
  logCalories: { fontSize: 14, color: '#e74c3c', fontWeight: 'bold' },
  logConf: { fontSize: 14, color: '#27ae60', fontWeight: 'bold' },
});