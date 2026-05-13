import { Stack } from 'expo-router';
import '../global.css'; 



export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Giriş Ekranı */}
      <Stack.Screen name="index" />
      
      <Stack.Screen 
        name="register" 
        options={{ 
          headerShown: true, 
          title: 'Kayıt Ol',
          headerBackTitle: 'Geri' 
        }} 
      />

      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}