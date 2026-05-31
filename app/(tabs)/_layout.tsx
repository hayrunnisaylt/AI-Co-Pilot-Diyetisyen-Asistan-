import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Platform } from 'react-native';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const userRole = await AsyncStorage.getItem('role');
      setRole(userRole);
      setLoading(false);
    };
    fetchRole();
  }, []);

  // Rol yüklenene kadar ekranda ufak bir yükleniyor ikonu göster
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#27ae60" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarActiveTintColor: role === 'diyetisyen' ? '#6366f1' : '#10b981',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { 
        backgroundColor: '#ffffff',
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 96 : 76,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 14,
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
        elevation: 10,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: 0.2,
      },
    }}>
      
      {/* HASTA EKRANI */}
      <Tabs.Screen
        name="hasta-home"
        options={{
          title: 'Diyetim',
          tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={24} color={color} />,
          // Eğer giriş yapan kişi 'diyetisyen' ise bu sekmeyi tamamen gizle (href: null yap)
          href: role === 'diyetisyen' ? null : '/(tabs)/hasta-home', 
        }}
      />

      {/* DİYETİSYEN EKRANI */}
      <Tabs.Screen
        name="diyetisyen-home"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <Ionicons name="medical" size={24} color={color} />,
          // Eğer giriş yapan kişi 'danisan' ise bu sekmeyi tamamen gizle
          href: role === 'danisan' ? null : '/(tabs)/diyetisyen-home',
        }}
      />
      {/* YEMEK KAYITLARI EKRANI (Sadece Danışan) */}
      <Tabs.Screen
        name="yemek-kayitlari"
        options={{
          title: 'Kayıtlarım',
          tabBarIcon: ({ color }) => <Ionicons name="nutrition" size={24} color={color} />,
          href: role === 'diyetisyen' ? null : '/(tabs)/yemek-kayitlari',
        }}
      />

      {/* MESAJLAR EKRANI (Sadece Danışan Görebilir) */}
      {/* GELEN KUTUSU (Mesajlar) EKRANI */}
      <Tabs.Screen
        name="messages" // 'mesajlar' yerine dosyanın gerçek adı olan 'messages' yazdık
        options={{
          title: 'Mesajlar', // Ekranda görünecek Türkçe isim aynı kalabilir
          tabBarIcon: ({ color }) => <Ionicons name="mail" size={24} color={color} />,
          // href kısmını da 'messages' olarak güncelliyoruz
          // @ts-ignore
          href: role === 'diyetisyen' ? null : '/(tabs)/messages',
        }}
      />

      {/* BİREBİR SOHBET EKRANI */}
      <Tabs.Screen
        name="chat" // 'sohbet' yerine 'chat' yazdık
        options={{
          title: 'Sohbet',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />,
          // href kısmını da 'chat' olarak güncelliyoruz
          // @ts-ignore
          href: role === 'diyetisyen' ? null : '/(tabs)/chat',
        }}
      />

      {/* HASTALAR EKRANI (Sadece Diyetisyen) */}
      <Tabs.Screen 
        name="hastalar" 
        options={{ 
          title: 'Hastalar', 
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          href: role === 'diyetisyen' ? '/(tabs)/hastalar' : null 
        }} 
      />

      {/* PROFİL EKRANI */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          href: '/(tabs)/profile', // Herkes görebilir
        }}
      />

    </Tabs>
  );
}