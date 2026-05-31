import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

export default function HastalarScreen() {
  const [diyetisyenEmail, setDiyetisyenEmail] = useState('');
  const [aktifHastalar, setAktifHastalar] = useState<any[]>([]);
  const pathname = usePathname();
  // router is imported directly as a singleton from expo-router
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    const init = async () => {
      const email = await AsyncStorage.getItem('email');
      if (email) {
        setDiyetisyenEmail(email);
        await aktifHastalariGetir(email);
      }
    };
    if (pathname.includes('hastalar')) {
      init();
    }
  }, [pathname]);

  const aktifHastalariGetir = async (email: string) => {
    try {
      const response = await axios.get(`${API_URL}/diyetisyen-hastalar`, {
        params: { diyetisyen_email: email }
      });
      setAktifHastalar(response.data.hastalar || []);
    } catch (error) {
      console.error("Aktif hastalar çekilemedi:", error);
    }
  };

  const hastaCikar = (hastaEmail: string, hastaFullname: string) => {
    Alert.alert(
      "İlişiği Kes",
      `${hastaFullname || hastaEmail} isimli hastanız ile ilişiğinizi kesmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Evet, Çıkar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('hasta_email', hastaEmail);
              const response = await axios.post(`${API_URL}/diyetisyen-hasta-cikar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
              });
              if (response.data.status === 'success') {
                setAktifHastalar(prev => prev.filter(h => h.email !== hastaEmail));
                Alert.alert("Başarılı", "Hasta listenizden çıkarıldı.");
              }
            } catch (error) {
              console.error("Hasta çıkarılamadı", error);
              Alert.alert("Hata", "İşlem gerçekleştirilemedi.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-8 pb-4">
        <Text className="text-2xl font-bold text-slate-800">Aktif Hastalarım</Text>
        <Text className="text-sm text-slate-500 mt-1">Hastalarınızı buradan yönetebilirsiniz.</Text>
      </View>
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        {aktifHastalar && aktifHastalar.length > 0 ? (
          aktifHastalar.map((hasta: any, index) => (
            <TouchableOpacity 
              key={`aktif-${index}`} 
              className="bg-white p-4 rounded-2xl mb-3 border border-slate-200 shadow-sm flex-row items-center justify-between border-l-4 border-l-indigo-500"
              onPress={() => router.push({ pathname: '/hasta-detay', params: { email: hasta.email, fullname: hasta.fullname } })}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person" size={20} color="#6366f1" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-800">{hasta?.fullname || hasta?.email}</Text>
                  <Text className="text-xs text-slate-500 mt-1">Detayları gör</Text>
                </View>
              </View>
              <TouchableOpacity 
                className="bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex-row items-center"
                onPress={() => hastaCikar(hasta?.email, hasta?.fullname)}
              >
                <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                <Text className="text-rose-600 text-xs font-bold ml-1">Çıkar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View className="bg-slate-100 p-8 rounded-3xl border border-slate-200 border-dashed items-center mt-4">
            <Ionicons name="people" size={48} color="#cbd5e1" className="mb-3" />
            <Text className="text-slate-500 text-center text-sm">Şu an aktif bir hastanız bulunmuyor.</Text>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
