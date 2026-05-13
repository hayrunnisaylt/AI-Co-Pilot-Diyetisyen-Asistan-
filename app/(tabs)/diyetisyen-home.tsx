import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  ImageBackground,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';

export default function DiyetisyenHome() {
  const [diyetisyenAdi, setDiyetisyenAdi] = useState('Diyetisyen');
  const [diyetisyenEmail, setDiyetisyenEmail] = useState('');
  const [hastalarinYemekleri, setHastalarinYemekleri] = useState([]);
  const [bekleyenIstekler, setBekleyenIstekler] = useState<any[]>([]);
  
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/');
          }
        }
      ]
    );
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
 
  useEffect(() => {
    const initializeData = async () => {
      const isim = await kullaniciAdiniAl();
      if (isim) {
        await yemekVerileriniGetir(isim);
        await istekleriGetir(isim);
      }
    };
    initializeData();
  }, []);

  const kullaniciAdiniAl = async () => {
    const email = await AsyncStorage.getItem('email');
    const fullname = await AsyncStorage.getItem('fullname');
    if (email) {
      setDiyetisyenEmail(email);
      setDiyetisyenAdi(fullname || email);
      return email;
    }
    return null;
  };

  const yemekVerileriniGetir = async (email: string) => {
    try {
      const response = await axios.get(`${API_URL}/diyetisyen-verileri`, {
        params: { diyetisyen_email: email }
      });
      setHastalarinYemekleri(response.data.veriler);
    } catch (error) {
      console.error("Veri çekilemedi:", error);
    }
  };

  const istekleriGetir = async (email: string) => {
    try {
      const response = await axios.get(`${API_URL}/diyetisyen-istekleri`, {
        params: { diyetisyen_email: email }
      });
      setBekleyenIstekler(response.data.istekler);
    } catch (error) {
      console.error("İstekler çekilemedi:", error);
    }
  };

  const istegiCevapla = async (hastaEmail: string, hastaFullname: string, durum: 'kabul' | 'red') => {
    try {
      const formData = new FormData();
      formData.append('hasta_email', hastaEmail);
      formData.append('durum', durum);

      const response = await axios.post(`${API_URL}/diyetisyen-istek-cevapla`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
      });

      if (response.data.status === 'success') {
        setBekleyenIstekler(prev => prev.filter(h => h.email !== hastaEmail));
        
        if (durum === 'kabul') {
          Alert.alert("Başarılı", `${hastaFullname || hastaEmail} hastanız olarak eklendi.`);
          await yemekVerileriniGetir(diyetisyenEmail); // Yemekleri yenile
        } else {
          Alert.alert("Bilgi", `${hastaFullname || hastaEmail} isteği reddedildi.`);
        }
      }
    } catch (error) {
      console.error("İstek cevaplanamadı", error);
      Alert.alert("Hata", "İşlem gerçekleştirilemedi.");
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* ÜST KARANLIK ALAN (HEADER) */}
      <View className="bg-slate-800 rounded-b-[30px] pb-5">
        <SafeAreaView edges={['top', 'left', 'right']} className="px-6 pt-2">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-slate-300 text-lg font-medium">Hoşgeldiniz Dr.</Text>
              <Text className="text-white text-3xl font-bold mt-1">{diyetisyenAdi}</Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <TouchableOpacity className="bg-slate-700 p-3 rounded-full relative">
                <Ionicons name="notifications" size={22} color="#fff" />
                <View className="absolute top-2 right-2.5 w-2 h-2 bg-amber-400 rounded-full" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-slate-700 p-3 rounded-full" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Arama Çubuğu */}
          <View className="flex-row items-center bg-white rounded-2xl mt-6 px-4 py-3">
            <Ionicons name="search" size={20} color="#94a3b8" className="mr-2" />
            <TextInput 
              className="flex-1 text-base text-slate-800"
              placeholder="Hasta Arayın"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView className="px-5 mt-5" showsVerticalScrollIndicator={false}>
        
        {/* YATAY KART (Diyet Listesi Hazırlayın) */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=600' }} 
          className="w-full h-32 rounded-3xl overflow-hidden mb-6"
          imageStyle={{ opacity: 0.8 }}
        >
          <View className="flex-1 bg-black/40 p-5 justify-end flex-row items-end gap-2">
            <Text className="text-white text-xl font-bold flex-1">Hastanıza Diyet Listesi Hazırlayın</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </View>
        </ImageBackground>

        {/* BEKLEYEN İSTEKLER KARTI */}
        {bekleyenIstekler.length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-800">Bekleyen Hasta İstekleri</Text>
              <View className="bg-rose-500 w-6 h-6 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">{bekleyenIstekler.length}</Text>
              </View>
            </View>

            {bekleyenIstekler.map((hasta: any, index) => (
              <View key={index} className="bg-white p-4 rounded-2xl mb-3 border border-slate-200 shadow-sm flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#64748b" />
                  </View>
                  <Text className="text-base font-bold text-slate-800">{hasta.fullname || hasta.email}</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity 
                    className="w-10 h-10 bg-rose-50 rounded-full items-center justify-center border border-rose-200"
                    onPress={() => istegiCevapla(hasta.email, hasta.fullname, 'red')}
                  >
                    <Ionicons name="close" size={20} color="#f43f5e" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center border border-emerald-200"
                    onPress={() => istegiCevapla(hasta.email, hasta.fullname, 'kabul')}
                  >
                    <Ionicons name="checkmark" size={20} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI CO-PILOT UYARI KARTLARI */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-slate-800">Hastalarınız Neler Yiyor?</Text>
          <Ionicons name="ellipsis-horizontal" size={20} color="#64748b" />
        </View>

        {/* Kırmızı Uyarı Kartı */}
        <View className="p-5 rounded-2xl mb-4 bg-rose-500 border border-rose-600">
          <Text className="text-white text-sm font-semibold leading-relaxed">
            Ayşe Yılmaz, son 3 öğünde diyetine (Glutensiz) uymayan 3 gıda yükledi. Müdahale gerekebilir.
          </Text>
        </View>

        {/* Sarı Uyarı Kartı */}
        <View className="p-5 rounded-2xl mb-4 bg-amber-400 border border-amber-500">
          <Text className="text-slate-800 text-sm font-semibold leading-relaxed">
            Mehmet Demir, 2 gündür sisteme hiçbir öğün veya su girişi yapmadı. Takibi bırakmış olabilir.
          </Text>
        </View>

        {/* Yeşil Bildirim Kartı */}
        <View className="p-5 rounded-2xl mb-4 bg-emerald-500 border border-emerald-600">
          <Text className="text-white text-sm font-semibold leading-relaxed">
            Zeynep Kaya, su ve protein hedefine 3 gündür ulaşıyor. Bir tebrik mesajı göndermek iyi olabilir.
          </Text>
        </View>

        {/* VERİTABANINDAN GELEN GERÇEK FOTOĞRAF ANALİZLERİ */}
        <View className="flex-row justify-between items-center mt-4 mb-4">
          <Text className="text-xl font-bold text-slate-800">Son Gelen Öğün Kayıtları</Text>
        </View>

        {hastalarinYemekleri.map((yemek: any, index) => (
          <View key={index} className="bg-white p-4 rounded-2xl mb-3 border-l-4 border-blue-500 border-y border-r border-slate-100">
            <View className="flex-row justify-between mb-1">
              <Text className="text-base font-bold text-slate-800">👤 {yemek.hasta_adi}</Text>
              <Text className="text-xs text-slate-400 mt-1">{yemek.tarih}</Text>
            </View>
            <Text className="text-lg font-semibold text-slate-700 my-1">{yemek.yemek_adi}</Text>
            <View className="flex-row gap-4 mt-1">
              <Text className="text-sm font-bold text-rose-500">🔥 {yemek.kalori} kcal</Text>
              <Text className="text-sm font-bold text-emerald-600">%{(yemek.guven_orani * 100).toFixed(0)} Doğruluk</Text>
            </View>
          </View>
        ))}
        
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}