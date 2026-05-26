import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Pressable,
  Alert, 
  ActivityIndicator, 
  ScrollView,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export default function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [boy, setBoy] = useState('');
  const [kilo, setKilo] = useState('');
  const [role, setRole] = useState('danisan');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    const init = async () => {
      const storedEmail = await AsyncStorage.getItem('email');
      if (storedEmail) {
        setEmail(storedEmail);
        await profilGetir(storedEmail);
      }
    };
    
    if (pathname.includes('profile')) {
      init();
    }
  }, [pathname]);

  const profilGetir = async (userEmail: string) => {
    try {
      const response = await axios.get(`${API_URL}/profil`, { params: { email: userEmail } });
      if (!response.data.error) {
        setFullname(response.data.fullname || '');
        setBoy(response.data.boy ? response.data.boy.toString() : '');
        setKilo(response.data.kilo ? response.data.kilo.toString() : '');
        setRole(response.data.role || 'danisan');
      }
    } catch (error) {
      console.error("Profil çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullname) {
      Alert.alert("Hata", "Ad Soyad alanı boş bırakılamaz.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('hasta_email', email);
      formData.append('fullname', fullname);
      if (boy) formData.append('boy', boy);
      if (kilo) formData.append('kilo', kilo);

      const response = await axios.post(`${API_URL}/profil-guncelle`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
      });

      if (response.data.status === 'success') {
        // AsyncStorage'daki fullname'i de güncelle
        await AsyncStorage.setItem('fullname', fullname);
        Alert.alert("Başarılı", "Profil bilgileriniz kaydedildi.");
      }
    } catch (error) {
      console.error("Profil güncellenemedi:", error);
      Alert.alert("Hata", "Profil güncellenirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ÜST PROFİL BİLGİSİ */}
      <View className="items-center mt-8 mb-6">
        <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-sm">
          <Ionicons name="person" size={48} color="#3b82f6" />
        </View>
        <Text className="text-2xl font-bold text-slate-800">{fullname || email.split('@')[0]}</Text>
        <Text className="text-sm text-slate-500 mt-1">{email}</Text>
      </View>

      {/* İÇERİK ALANI */}
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        <View className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">
            Profil Bilgileri
          </Text>

          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-500 mb-1 ml-1">AD SOYAD</Text>
            <TextInput 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
              value={fullname}
              onChangeText={setFullname}
              placeholder="Adınızı ve soyadınızı girin"
            />
          </View>

          <View className="flex-row gap-4 mb-6">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-500 mb-1 ml-1">BOY (cm)</Text>
              <TextInput 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="170"
                keyboardType="numeric"
                value={boy}
                onChangeText={setBoy}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-500 mb-1 ml-1">KİLO (kg)</Text>
              <TextInput 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="65"
                keyboardType="numeric"
                value={kilo}
                onChangeText={setKilo}
              />
            </View>
          </View>

          <TouchableOpacity 
            className={`py-4 rounded-xl items-center flex-row justify-center ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" className="mr-2" />
                <Text className="text-white font-bold text-base ml-2">Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ÇIKIŞ YAP BUTONU */}
        <TouchableOpacity 
          className="bg-white p-4 rounded-2xl border border-rose-100 flex-row justify-between items-center mb-10 shadow-sm"
          onPress={handleLogout}
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-rose-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="log-out" size={20} color="#f43f5e" />
            </View>
            <Text className="text-base font-bold text-rose-500">Hesaptan Çıkış Yap</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f43f5e" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
