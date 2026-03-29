import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Giriş Ekranı */}
      <Stack.Screen name="index" />
      
      {/* Kayıt Ekranı (Üstte geri butonu çıksın diye header'ı açabiliriz) */}
      <Stack.Screen 
        name="register" 
        options={{ 
          headerShown: true, 
          title: 'Kayıt Ol',
          headerBackTitle: 'Geri' 
        }} 
      />

      {/* Giriş yaptıktan sonra gidilen Tab yapısı */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}