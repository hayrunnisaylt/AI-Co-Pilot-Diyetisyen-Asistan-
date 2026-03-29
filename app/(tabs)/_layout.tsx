import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons'; // İkonlar için

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      
      {/* Hasta Ekranı Sekmesi */}
      <Tabs.Screen
        name="hasta-home"
        options={{
          title: 'Diyetim',
          tabBarIcon: ({ color }) => <Ionicons name="camera" size={24} color={color} />,
        }}
      />

      {/* Diyetisyen Ekranı Sekmesi */}
      <Tabs.Screen
        name="diyetisyen-home"
        options={{
          title: 'Diyetisyen',
          tabBarIcon: ({ color }) => <Ionicons name="medical" size={24} color={color} />,
        }}
      />

      {/* index dosyasını dışarı attığımız için buradaki referansını silmeliyiz */}
    </Tabs>
  );
}