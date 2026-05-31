import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
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
  
  // Tarih filtreleme state'leri
  const [filterMode, setFilterMode] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Özel takvim hesaplama yardımcı fonksiyonları
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Pzt=0, Paz=6
  };

  const calendarMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Önceki ay boşluk dolgusu
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Bu ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = (currentMonth + 1).toString().padStart(2, '0');
      const dayStr = i.toString().padStart(2, '0');
      days.push(`${currentYear}-${monthStr}-${dayStr}`);
    }

    return days;
  };

  const handleDayPress = (dayStr: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dayStr);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (dayStr >= startDate) {
        setEndDate(dayStr);
      } else {
        setStartDate(dayStr);
        setEndDate(null);
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  };

  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  };

  // Reaktif filtreleme motoru
  const getFilteredData = () => {
    let filtered = [...yemekler];
    const sevenDaysAgo = getSevenDaysAgo();
    const thirtyDaysAgo = getThirtyDaysAgo();

    if (filterMode === 'today') {
      filtered = filtered.filter(y => y.tarih.startsWith(todayStr));
    } else if (filterMode === '7days') {
      filtered = filtered.filter(y => {
        const d = y.tarih.split(' ')[0];
        return d >= sevenDaysAgo && d <= todayStr;
      });
    } else if (filterMode === '30days') {
      filtered = filtered.filter(y => {
        const d = y.tarih.split(' ')[0];
        return d >= thirtyDaysAgo && d <= todayStr;
      });
    } else if (filterMode === 'custom') {
      if (startDate) {
        filtered = filtered.filter(y => y.tarih.split(' ')[0] >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter(y => y.tarih.split(' ')[0] <= endDate);
      }
    }

    // Filtrelenmiş yemek kayıtlarına göre günlük özet istatistikleri yeniden hesapla
    const gunluk_istatistik_map: { [gun: string]: any } = {};
    filtered.forEach((row) => {
      const gun = row.tarih.split(' ')[0];
      if (!gunluk_istatistik_map[gun]) {
        gunluk_istatistik_map[gun] = { kalori: 0, protein: 0, yag: 0, karbonhidrat: 0, ogun_sayisi: 0 };
      }
      gunluk_istatistik_map[gun].kalori += row.kalori || 0;
      gunluk_istatistik_map[gun].protein += row.protein || 0;
      gunluk_istatistik_map[gun].yag += row.yag || 0;
      gunluk_istatistik_map[gun].karbonhidrat += row.karbonhidrat || 0;
      gunluk_istatistik_map[gun].ogun_sayisi += 1;
    });

    const sortedDays = Object.keys(gunluk_istatistik_map).sort();
    const gunlukIstatistikFiltered = sortedDays.map((gun) => {
      const stat = gunluk_istatistik_map[gun];
      try {
        const [yil, ay, gunNo] = gun.split('-');
        return {
          tarih: gun,
          gun_kisa: `${gunNo}/${ay}`,
          ...stat
        };
      } catch {
        return {
          tarih: gun,
          gun_kisa: gun,
          ...stat
        };
      }
    });

    const toplamFiltered = {
      kalori: Math.round(filtered.reduce((sum, y) => sum + (y.kalori || 0), 0)),
      protein: Math.round(filtered.reduce((sum, y) => sum + (y.protein || 0), 0)),
      yag: Math.round(filtered.reduce((sum, y) => sum + (y.yag || 0), 0)),
      karbonhidrat: Math.round(filtered.reduce((sum, y) => sum + (y.karbonhidrat || 0), 0)),
      ogun_sayisi: filtered.length
    };

    return {
      yemekler: filtered,
      gunlukIstatistik: gunlukIstatistikFiltered,
      toplam: toplamFiltered
    };
  };

  const { yemekler: filteredYemekler, gunlukIstatistik: filteredGunlukIstatistik, toplam: filteredToplam } = getFilteredData();

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

  const deleteRecordedMeal = (yemekId: string) => {
    if (!yemekId) return;
    
    Alert.alert(
      "Yemeği Sil",
      "Bu yemeği kayıtlarınızdan silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('yemek_id', yemekId);
              
              const response = await axios.post(`${API_URL}/yemek-sil`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
              });
              
              if (response.data.status === 'success') {
                Alert.alert("Başarılı", "Yemek kayıtlarınızdan başarıyla silindi!");
                await verileriGetir(); // Verileri yeniden çek
              }
            } catch (err) {
              console.error("Yemek silme hatası:", err);
              Alert.alert("Hata", "Yemek silinirken bir hata oluştu.");
            }
          }
        }
      ]
    );
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
  const makroTotal = filteredToplam.protein + filteredToplam.yag + filteredToplam.karbonhidrat;
  const pieData = makroTotal > 0 ? [
    {
      name: 'Protein',
      value: filteredToplam.protein,
      color: COLORS.protein,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
    {
      name: 'Yağ',
      value: filteredToplam.yag,
      color: COLORS.yag,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
    {
      name: 'Karbonhidrat',
      value: filteredToplam.karbonhidrat,
      color: COLORS.karbonhidrat,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 13,
    },
  ] : [
    { name: 'Veri Yok', value: 1, color: '#e2e8f0', legendFontColor: COLORS.textMuted, legendFontSize: 13 },
  ];

  // Yemekleri güne göre grupla
  const grupluYemekler: { [gun: string]: Yemek[] } = {};
  filteredYemekler.forEach((y) => {
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
              <Text className="text-white text-lg font-bold mt-1">{filteredToplam.kalori}</Text>
              <Text className="text-slate-400 text-xs">Toplam kcal</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-2xl items-center">
              <Ionicons name="restaurant" size={20} color="#6366f1" />
              <Text className="text-white text-lg font-bold mt-1">{filteredToplam.ogun_sayisi}</Text>
              <Text className="text-slate-400 text-xs">Toplam Öğün</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-2xl items-center">
              <Ionicons name="calendar" size={20} color="#10b981" />
              <Text className="text-white text-lg font-bold mt-1">{filteredGunlukIstatistik.length}</Text>
              <Text className="text-slate-400 text-xs">Aktif Gün</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* TARİH FİLTRELERİ */}
      <View className="px-5 mt-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {[
            { key: 'all', label: 'Tüm Zamanlar', icon: 'infinite' },
            { key: 'today', label: 'Bugün', icon: 'today' },
            { key: '7days', label: 'Son 7 Gün', icon: 'calendar' },
            { key: '30days', label: 'Son 30 Gün', icon: 'calendar-outline' },
            { key: 'custom', label: startDate && endDate ? `${formatTarih(startDate)} - ${formatTarih(endDate)}` : 'Özel Aralık...', icon: 'options' },
          ].map((chip) => {
            const isSelected = filterMode === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => {
                  if (chip.key === 'custom') {
                    setFilterMode('custom');
                    setShowCalendarModal(true);
                  } else {
                    setFilterMode(chip.key as any);
                  }
                }}
                className={`flex-row items-center px-4 py-2.5 rounded-full mr-2.5 border ${
                  isSelected 
                    ? 'bg-indigo-500 border-indigo-500 shadow-sm' 
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={chip.icon as any} 
                  size={14} 
                  color={isSelected ? '#fff' : '#64748b'} 
                  style={{ marginRight: 6 }} 
                />
                <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ÖZEL TAKVİM MODALI */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <View className="bg-white rounded-[32px] p-6 w-full max-w-md border border-slate-100 shadow-2xl">
            {/* Modal Başlığı */}
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-extrabold text-slate-800">Tarih Aralığı Seçin</Text>
                <Text className="text-xs text-slate-400 mt-0.5">Başlangıç ve bitiş tarihlerine dokunun</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowCalendarModal(false)}
                className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Ay ve Yıl Seçimi */}
            <View className="flex-row justify-between items-center mb-5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <TouchableOpacity 
                onPress={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(prev => prev - 1);
                  } else {
                    setCurrentMonth(prev => prev - 1);
                  }
                }}
                className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-slate-200/50 shadow-sm"
              >
                <Ionicons name="chevron-back" size={20} color="#1e293b" />
              </TouchableOpacity>

              <Text className="text-base font-bold text-slate-700">
                {calendarMonths[currentMonth]} {currentYear}
              </Text>

              <TouchableOpacity 
                onPress={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(prev => prev + 1);
                  } else {
                    setCurrentMonth(prev => prev + 1);
                  }
                }}
                className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-slate-200/50 shadow-sm"
              >
                <Ionicons name="chevron-forward" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {/* Gün İsimleri Satırı */}
            <View className="flex-row mb-2">
              {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((dayName, idx) => (
                <View key={idx} className="flex-1 items-center py-1">
                  <Text className="text-xs font-bold text-slate-400">{dayName}</Text>
                </View>
              ))}
            </View>

            {/* Günler Izgarası (Grid) */}
            <View className="flex-row flex-wrap">
              {getCalendarDays().map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 40 }} />;
                }

                const dayNum = parseInt(day.split('-')[2]);
                const isStart = day === startDate;
                const isEnd = day === endDate;
                const isWithinRange = startDate && endDate && day > startDate && day < endDate;

                let dayBgClass = 'bg-transparent';
                let dayTextClass = 'text-slate-800';

                if (isStart || isEnd) {
                  dayBgClass = 'bg-indigo-500 rounded-full';
                  dayTextClass = 'text-white font-extrabold';
                } else if (isWithinRange) {
                  dayBgClass = 'bg-indigo-50 rounded-lg';
                  dayTextClass = 'text-indigo-600 font-bold';
                }

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleDayPress(day)}
                    style={{ width: '14.28%', height: 40 }}
                    className={`justify-center items-center ${dayBgClass}`}
                  >
                    <Text className={`text-sm ${dayTextClass}`}>{dayNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seçim Özeti */}
            <View className="mt-6 pt-4 border-t border-slate-100">
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Başlangıç</Text>
                  <Text className="text-sm font-semibold text-slate-700 mt-0.5">
                    {startDate ? formatTarih(startDate) : 'Seçilmedi'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bitiş</Text>
                  <Text className="text-sm font-semibold text-slate-700 mt-0.5">
                    {endDate ? formatTarih(endDate) : 'Seçilmedi'}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setFilterMode('all');
                    setShowCalendarModal(false);
                  }}
                  className="flex-1 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl items-center justify-center active:bg-slate-100"
                >
                  <Text className="text-slate-500 font-bold text-sm">Temizle</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => {
                    if (startDate && !endDate) {
                      setEndDate(startDate); // Tek tarih seçildiyse otomatik bitiş yap
                    }
                    setShowCalendarModal(false);
                  }}
                  className="flex-1 py-3.5 bg-indigo-500 rounded-2xl items-center justify-center active:opacity-80 shadow-sm"
                >
                  <Text className="text-white font-bold text-sm">Filtreyi Uygula</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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

              {filteredGunlukIstatistik.length > 1 ? (
                <LineChart
                  data={{
                    labels: filteredGunlukIstatistik.map((g) => g.gun_kisa),
                    datasets: [{ data: filteredGunlukIstatistik.map((g) => g.kalori || 0) }],
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
                  <Text className="text-indigo-700 text-lg font-bold">{filteredToplam.protein}g</Text>
                  <Text className="text-indigo-400 text-xs font-medium">Protein</Text>
                </View>
                <View className="flex-1 bg-amber-50 p-3 rounded-2xl items-center border border-amber-100">
                  <View className="w-3 h-3 rounded-full bg-amber-500 mb-2" />
                  <Text className="text-amber-700 text-lg font-bold">{filteredToplam.yag}g</Text>
                  <Text className="text-amber-400 text-xs font-medium">Yağ</Text>
                </View>
                <View className="flex-1 bg-emerald-50 p-3 rounded-2xl items-center border border-emerald-100">
                  <View className="w-3 h-3 rounded-full bg-emerald-500 mb-2" />
                  <Text className="text-emerald-700 text-lg font-bold">{filteredToplam.karbonhidrat}g</Text>
                  <Text className="text-emerald-400 text-xs font-medium">Karbonhidrat</Text>
                </View>
              </View>
            </View>

            {/* PROTEİN / YAĞ / KARBONHİDRAT TREND */}
            {filteredGunlukIstatistik.length > 1 && (
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
                    labels: filteredGunlukIstatistik.map((g) => g.gun_kisa),
                    datasets: [
                      { data: filteredGunlukIstatistik.map((g) => g.protein || 0), color: () => COLORS.protein, strokeWidth: 2 },
                      { data: filteredGunlukIstatistik.map((g) => g.yag || 0), color: () => COLORS.yag, strokeWidth: 2 },
                      { data: filteredGunlukIstatistik.map((g) => g.karbonhidrat || 0), color: () => COLORS.karbonhidrat, strokeWidth: 2 },
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
                        <View className="flex-1 mr-2">
                          <Text className="text-base font-bold text-slate-800">{yemek.yemek_adi}</Text>
                          <Text className="text-xs text-slate-400 mt-0.5">
                            {yemek.tarih.split(' ')[1] || ''} • Güven: %{(yemek.guven_orani * 100).toFixed(0)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <View className="bg-red-50 px-3 py-1.5 rounded-xl">
                            <Text className="text-red-500 font-bold text-sm">{yemek.kalori} kcal</Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => deleteRecordedMeal(yemek.id)}
                            className="p-1"
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
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
