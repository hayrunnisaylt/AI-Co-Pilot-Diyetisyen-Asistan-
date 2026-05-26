import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  ImageBackground,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';

const RENK_MAP: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    iconColor: '#f43f5e' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   iconColor: '#f59e0b' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconColor: '#10b981' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-800',  iconColor: '#6366f1' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    iconColor: '#06b6d4' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    iconColor: '#3b82f6' },
  slate:   { bg: 'bg-slate-100',  border: 'border-slate-200',   text: 'text-slate-700',   iconColor: '#64748b' },
};

export default function DiyetisyenHome() {
  const [diyetisyenAdi, setDiyetisyenAdi] = useState('Diyetisyen');
  const [diyetisyenEmail, setDiyetisyenEmail] = useState('');
  const [hastalarinYemekleri, setHastalarinYemekleri] = useState([]);
  const [bekleyenIstekler, setBekleyenIstekler] = useState<any[]>([]);
  const [aiAnalizler, setAiAnalizler] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

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
      const email = await kullaniciAdiniAl();
      if (email) {
        await yemekVerileriniGetir(email);
        await istekleriGetir(email);
        await aiAnalizGetir(email);
      }
    };
    
    if (pathname.includes('diyetisyen-home')) {
      initializeData();
    }
  }, [pathname]);

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
      const veriler = response.data.veriler || [];
      setHastalarinYemekleri(veriler);
    } catch (error) {
      console.error("Veri çekilemedi:", error);
    }
  };

  const aiAnalizGetir = async (email: string) => {
    setAiLoading(true);
    try {
      const response = await axios.get(`${API_URL}/ai-asistan-analiz`, {
        params: { diyetisyen_email: email },
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setAiAnalizler(response.data.analizler || []);
    } catch (error) {
      console.error("AI analiz çekilemedi:", error);
      setAiAnalizler([{ tip: 'bilgi', ikon: 'alert-circle', renk: 'amber', baslik: 'Bağlantı Hatası', mesaj: 'AI Asistan verilerine ulaşılamadı.' }]);
    } finally {
      setAiLoading(false);
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
          await aiAnalizGetir(diyetisyenEmail); // AI analizleri yenile
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
                {aiAnalizler.filter(a => a.tip === 'uyari').length > 0 && (
                  <View className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full" />
                )}
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
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-slate-800">Yapay Zeka Asistanı</Text>
            <View className="bg-blue-100 px-2 py-0.5 rounded-lg">
              <Text className="text-blue-600 text-xs font-bold">{aiAnalizler.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => diyetisyenEmail && aiAnalizGetir(diyetisyenEmail)}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {aiLoading ? (
          <View className="bg-white p-8 rounded-3xl items-center border border-slate-100 mb-4">
            <ActivityIndicator size="small" color="#6366f1" />
            <Text className="text-slate-400 text-sm mt-3">AI Asistan analiz ediyor...</Text>
          </View>
        ) : (
          aiAnalizler.map((analiz: any, index: number) => {
            const renk = RENK_MAP[analiz.renk] || RENK_MAP.slate;
            return (
              <View 
                key={`ai-${index}`} 
                className={`p-4 rounded-2xl mb-3 border ${renk.bg} ${renk.border}`}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-8 h-8 bg-white rounded-full items-center justify-center">
                    <Ionicons name={(analiz.ikon || 'sparkles') as any} size={18} color={renk.iconColor} />
                  </View>
                  <Text className={`text-sm font-bold flex-1 ${renk.text}`}>{analiz.baslik}</Text>
                </View>
                <Text className="text-slate-600 text-sm leading-relaxed ml-10">{analiz.mesaj}</Text>
              </View>
            );
          })
        )}

        {/* VERİTABANINDAN GELEN GERÇEK FOTOĞRAF ANALİZLERİ */}
        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="text-xl font-bold text-slate-800">Hastalarınız Neler Yiyor?</Text>
        </View>

        {hastalarinYemekleri && hastalarinYemekleri.length > 0 ? (
          hastalarinYemekleri.map((yemek: any, index) => (
            <View key={index} className="bg-white p-4 rounded-3xl mb-4 border border-slate-200 shadow-sm flex-row items-center">
              <View className="w-20 h-20 bg-indigo-50 rounded-2xl mr-4 items-center justify-center border border-indigo-100">
                <Ionicons name="fast-food" size={32} color="#6366f1" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1 justify-between">
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-2">
                      <Ionicons name="person" size={12} color="#3b82f6" />
                    </View>
                    <Text className="font-bold text-slate-700">{yemek.hasta_adi || yemek.hasta_email}</Text>
                  </View>
                  <Text className="text-xs text-slate-400">{yemek.tarih}</Text>
                </View>
                <Text className="text-lg font-black text-slate-800 mb-1">{yemek.yemek_adi}</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-500 font-medium">{yemek.kalori} kcal</Text>
                  <Text className="text-emerald-600 font-bold text-xs">%{(yemek.guven_orani * 100).toFixed(0)} Doğruluk</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="bg-slate-100 p-8 rounded-3xl items-center border border-slate-200 border-dashed">
            <Ionicons name="restaurant-outline" size={48} color="#94a3b8" className="mb-3" />
            <Text className="text-slate-500 font-medium text-center">Şu an gösterilecek yemek kaydı yok. Hastalarınız yemek eklediğinde burada görünecek.</Text>
          </View>
        )}
        
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}