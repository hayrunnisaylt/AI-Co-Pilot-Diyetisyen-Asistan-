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

export default function RegisterScreen() {
  const router = useRouter();
  
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState('danisan');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullname || !email || !password || !passwordConfirm) {
      Alert.alert("Eksik Bilgi", "Lütfen tüm alanları doldurunuz.");
      return;
    }
    
    if (password !== passwordConfirm) {
      Alert.alert("Hata", "Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/register`, { 
        fullname: fullname.trim(),
        email: email.trim().toLowerCase(), 
        password, 
        role 
      }, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.data.status === 'success') {
        Alert.alert("Başarılı", "Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.");
        router.push('/');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Sunucuya ulaşılamadı.";
      Alert.alert("Hata", errorMsg);
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
            <View className="w-20 h-20 bg-indigo-100 rounded-full justify-center items-center mb-4">
              <Ionicons name="person-add" size={36} color="#4f46e5" />
            </View>
            <Text className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Kayıt Ol</Text>
            <Text className="text-base text-slate-500 text-center px-4">
              AI Destekli Diyetisyen Asistanınıza katılmak için bir hesap oluşturun.
            </Text>
          </View>

          <View className="flex-row bg-slate-200 p-1 rounded-2xl mb-8">
            <TouchableOpacity 
              onPress={() => setRole('danisan')}
              className={`flex-1 py-3 rounded-xl items-center border ${role === 'danisan' ? 'bg-white border-slate-200' : 'bg-transparent border-transparent'}`}
            >
              <Text className={`font-bold ${role === 'danisan' ? 'text-emerald-600' : 'text-slate-500'}`}>
                Danışan Olarak
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setRole('diyetisyen')}
              className={`flex-1 py-3 rounded-xl items-center border ${role === 'diyetisyen' ? 'bg-white border-slate-200' : 'bg-transparent border-transparent'}`}
            >
              <Text className={`font-bold ${role === 'diyetisyen' ? 'text-indigo-600' : 'text-slate-500'}`}>
                Diyetisyen Olarak
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <TextInput 
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 text-base text-slate-800"
              placeholder="Ad Soyad"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              value={fullname}
              onChangeText={setFullname}
            />

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
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 text-base text-slate-800"
              placeholder="Şifreniz"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput 
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6 text-base text-slate-800"
              placeholder="Şifrenizi Tekrar Girin"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />

            <TouchableOpacity 
              className={`w-full py-4 rounded-2xl items-center flex-row justify-center active:opacity-80 ${role === 'danisan' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className="text-white text-lg font-bold mr-2">Hesap Oluştur</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-500 text-base">Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text className={`text-base font-bold ${role === 'danisan' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}