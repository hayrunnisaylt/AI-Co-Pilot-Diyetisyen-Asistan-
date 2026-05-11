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
  const [role, setRole] = useState('danisan'); // 'danisan' veya 'diyetisyen'
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Eksik Bilgi", "Lütfen e-posta ve şifrenizi giriniz.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: email.trim(), 
        password,
      });

      if (response.data.role !== role) {
        Alert.alert(
          "Yetkisiz Giriş", 
          `Bu e-posta adresi bir ${role === 'diyetisyen' ? 'Diyetisyen' : 'Danışan'} hesabına ait değil. Lütfen doğru sekmeyi seçin.`
        );
        setIsLoading(false);
        return;
      }

      await AsyncStorage.setItem('userRole', response.data.role);
      await AsyncStorage.setItem('userId', response.data.user_id.toString());
      await AsyncStorage.setItem('userName', response.data.name);

      if (response.data.role === 'diyetisyen') {
        router.replace('/(tabs)/diyetisyen-home');
      } else {
        router.replace('/(tabs)/hasta-home');
      }
    } catch (error) {
      console.error("Giriş Hatası:", error);
      Alert.alert("Giriş Başarısız", "E-posta adresiniz veya şifreniz hatalı. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      {/* ÇÖZÜM BURADA: className yerine doğrudan style verdik */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Tailwind sınıflarını buradaki View'a taşıdık, artık sistem çökmeyecek */}
        <View className="flex-1 justify-center px-6">
          
          {/* Üst Başlık ve İkon */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-emerald-100 rounded-full justify-center items-center mb-4">
              <Ionicons name="leaf" size={40} color="#10b981" />
            </View>
            <Text className="text-3xl font-extrabold text-[#2A3439] tracking-tight mb-2">Hoş Geldiniz</Text>
            <Text className="text-base text-gray-500 text-center px-4">
              AI Destekli Diyetisyen Asistanınıza giriş yapmak için rolünüzü seçin.
            </Text>
          </View>

          {/* Rol Seçici (Tab) */}
          <View className="flex-row p-1 rounded-2xl mb-8" style={{ backgroundColor: 'rgba(229, 231, 235, 0.6)' }}>
            <TouchableOpacity 
              onPress={() => setRole('danisan')}
              className={`flex-1 py-3 rounded-xl items-center ${role === 'danisan' ? 'bg-white' : ''}`}
              style={role === 'danisan' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
            >
              <Text className={`font-bold ${role === 'danisan' ? 'text-emerald-600' : 'text-gray-500'}`}>
                Danışan Girişi
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setRole('diyetisyen')}
              className={`flex-1 py-3 rounded-xl items-center ${role === 'diyetisyen' ? 'bg-white' : ''}`}
              style={role === 'diyetisyen' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
            >
              <Text className={`font-bold ${role === 'diyetisyen' ? 'text-indigo-600' : 'text-gray-500'}`}>
                Diyetisyen Girişi
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Alanı */}
          <View>
            <TextInput 
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-4 text-base text-gray-800"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              placeholder="E-posta Adresiniz"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput 
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-6 text-base text-gray-800"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              placeholder="Şifreniz"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Giriş Yap Butonu */}
            <TouchableOpacity 
              className={`w-full py-4 rounded-2xl items-center flex-row justify-center ${role === 'danisan' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
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

          {/* Kayıt Ol Yönlendirmesi */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 text-base">Hesabınız yok mu? </Text>
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