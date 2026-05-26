import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  protein: '#6366f1',
  yag: '#f59e0b',
  karbonhidrat: '#10b981',
  kalori: '#ef4444',
};

export default function HastaDetayScreen() {
  const { email, fullname } = useLocalSearchParams();
  const router = useRouter();
  const [ozet, setOzet] = useState<any>(null);
  const [gecmis, setGecmis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ozet' | 'grafik' | 'gecmis'>('ozet');

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ozetRes, gecmisRes] = await Promise.all([
          axios.get(`${API_URL}/hasta-ozet`, { params: { hasta_email: email } }),
          axios.get(`${API_URL}/yemek-gecmisi`, { params: { hasta_email: email }, headers: { 'ngrok-skip-browser-warning': 'true' } }),
        ]);
        setOzet(ozetRes.data);
        setGecmis(gecmisRes.data);
      } catch (error) {
        console.error("Hasta verileri alınamadı:", error);
      } finally {
        setLoading(false);
      }
    };
    if (email) fetchData();
  }, [email]);

  const chartConfig = {
    backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => '#64748b',
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366f1' },
    propsForBackgroundLines: { strokeDasharray: '5,5', stroke: '#e2e8f0' },
  };

  const formatTarih = (t: string) => {
    try {
      const [y, m, d] = t.split('-');
      const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
      return `${parseInt(d)} ${aylar[parseInt(m)-1]}`;
    } catch { return t; }
  };

  const toplam = gecmis?.toplam || { kalori: 0, protein: 0, yag: 0, karbonhidrat: 0, ogun_sayisi: 0 };
  const gunluk = gecmis?.gunluk_istatistik || [];
  const yemekler = gecmis?.yemekler || [];

  const makroTotal = toplam.protein + toplam.yag + toplam.karbonhidrat;
  const pieData = makroTotal > 0 ? [
    { name: 'Protein', value: toplam.protein, color: COLORS.protein, legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Yağ', value: toplam.yag, color: COLORS.yag, legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Karbonhidrat', value: toplam.karbonhidrat, color: COLORS.karbonhidrat, legendFontColor: '#64748b', legendFontSize: 12 },
  ] : [{ name: 'Veri Yok', value: 1, color: '#e2e8f0', legendFontColor: '#94a3b8', legendFontSize: 12 }];

  // Yemekleri güne göre grupla
  const gruplu: { [g: string]: any[] } = {};
  yemekler.forEach((y: any) => {
    const g = y.tarih.split(' ')[0];
    if (!gruplu[g]) gruplu[g] = [];
    gruplu[g].push(y);
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-500 mt-4 font-bold">Hasta verileri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* HEADER */}
      <View className="flex-row items-center px-5 pt-4 pb-4 bg-slate-800 rounded-b-[25px]">
        <TouchableOpacity className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-4" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">{fullname || email}</Text>
          <Text className="text-slate-400 text-xs">{email}</Text>
        </View>
        <View className="flex-row gap-2">
          <View className="bg-white/10 px-3 py-1.5 rounded-xl">
            <Text className="text-white text-xs font-bold">{toplam.ogun_sayisi} öğün</Text>
          </View>
        </View>
      </View>

      {/* TAB SWITCH */}
      <View className="flex-row mx-5 mt-4 bg-white rounded-2xl p-1 border border-slate-200">
        {[
          { key: 'ozet', label: 'Özet', icon: 'today' },
          { key: 'grafik', label: 'Grafikler', icon: 'bar-chart' },
          { key: 'gecmis', label: 'Geçmiş', icon: 'list' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1 ${activeTab === tab.key ? 'bg-indigo-500' : ''}`}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? '#fff' : '#64748b'} />
            <Text className={`font-bold text-xs ${activeTab === tab.key ? 'text-white' : 'text-slate-500'}`}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 px-5 mt-4" showsVerticalScrollIndicator={false}>

        {/* ===== ÖZET SEKMESİ ===== */}
        {activeTab === 'ozet' && (
          <>
            {/* Su */}
            <View className="bg-cyan-50 p-5 rounded-3xl mb-4 flex-row items-center border border-cyan-100">
              <View className="w-14 h-14 bg-cyan-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="water" size={28} color="#06b6d4" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-cyan-800 mb-1">Bugün Su Tüketimi</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-cyan-600">{ozet?.bugun_su || 0}</Text>
                  <Text className="text-sm font-bold text-cyan-600 ml-1">L</Text>
                  <Text className="text-xs font-bold text-cyan-400 ml-2">/ {ozet?.hedef_su || 2.5} L</Text>
                </View>
                <View className="w-full h-2 bg-cyan-200 rounded-full mt-2 overflow-hidden">
                  <View className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(((ozet?.bugun_su || 0) / (ozet?.hedef_su || 2.5)) * 100, 100)}%` }} />
                </View>
              </View>
            </View>

            {/* Kalori */}
            <View className="bg-orange-50 p-5 rounded-3xl mb-4 flex-row items-center border border-orange-100">
              <View className="w-14 h-14 bg-orange-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="flame" size={28} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-orange-800 mb-1">Bugün Alınan Kalori</Text>
                <Text className="text-2xl font-black text-orange-600">{ozet?.bugun_kalori || 0} <Text className="text-sm">kcal</Text></Text>
              </View>
            </View>

            {/* Makro Özet */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 bg-indigo-50 p-3 rounded-2xl items-center border border-indigo-100">
                <View className="w-3 h-3 rounded-full bg-indigo-500 mb-1" />
                <Text className="text-indigo-700 text-lg font-bold">{toplam.protein}g</Text>
                <Text className="text-indigo-400 text-xs font-medium">Protein</Text>
              </View>
              <View className="flex-1 bg-amber-50 p-3 rounded-2xl items-center border border-amber-100">
                <View className="w-3 h-3 rounded-full bg-amber-500 mb-1" />
                <Text className="text-amber-700 text-lg font-bold">{toplam.yag}g</Text>
                <Text className="text-amber-400 text-xs font-medium">Yağ</Text>
              </View>
              <View className="flex-1 bg-emerald-50 p-3 rounded-2xl items-center border border-emerald-100">
                <View className="w-3 h-3 rounded-full bg-emerald-500 mb-1" />
                <Text className="text-emerald-700 text-lg font-bold">{toplam.karbonhidrat}g</Text>
                <Text className="text-emerald-400 text-xs font-medium">Karbonhidrat</Text>
              </View>
            </View>

            {/* Bugün Yedikleri */}
            <Text className="text-lg font-bold text-slate-800 mb-3">Bugün Yedikleri</Text>
            {ozet?.bugun_yemekler?.length > 0 ? (
              ozet.bugun_yemekler.map((y: any, i: number) => (
                <View key={i} className="bg-white p-4 rounded-2xl mb-2 flex-row items-center justify-between border border-slate-100 border-l-4 border-l-orange-400">
                  <View>
                    <Text className="font-bold text-slate-800">{y.yemek_adi}</Text>
                    <Text className="text-slate-400 text-xs">{y.saat}</Text>
                  </View>
                  <View className="bg-orange-50 px-3 py-1 rounded-xl">
                    <Text className="text-orange-600 font-bold text-xs">{y.kalori} kcal</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-200 items-center mb-4">
                <Ionicons name="fast-food-outline" size={32} color="#94a3b8" />
                <Text className="text-slate-500 text-sm mt-2">Bugün henüz yemek kaydı yok.</Text>
              </View>
            )}

            {/* Dün Yedikleri */}
            <Text className="text-lg font-bold text-slate-800 mb-3 mt-4">Dün Yedikleri</Text>
            {ozet?.dun_yemekler?.length > 0 ? (
              ozet.dun_yemekler.map((y: any, i: number) => (
                <View key={i} className="bg-white p-4 rounded-2xl mb-2 flex-row items-center justify-between border border-slate-100 opacity-70">
                  <View>
                    <Text className="font-bold text-slate-700">{y.yemek_adi}</Text>
                    <Text className="text-slate-400 text-xs">{y.saat}</Text>
                  </View>
                  <View className="bg-slate-100 px-3 py-1 rounded-xl">
                    <Text className="text-slate-600 font-bold text-xs">{y.kalori} kcal</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-200 items-center mb-4">
                <Ionicons name="fast-food-outline" size={32} color="#94a3b8" />
                <Text className="text-slate-500 text-sm mt-2">Dün yemek kaydı yok.</Text>
              </View>
            )}
          </>
        )}

        {/* ===== GRAFİKLER SEKMESİ ===== */}
        {activeTab === 'grafik' && (
          <>
            {/* Kalori Trend */}
            <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-800">Kalori Trendi</Text>
                  <Text className="text-xs text-slate-400">Son 7 gün</Text>
                </View>
                <View className="bg-red-50 p-2 rounded-xl">
                  <Ionicons name="trending-up" size={20} color="#ef4444" />
                </View>
              </View>
              {gunluk.length > 1 ? (
                <LineChart
                  data={{ labels: gunluk.map((g: any) => g.gun_kisa), datasets: [{ data: gunluk.map((g: any) => g.kalori || 0) }] }}
                  width={screenWidth - 70} height={200}
                  chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(239,68,68,${o})`, propsForDots: { r: '4', strokeWidth: '2', stroke: '#ef4444' } }}
                  bezier style={{ borderRadius: 16 }} withInnerLines withOuterLines={false}
                />
              ) : (
                <View className="h-40 justify-center items-center">
                  <Ionicons name="analytics-outline" size={48} color="#e2e8f0" />
                  <Text className="text-slate-400 text-sm mt-3">En az 2 günlük veri gerekli</Text>
                </View>
              )}
            </View>

            {/* Makro Pasta Grafik */}
            <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-800">Makro Besin Dağılımı</Text>
                  <Text className="text-xs text-slate-400">Protein • Yağ • Karbonhidrat</Text>
                </View>
                <View className="bg-indigo-50 p-2 rounded-xl">
                  <Ionicons name="pie-chart" size={20} color="#6366f1" />
                </View>
              </View>
              <PieChart
                data={pieData} width={screenWidth - 70} height={200}
                chartConfig={chartConfig} accessor="value" backgroundColor="transparent" paddingLeft="15" absolute
              />
            </View>

            {/* Makro Trend */}
            {gunluk.length > 1 && (
              <View className="bg-white rounded-3xl p-5 mb-5 border border-slate-100">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-lg font-bold text-slate-800">Besin Trendi</Text>
                    <Text className="text-xs text-slate-400">Günlük makro değişimi</Text>
                  </View>
                  <View className="bg-emerald-50 p-2 rounded-xl">
                    <Ionicons name="pulse" size={20} color="#10b981" />
                  </View>
                </View>
                <LineChart
                  data={{
                    labels: gunluk.map((g: any) => g.gun_kisa),
                    datasets: [
                      { data: gunluk.map((g: any) => g.protein || 0), color: () => COLORS.protein, strokeWidth: 2 },
                      { data: gunluk.map((g: any) => g.yag || 0), color: () => COLORS.yag, strokeWidth: 2 },
                      { data: gunluk.map((g: any) => g.karbonhidrat || 0), color: () => COLORS.karbonhidrat, strokeWidth: 2 },
                    ],
                    legend: ['Protein', 'Yağ', 'Karbonhidrat'],
                  }}
                  width={screenWidth - 70} height={220} chartConfig={chartConfig}
                  bezier style={{ borderRadius: 16 }} withInnerLines withOuterLines={false}
                />
              </View>
            )}
          </>
        )}

        {/* ===== GEÇMİŞ SEKMESİ ===== */}
        {activeTab === 'gecmis' && (
          <>
            {Object.keys(gruplu).length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-slate-100 mt-2">
                <Ionicons name="restaurant-outline" size={56} color="#e2e8f0" />
                <Text className="text-slate-400 text-base font-medium mt-4">Henüz yemek kaydı yok</Text>
              </View>
            ) : (
              Object.entries(gruplu).map(([gun, liste]) => (
                <View key={gun} className="mb-5">
                  <View className="flex-row items-center mb-3 gap-2">
                    <Ionicons name="calendar-outline" size={16} color="#6366f1" />
                    <Text className="text-base font-bold text-slate-700">{formatTarih(gun)}</Text>
                    <View className="flex-1 h-px bg-slate-200 ml-2" />
                    <Text className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                      {liste.reduce((s: number, y: any) => s + y.kalori, 0)} kcal
                    </Text>
                  </View>
                  {liste.map((y: any, i: number) => (
                    <View key={y.id || i} className="bg-white rounded-2xl p-4 mb-2 border border-slate-100 border-l-4 border-l-indigo-400">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-slate-800">{y.yemek_adi}</Text>
                          <Text className="text-xs text-slate-400 mt-0.5">{y.tarih.split(' ')[1] || ''}</Text>
                        </View>
                        <View className="bg-red-50 px-3 py-1.5 rounded-xl">
                          <Text className="text-red-500 font-bold text-sm">{y.kalori} kcal</Text>
                        </View>
                      </View>
                      <View className="flex-row gap-3 mt-3">
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-indigo-500 font-semibold">Protein</Text>
                            <Text className="text-xs text-indigo-400 font-bold">{y.protein}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((y.protein / 50) * 100, 100)}%` }} />
                          </View>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-amber-500 font-semibold">Yağ</Text>
                            <Text className="text-xs text-amber-400 font-bold">{y.yag}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((y.yag / 40) * 100, 100)}%` }} />
                          </View>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-emerald-500 font-semibold">Karb</Text>
                            <Text className="text-xs text-emerald-400 font-bold">{y.karbonhidrat}g</Text>
                          </View>
                          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((y.karbonhidrat / 60) * 100, 100)}%` }} />
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
    </SafeAreaView>
  );
}
