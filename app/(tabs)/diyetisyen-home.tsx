import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';

export default function DiyetisyenHome() {
  const [veriler, setVeriler] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ---------------------------------------------------------
  // AYNI NGROK LİNKİNİ BURAYA DA YAPIŞTIR
  const API_URL = "https://nonexpanded-conor-radially.ngrok-free.dev"; 
  // ---------------------------------------------------------

  const verileriGetir = async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${API_URL}/diyetisyen-verileri`);
      setVeriler(response.data.veriler);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{item.tarih}</Text>
        <Text style={styles.conf}>%{Math.round(item.guven_orani * 100)} Güven</Text>
      </View>
      <Text style={styles.foodName}>{item.yemek_adi}</Text>
      <Text style={styles.calories}>{item.kalori} kcal</Text>
      <Text style={styles.patient}>👤 {item.hasta_adi}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👩‍⚕️ Diyetisyen Paneli</Text>
      <FlatList
        data={veriler}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={verileriGetir} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Henüz veri yok.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#2c3e50', textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  date: { color: '#7f8c8d', fontSize: 12 },
  conf: { color: '#27ae60', fontSize: 12, fontWeight: 'bold' },
  foodName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  calories: { fontSize: 16, color: '#e74c3c', marginVertical: 5 },
  patient: { fontSize: 14, color: '#34495e', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});