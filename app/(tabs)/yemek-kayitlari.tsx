import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { usePathname } from 'expo-router';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// Makro renkleri
const COLORS = {
  protein: '#6366f1',    // indigo
  yag: '#f59e0b',        // amber
  karbonhidrat: '#10b981', // emerald
  kalori: '#ef4444',     // red
  bg: '#f8fafc',
  card: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
};

type Yemek = {
  id: string;
  yemek_adi: string;
  kalori: number;
  protein: number;
  yag: number;
  karbonhidrat: number;
  guven_orani: number;
  tarih: string;
};

type GunlukStat = {
  tarih: string;
  gun_kisa: string;
  kalori: number;
  protein: number;
  yag: number;
  karbonhidrat: number;
  ogun_sayisi: number;
};

type ToplamStat = {
  kalori: number;
  protein: number;
  yag: number;
  karbonhidrat: number;
  ogun_sayisi: number;
};

export default function YemekKayitlari() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [yemekler, setYemekler] = useState<Yemek[]>([]);
  const [gunlukIstatistik, setGunlukIstatistik] = useState<GunlukStat[]>([]);
  const [toplam, setToplam] = useState<ToplamStat>({ kalori: 0, protein: 0, yag: 0, karbonhidrat: 0, ogun_sayisi: 0 });
  const [activeTab, setActiveTab] = useState<'grafik' | 'liste'>('grafik');

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const pathname = usePathname();

  const verileriGetir = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) return;

      const response = await axios.get(`${API_URL}/yemek-gecmisi`, {
        params: { hasta_email: email },
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      setYemekler(response.data.yemekler || []);
      setGunlukIstatistik(response.data.gunluk_istatistik || []);
      setToplam(response.data.toplam || { kalori: 0, protein: 0, yag: 0, karbonhidrat: 0, ogun_sayisi: 0 });
    } catch (error) {
      console.error('Yemek geçmişi çekilemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (pathname.includes('yemek-kayitlari')) {
      setLoading(true);
      verileriGetir();
    }
  }, [pathname, verileriGetir]);

  const onRefresh = () => {
    setRefreshing(true);
    verileriGetir();
  };

  // Grafik için chart config
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => '#64748b',
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: '#6366f1' },
    propsForBackgroundLines: { strokeDasharray: '5,5', stroke: '#e2e8f0' },
  };

  // Pie chart data
  const makroTotal = toplam.protein + toplam.yag + toplam.karbonhidrat;
  const pieData = makroTotal > 0 ? [
    {
      name: 'Protein',
      value: toplam.protein,
      color: COLORS.protein,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
    {
      name: 'Yağ',
      value: toplam.yag,
      color: COLORS.yag,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
    {
      name: 'Karbonhidrat',
      value: toplam.karbonhidrat,
      color: COLORS.karbonhidrat,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
  ] : [
    { name: 'Veri Yok', value: 1, color: '#e2e8f0', legendFontColor: COLORS.textMuted, legendFontSize: 13 },
  ];

  // Yemekleri güne göre grupla
  const grupluYemekler: { [gun: string]: Yemek[] } = {};
  yemekler.forEach((y) => {
    const gun = y.tarih.split(' ')[0];
    if (!grupluYemekler[gun]) grupluYemekler[gun] = [];
    grupluYemekler[gun].push(y);
  });

  const formatTarih = (tarih: string) => {
    try {
      const [yil, ay, gun] = tarih.split('-');
      const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${parseInt(gun)} ${aylar[parseInt(ay) - 1]} ${yil}`;
    } catch {
      return tarih;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.protein} />
        <Text className="text-slate-400 mt-4 text-base">Yemek kayıtları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* HEADER */}
      <View className="bg-slate-800 rounded-b-[30px] pb-6">
        <SafeAreaView edges={['top', 'left', 'right']} className="px-6 pt-2">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-slate-300 text-base font-medium">Beslenme Takibi</Text>
              <Text className="text-white text-2xl font-bold mt-1">Yemek Kayıtlarım</Text>
            </View>
            <View className="bg-indigo-500/20 p-3 rounded-2xl">
              <Ionicons name="analytics" size={26} color="#818cf8" />
            </View>
          </View>

          {/* Üst İstatistik Kartları */}
          <View className="flex-row gap-3 mt-5">
            <View className="flex-1 bg-white/10 p-3 rounded-2xl items-center">
              <Ionicons name="flame" size={20} color="#ef4444" />
              <Text className="text-white text-lg font-bold mt-1">{toplam.kalori}</Text>
              <Text className="text-slate-400 text-xs">Toplam kcal</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-2xl items-center">
              <Ionicons name="restaurant" size={20} color="#6366f1" />
              <Text className="text-white text-lg font-bold mt-1">{toplam.ogun_sayisi}</Text>
              <Text className="text-slate-400 text-xs">Toplam Öğün</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-2xl items-center">
              <Ionicons name="calendar" size={20} color="#10b981" />
              <Text className="text-white text-lg font-bold mt-1">{gunlukIstatistik.length}</Text>
              <Text className="text-slate-400 text-xs">Aktif Gün</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* TAB SWITCH */}
      <View className="flex-row mx-5 mt-5 bg-white rounded-2xl p-1 border border-slate-200">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${activeTab === 'grafik' ? 'bg-indigo-500' : ''}`}
          onPress={() => setActiveTab('grafik')}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart" size={16} color={activeTab === 'grafik' ? '#fff' : '#64748b'} />
          <Text className={`font-bold ${activeTab === 'grafik' ? 'text-white' : 'text-slate-500'}`}>Grafikler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${activeTab === 'liste' ? 'bg-indigo-500' : ''}`}
          onPress={() => setActiveTab('liste')}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={16} color={activeTab === 'liste' ? '#fff' : '#64748b'} />
          <Text className={`font-bold ${activeTab === 'liste' ? 'text-white' : 'text-slate-500'}`}>Geçmiş</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 mt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.protein]} />}
      >
        {activeTab === 'grafik' ? (
          <>
            {/* KALORI TREND GRAFIĞİ */}
            <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-800">Kalori Trendi</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">Son 7 günlük kalori alımı</Text>
                </View>
                <View className="bg-red-50 p-2 rounded-xl">
                  <Ionicons name="trending-up" size={20} color="#ef4444" />
                </View>
              </View>

              {gunlukIstatistik.length > 1 ? (
                <LineChart
                  data={{
                    labels: gunlukIstatistik.map((g) => g.gun_kisa),
                    datasets: [{ data: gunlukIstatistik.map((g) => g.kalori || 0) }],
                  }}
                  width={screenWidth - 70}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#ef4444' },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                  withInnerLines={true}
                  withOuterLines={false}
                />
              ) : (
                <View className="h-48 justify-center items-center">
                  <Ionicons name="analytics-outline" size={48} color="#e2e8f0" />
                  <Text className="text-slate-400 text-sm mt-3">Grafik için en az 2 günlük veri gerekli</Text>
                </View>
              )}
            </View>

            {/* MAKRO BESİN DAĞILIMI (PIE CHART) */}
            <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-800">Makro Besin Dağılımı</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">Protein • Yağ • Karbonhidrat</Text>
                </View>
                <View className="bg-indigo-50 p-2 rounded-xl">
                  <Ionicons name="pie-chart" size={20} color="#6366f1" />
                </View>
              </View>

              <PieChart
                data={pieData}
                width={screenWidth - 70}
                height={200}
                chartConfig={chartConfig}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />

              {/* Makro Detay Kartları */}
              <View className="flex-row gap-3 mt-4">
                <View className="flex-1 bg-indigo-50 p-3 rounded-2xl items-center border border-indigo-100">
                  <View className="w-3 h-3 rounded-full bg-indigo-500 mb-2" />
                  <Text className="text-indigo-700 text-lg font-bold">{toplam.protein}g</Text>
                  <Text className="text-indigo-400 text-xs font-medium">Protein</Text>
                </View>
                <View className="flex-1 bg-amber-50 p-3 rounded-2xl items-center border border-amber-100">
                  <View className="w-3 h-3 rounded-full bg-amber-500 mb-2" />
                  <Text className="text-amber-700 text-lg font-bold">{toplam.yag}g</Text>
                  <Text className="text-amber-400 text-xs font-medium">Yağ</Text>
                </View>
                <View className="flex-1 bg-emerald-50 p-3 rounded-2xl items-center border border-emerald-100">
                  <View className="w-3 h-3 rounded-full bg-emerald-500 mb-2" />
                  <Text className="text-emerald-700 text-lg font-bold">{toplam.karbonhidrat}g</Text>
                  <Text className="text-emerald-400 text-xs font-medium">Karbonhidrat</Text>
                </View>
              </View>
            </View>

            {/* PROTEİN / YAĞ / KARBONHİDRAT TREND */}
            {gunlukIstatistik.length > 1 && (
              <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-lg font-bold text-slate-800">Besin Trendi</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">Günlük makro besin değişimi</Text>
                  </View>
                  <View className="bg-emerald-50 p-2 rounded-xl">
                    <Ionicons name="pulse" size={20} color="#10b981" />
                  </View>
                </View>

                <LineChart
                  data={{
                    labels: gunlukIstatistik.map((g) => g.gun_kisa),
                    datasets: [
                      { data: gunlukIstatistik.map((g) => g.protein || 0), color: () => COLORS.protein, strokeWidth: 2 },
                      { data: gunlukIstatistik.map((g) => g.yag || 0), color: () => COLORS.yag, strokeWidth: 2 },
                      { data: gunlukIstatistik.map((g) => g.karbonhidrat || 0), color: () => COLORS.karbonhidrat, strokeWidth: 2 },
                    ],
                    legend: ['Protein', 'Yağ', 'Karbonhidrat'],
                  }}
                  width={screenWidth - 70}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                  withInnerLines={true}
                  withOuterLines={false}
                />
              </View>
            )}
          </>
        ) : (
          <>
            {/* YEMEK GEÇMİŞİ LİSTESİ */}
            {Object.keys(grupluYemekler).length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-slate-100 mt-2">
                <Ionicons name="restaurant-outline" size={56} color="#e2e8f0" />
                <Text className="text-slate-400 text-base font-medium mt-4">Henüz yemek kaydı yok</Text>
                <Text className="text-slate-300 text-sm mt-1 text-center">
                  Ana sayfadan fotoğraf çekerek yemek eklemeye başlayabilirsiniz.
                </Text>
              </View>
            ) : (
              Object.entries(grupluYemekler).map(([gun, yemekListesi]) => (
                <View key={gun} className="mb-5">
                  {/* Gün Başlığı */}
                  <View className="flex-row items-center mb-3 gap-2">
                    <Ionicons name="calendar-outline" size={16} color="#6366f1" />
                    <Text className="text-base font-bold text-slate-700">{formatTarih(gun)}</Text>
                    <View className="flex-1 h-px bg-slate-200 ml-2" />
                    <Text className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                      {yemekListesi.reduce((sum, y) => sum + y.kalori, 0)} kcal
                    </Text>
                  </View>

                  {/* Yemek Kartları */}
                  {yemekListesi.map((yemek, idx) => (
                    <View
                      key={yemek.id || idx}
                      className="bg-white rounded-2xl p-4 mb-2 border border-slate-100 border-l-4 border-l-indigo-400"
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-slate-800">{yemek.yemek_adi}</Text>
                          <Text className="text-xs text-slate-400 mt-0.5">
                            {yemek.tarih.split(' ')[1] || ''} • Güven: %{(yemek.guven_orani * 100).toFixed(0)}
                          </Text>
                        </View>
                        <View className="bg-red-50 px-3 py-1.5 rounded-xl">
                          <Text className="text-red-500 font-bold text-sm">{yemek.kalori} kcal</Text>
                        </View>
                      </View>

                      {/* Makro Besin Barları */}
                      <View className="flex-row gap-3 mt-3">
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-indigo-500 font-semibold">Protein</Text>
                            <Text className="text-xs text-indigo-400 font-bold">{yemek.protein}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min((yemek.protein / 50) * 100, 100)}%` }}
                            />
                          </View>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-amber-500 font-semibold">Yağ</Text>
                            <Text className="text-xs text-amber-400 font-bold">{yemek.yag}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${Math.min((yemek.yag / 40) * 100, 100)}%` }}
                            />
                          </View>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-emerald-500 font-semibold">Karb</Text>
                            <Text className="text-xs text-emerald-400 font-bold">{yemek.karbonhidrat}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min((yemek.karbonhidrat / 60) * 100, 100)}%` }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
