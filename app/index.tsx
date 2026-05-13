import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('danisan');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Eksik Bilgi", "Lütfen e-posta adresinizi ve şifrenizi giriniz.");
      return;
    }

    setIsLoading(true);
    if (!API_URL) {
      Alert.alert("Hata", "API URL tanımlı değil! Lütfen .env dosyasını kontrol edip projeyi yeniden başlatın.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: email.trim().toLowerCase(), 
        password,
      }, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.data.role !== role) {
        Alert.alert(
          "Yetkisiz Giriş", 
          `Bu hesap bir ${role === 'diyetisyen' ? 'Diyetisyen' : 'Danışan'} hesabına ait değil. Lütfen doğru sekmeyi seçin.`
        );
        setIsLoading(false);
        return;
      }

      await AsyncStorage.setItem('role', response.data.role);
      await AsyncStorage.setItem('email', response.data.email);
      await AsyncStorage.setItem('fullname', response.data.fullname);

      if (response.data.role === 'diyetisyen') {
        router.replace('/(tabs)/diyetisyen-home');
      } else {
        router.replace('/(tabs)/hasta-home');
      }
    } catch (error: any) {
      const hataMesaji = error.response?.data?.detail || error.message || "Bilinmeyen bir hata oluştu.";
      Alert.alert("Giriş Başarısız", hataMesaji);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-emerald-100 rounded-full justify-center items-center mb-4">
              <Ionicons name="leaf" size={40} color="#10b981" />
            </View>
            <Text className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Hoş Geldiniz</Text>
            <Text className="text-base text-slate-500 text-center px-4">
              AI Destekli Diyetisyen Asistanınıza giriş yapmak için rolünüzü seçin.
            </Text>
          </View>

          <View className="flex-row bg-slate-200 p-1 rounded-2xl mb-8">
            <TouchableOpacity 
              onPress={() => setRole('danisan')}
              className={`flex-1 py-3 rounded-xl items-center border ${role === 'danisan' ? 'bg-white border-slate-200' : 'bg-transparent border-transparent'}`}
            >
              <Text className={`font-bold ${role === 'danisan' ? 'text-emerald-600' : 'text-slate-500'}`}>
                Danışan Girişi
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setRole('diyetisyen')}
              className={`flex-1 py-3 rounded-xl items-center border ${role === 'diyetisyen' ? 'bg-white border-slate-200' : 'bg-transparent border-transparent'}`}
            >
              <Text className={`font-bold ${role === 'diyetisyen' ? 'text-indigo-600' : 'text-slate-500'}`}>
                Diyetisyen Girişi
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <TextInput 
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 text-base text-slate-800"
              placeholder="E-posta Adresiniz"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput 
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6 text-base text-slate-800"
              placeholder="Şifreniz"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity 
              className={`w-full py-4 rounded-2xl items-center flex-row justify-center active:opacity-80 ${role === 'danisan' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-white text-lg font-bold mr-2">Giriş Yap</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-500 text-base">Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text className={`text-base font-bold ${role === 'danisan' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}