import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

// TypeScript için dışarıdan alacağı özellikleri (props) tanımlıyoruz
interface CustomCardProps {
  children: React.ReactNode; // Kartın içine konulacak her şey
  style?: ViewStyle | ViewStyle[]; // Ekstra stil eklemek istersek
  onPress?: () => void; // Tıklanabilir olmasını istersek
}

export default function CustomCard({ children, style, onPress }: CustomCardProps) {
  // Eğer karta bir onPress özelliği verildiyse onu TouchableOpacity (tıklanabilir) yap
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  // Tıklanma özelliği yoksa normal View olarak döndür
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1, 
    borderColor: '#eee',
    // Uygulamanın standart gölge (shadow) ayarı
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3,
  },
});