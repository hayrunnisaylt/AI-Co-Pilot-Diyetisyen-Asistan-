import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

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
      tabBarActiveTintColor: '#2A3439',
      tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 }
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

    </Tabs>
  );
}