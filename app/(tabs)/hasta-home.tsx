import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  ImageBackground,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const LOCAL_BESIN_CETVELI: { [key: string]: any } = {
  "french_fries": { "yemek_adi": "Patates Kızartması", "kalori": 312, "protein": 3.4, "yag": 15.0, "karbonhidrat": 41.0 },
  "kebab": { "yemek_adi": "Kebap", "kalori": 350, "protein": 25.0, "yag": 22.0, "karbonhidrat": 8.0 },
  "bulgur_pilavi": { "yemek_adi": "Bulgur Pilavı", "kalori": 215, "protein": 6.0, "yag": 5.0, "karbonhidrat": 38.0 },
  "fried_fish": { "yemek_adi": "Kızarmış Balık", "kalori": 290, "protein": 22.0, "yag": 16.0, "karbonhidrat": 12.0 },
  "gozleme": { "yemek_adi": "Gözleme", "kalori": 410, "protein": 12.0, "yag": 14.0, "karbonhidrat": 58.0 },
  "hamburger": { "yemek_adi": "Hamburger", "kalori": 300, "protein": 17.0, "yag": 14.0, "karbonhidrat": 28.0 },
  "iskender": { "yemek_adi": "İskender", "kalori": 750, "protein": 38.0, "yag": 45.0, "karbonhidrat": 48.0 },
  "karniyarik": { "yemek_adi": "Karnıyarık", "kalori": 270, "protein": 12.0, "yag": 18.0, "karbonhidrat": 15.0 },
  "kisir": { "yemek_adi": "Kısır", "kalori": 180, "protein": 4.0, "yag": 7.0, "karbonhidrat": 26.0 },
  "kofte": { "yemek_adi": "Köfte", "kalori": 280, "protein": 20.0, "yag": 18.0, "karbonhidrat": 10.0 },
  "kumpir": { "yemek_adi": "Kumpir", "kalori": 550, "protein": 15.0, "yag": 22.0, "karbonhidrat": 75.0 },
  "kunefe": { "yemek_adi": "Künefe", "kalori": 480, "protein": 8.0, "yag": 20.0, "karbonhidrat": 68.0 },
  "kuru_fasulye": { "yemek_adi": "Kuru Fasulye", "kalori": 290, "protein": 14.0, "yag": 8.0, "karbonhidrat": 40.0 },
  "lahmacun": { "yemek_adi": "Lahmacun", "kalori": 240, "protein": 10.0, "yag": 8.0, "karbonhidrat": 32.0 },
  "menemen": { "yemek_adi": "Menemen", "kalori": 190, "protein": 11.0, "yag": 13.0, "karbonhidrat": 8.0 },
  "mihlama": { "yemek_adi": "Mıhlama", "kalori": 450, "protein": 12.0, "yag": 38.0, "karbonhidrat": 15.0 },
  "pide": { "yemek_adi": "Pide", "kalori": 460, "protein": 18.0, "yag": 16.0, "karbonhidrat": 60.0 },
  "pirinc_pilav": { "yemek_adi": "Pirinç Pilavı", "kalori": 270, "protein": 4.0, "yag": 8.0, "karbonhidrat": 45.0 },
  "pizza": { "yemek_adi": "Pizza", "kalori": 250, "protein": 11.0, "yag": 10.0, "karbonhidrat": 30.0 },
  "sekerpare": { "yemek_adi": "Şekerpare", "kalori": 320, "protein": 4.0, "yag": 12.0, "karbonhidrat": 50.0 },
  "tulumba_tatlisi": { "yemek_adi": "Tulumba Tatlısı", "kalori": 280, "protein": 3.0, "yag": 10.0, "karbonhidrat": 45.0 },
  "yaprak_sarma": { "yemek_adi": "Yaprak Sarma", "kalori": 170, "protein": 3.0, "yag": 8.0, "karbonhidrat": 22.0 },
  "manti": { "yemek_adi": "Mantı", "kalori": 320, "protein": 10.0, "yag": 12.0, "karbonhidrat": 50.0 },
  "salad": { "yemek_adi": "Salata", "kalori": 100, "protein": 3.0, "yag": 5.0, "karbonhidrat": 10.0 }
};

export default function HastaHome() {
  const [hastaAdi, setHastaAdi] = useState('Danışan');
  const [hastaEmail, setHastaEmail] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [sonuc, setSonuc] = useState<any[] | null>(null);
  const [onaylandi, setOnaylandi] = useState(false);
  const [geriBildirim, setGeriBildirim] = useState<string | null>(null);

  const [showManualAddList, setShowManualAddList] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  const [diyetisyenler, setDiyetisyenler] = useState<string[]>([]);
  const [seciliDiyetisyen, setSeciliDiyetisyen] = useState<string | null>(null);
  const [bekleyenDiyetisyen, setBekleyenDiyetisyen] = useState<string | null>(null);
  const [showDiyetisyenSecimi, setShowDiyetisyenSecimi] = useState(false);

  const [ozet, setOzet] = useState({
    bugun_kalori: 0,
    hedef_kalori: 2000,
    bugun_su: 0.0,
    hedef_su: 2.5,
    bugun_yemekler: [],
    dun_yemekler: [],
    boy: null,
    kilo: null
  });

  const [boyInput, setBoyInput] = useState('');
  const [kiloInput, setKiloInput] = useState('');

  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/');
          }
        }
      ]
    );
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    const init = async () => {
      const email = await kullaniciAdiniAl();
      if (email) {
        await diyetisyenDurumunuKontrolEt(email);
        await gunlukOzetiGetir(email);
      }
      diyetisyenleriGetir();
    };
    
    if (pathname.includes('hasta-home')) {
      init();
    }
  }, [pathname]);

  const kullaniciAdiniAl = async () => {
    const email = await AsyncStorage.getItem('email');
    const fullname = await AsyncStorage.getItem('fullname');
    if (email) {
      setHastaEmail(email);
      setHastaAdi(fullname || email);
      return email;
    }
    return null;
  };

  const diyetisyenDurumunuKontrolEt = async (email: string) => {
    try {
      const response = await axios.get(`${API_URL}/hasta-diyetisyen`, { params: { hasta_email: email } });
      if (response.data.diyetisyen_status === "onaylandi") {
        setSeciliDiyetisyen(response.data.diyetisyen_fullname || response.data.diyetisyen);
        setBekleyenDiyetisyen(null);
        setShowDiyetisyenSecimi(false);
      } else if (response.data.diyetisyen_status === "beklemede") {
        setBekleyenDiyetisyen(response.data.istenen_diyetisyen_fullname || response.data.istenen_diyetisyen);
        setShowDiyetisyenSecimi(false);
      } else {
        setShowDiyetisyenSecimi(true);
      }
    } catch (error) {
      console.error("Diyetisyen durumu çekilemedi", error);
    }
  };

  const gunlukOzetiGetir = async (email: string) => {
    try {
      const response = await axios.get(`${API_URL}/hasta-ozet`, { params: { hasta_email: email } });
      setOzet(response.data);
    } catch (error) {
      console.error("Günlük özet çekilemedi:", error);
    }
  };

  const suEkle = async () => {
    try {
      const formData = new FormData();
      formData.append('hasta_email', hastaEmail);
      formData.append('miktar', '0.25'); // Bir bardak su

      const response = await axios.post(`${API_URL}/su-ekle`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
      });
      if (response.data.status === 'success') {
        setOzet(prev => ({ ...prev, bugun_su: response.data.bugun_su }));
      }
    } catch (error) {
      console.error("Su eklenemedi:", error);
    }
  };

  const profilKaydet = async () => {
    if (!boyInput || !kiloInput) {
      Alert.alert("Eksik Bilgi", "Lütfen boy ve kilo bilgilerinizi giriniz.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('hasta_email', hastaEmail);
      formData.append('boy', boyInput);
      formData.append('kilo', kiloInput);

      const response = await axios.post(`${API_URL}/profil-guncelle`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
      });
      if (response.data.status === 'success') {
        Alert.alert("Başarılı", "Profiliniz güncellendi! Su hedefiniz kilonuza göre tekrar hesaplandı.");
        await gunlukOzetiGetir(hastaEmail);
      }
    } catch (error) {
      console.error("Profil güncellenemedi:", error);
      Alert.alert("Hata", "Profil güncellenirken bir sorun oluştu.");
    }
  };

  const diyetisyenleriGetir = async () => {
    try {
      const response = await axios.get(`${API_URL}/diyetisyenler`);
      setDiyetisyenler(response.data.diyetisyenler); // artık [{email, fullname}, ...] formatında gelebilir
    } catch (error) {
      console.error("Diyetisyenler getirilemedi", error);
    }
  };

  const diyetisyenSec = async (diyetisyen: any) => {
    try {
      const formData = new FormData();
      formData.append('hasta_email', hastaEmail);
      formData.append('diyetisyen_email', diyetisyen.email);

      const response = await axios.post(`${API_URL}/diyetisyen-sec`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
      });
      
      if (response.data.status === 'success') {
        setBekleyenDiyetisyen(diyetisyen.fullname || diyetisyen.email);
        setShowDiyetisyenSecimi(false);
        Alert.alert("Başarılı", `İsteğiniz Dr. ${diyetisyen.fullname || diyetisyen.email} profiline iletildi. Onay bekleniyor.`);
      }
    } catch (error) {
      console.error("Diyetisyen seçilemedi", error);
      Alert.alert("Hata", "Diyetisyen seçilemedi.");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kameranıza erişim izni vermeniz gerekiyor!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setSonuc(null); 
      setOnaylandi(false);
      setGeriBildirim(null);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galerinize erişim izni vermeniz gerekiyor!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setSonuc(null); 
      setOnaylandi(false);
      setGeriBildirim(null);
    }
  };

  const selectImageSource = () => {
    Alert.alert(
      "Fotoğraf Ekle",
      "Yemeğinizin fotoğrafını nasıl eklemek istersiniz?",
      [
        {
          text: "Kamera ile Fotoğraf Çek",
          onPress: takePhoto,
        },
        {
          text: "Galeriden Fotoğraf Seç",
          onPress: pickImage,
        },
        {
          text: "İptal",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('hasta_email', hastaEmail); 
    formData.append('hasta_fullname', hastaAdi); 

    const filename = image.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('file', { uri: image, name: filename || 'photo.jpg', type } as any); 

    try {
      const response = await axios.post(`${API_URL}/tahmin-et`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' },
      });

      if (response.data.sonuc && response.data.sonuc.length > 0) {
        setSonuc(response.data.sonuc);
      } else {
        Alert.alert("Bilgi", "Yemek tam olarak tanımlanamadı.");
      }
    } catch (error) {
      Alert.alert("Hata", "Sunucuyla bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const getTotals = () => {
    if (!sonuc || sonuc.length === 0) return { kalori: 0, protein: 0, yag: 0, karbonhidrat: 0 };
    return sonuc.reduce((acc, item) => {
      acc.kalori += item.kalori || 0;
      acc.protein += item.protein || 0;
      acc.yag += item.yag || 0;
      acc.karbonhidrat += item.karbonhidrat || 0;
      return acc;
    }, { kalori: 0, protein: 0, yag: 0, karbonhidrat: 0 });
  };

  const getFilteredFoods = () => {
    return Object.entries(LOCAL_BESIN_CETVELI).filter(([key, val]: any) => 
      val.yemek_adi.toLowerCase().includes(manualSearchQuery.toLowerCase())
    );
  };

  const addManualFood = (key: string, food: any) => {
    if (!sonuc) return;
    const newFood = {
      ...food,
      guven_orani: 1.0,
      manuel: true
    };
    setSonuc([...sonuc, newFood]);
    setShowManualAddList(false);
    setManualSearchQuery('');
  };

  const removeFoodFromPrediction = (indexToRemove: number) => {
    if (!sonuc) return;
    setSonuc(sonuc.filter((_, idx) => idx !== indexToRemove));
  };

  const deleteRecordedMeal = (yemekId: string) => {
    if (!yemekId) return;
    
    Alert.alert(
      "Yemeği Sil",
      "Bu yemeği günlüğünüzden silmek istediğinize emin misiniz?",
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
                Alert.alert("Başarılı", "Yemek günlüğünüzden silindi!");
                await gunlukOzetiGetir(hastaEmail);
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

  const handleOnay = async () => {
    setIsSaving(true);
    
    const totals = getTotals();
    const foodNames = sonuc ? Array.from(new Set(sonuc.map(s => s.yemek_adi))).join(' ve ') : 'Öğün';
    
    // Save all approved items to MongoDB
    if (sonuc) {
      for (const item of sonuc) {
        try {
          const formData = new FormData();
          formData.append('hasta_email', hastaEmail);
          formData.append('hasta_fullname', hastaAdi);
          formData.append('yemek_adi', item.yemek_adi);
          formData.append('kalori', String(item.kalori));
          formData.append('protein', String(item.protein));
          formData.append('yag', String(item.yag));
          formData.append('karbonhidrat', String(item.karbonhidrat));

          await axios.post(`${API_URL}/yemek-ekle`, formData, {
            headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
          });
        } catch (err) {
          console.error("Yemek kaydetme hatası:", err);
        }
      }
    }

    let mesaj = "";
    if (totals.kalori > 400) {
      mesaj = `Bu öğün (${foodNames}), diyetisyeninizin belirlediği hedeflerle biraz çelişiyor. Bir dahaki sefere daha hafif bir alternatif tercih etmeye ne dersiniz?`;
    } else {
      mesaj = `Harika seçim! Bu öğün (${foodNames}), günlük hedeflerinize ulaşmanıza çok yardımcı olacak. Aynen böyle devam!`;
    }

    setGeriBildirim(mesaj);
    setOnaylandi(true);
    setIsSaving(false);
    await gunlukOzetiGetir(hastaEmail);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* ÜST KARANLIK ALAN (HEADER) */}
      <View className="bg-slate-800 rounded-b-[30px] pb-5">
        <SafeAreaView edges={['top', 'left', 'right']} className="px-6 pt-2">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-slate-300 text-lg font-medium">Akıllı Günlük & Koç</Text>
              <Text className="text-white text-xl font-bold mt-1">Merhaba, {hastaAdi}</Text>
              {seciliDiyetisyen && (
                <Text className="text-emerald-400 text-sm font-medium mt-1">
                  👨‍⚕️ Diyetisyeniniz: Dr. {seciliDiyetisyen}
                </Text>
              )}
              {bekleyenDiyetisyen && (
                <Text className="text-amber-400 text-sm font-medium mt-1">
                  ⏳ İstek Beklemede: Dr. {bekleyenDiyetisyen}
                </Text>
              )}
            </View>
            <View className="flex-row gap-3 items-center">
              <TouchableOpacity className="bg-slate-700 p-3 rounded-full relative">
                <Ionicons name="notifications" size={22} color="#fff" />
                <View className="absolute top-2 right-2.5 w-2 h-2 bg-emerald-400 rounded-full" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-slate-700 p-3 rounded-full" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Arama / İletişim Çubuğu Placeholder */}
          <View className="flex-row items-center bg-white rounded-2xl mt-6 px-4 py-3">
            <Ionicons name="chatbubble-ellipses" size={20} color="#94a3b8" className="mr-2" />
            <Text className="flex-1 text-base text-slate-400">
              Yapay Zeka Koçuna bir şey sor...
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView className="px-5 mt-5" showsVerticalScrollIndicator={false}>
        
        {/* DİYETİSYEN SEÇİM EKRANI */}
        {showDiyetisyenSecimi && (
          <View className="bg-white p-6 rounded-3xl border border-slate-200 mb-6 border-l-4 border-l-purple-500 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider">Diyetisyen Seçimi</Text>
              <Ionicons name="medical" size={18} color="#a855f7" />
            </View>
            <Text className="text-base text-slate-800 mt-2 mb-4">
              Size daha iyi yardımcı olabilmemiz için lütfen bir diyetisyen seçin.
            </Text>
            
            {diyetisyenler.length > 0 ? (
              <View className="gap-2">
                {diyetisyenler.map((diyetisyen: any, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    className="py-3 px-4 rounded-xl bg-purple-50 border border-purple-100 flex-row justify-between items-center"
                    onPress={() => diyetisyenSec(diyetisyen)}
                  >
                    <Text className="text-purple-800 font-bold">Dr. {diyetisyen.fullname || diyetisyen.email}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9333ea" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text className="text-slate-500 italic text-sm">Sistemde henüz kayıtlı diyetisyen bulunmuyor.</Text>
            )}
          </View>
        )}

        {/* KAMERA AKSİYON KARTI (Diyetisyen ekranındaki yatay kart stili) */}
        <TouchableOpacity activeOpacity={0.8} onPress={selectImageSource}>
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' }} 
            className="w-full h-32 rounded-3xl overflow-hidden mb-6"
            imageStyle={{ opacity: 0.9 }}
          >
            <View className="flex-1 bg-black/40 p-5 justify-end flex-row items-end gap-2">
              <Text className="text-white text-xl font-bold flex-1">
                {image ? "Farklı Bir Fotoğraf Çek" : "Bugün ne yedin? Fotoğraf Çek"}
              </Text>
              <Ionicons name={image ? "images" : "camera"} size={26} color="#fff" />
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* SEÇİLEN FOTOĞRAF VE ANALİZ */}
        {image && (
          <View className="mb-6">
            <View className="w-full h-64 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 mb-4">
              <Image source={{ uri: image }} className="w-full h-full" />
            </View>

            {!sonuc && (
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-4 rounded-2xl border border-slate-200 bg-white items-center justify-center active:bg-slate-50" 
                  onPress={() => {
                    setImage(null);
                    setSonuc(null);
                    setOnaylandi(false);
                    setGeriBildirim(null);
                  }}
                  disabled={loading}
                >
                  <Text className="text-slate-600 font-bold text-base">Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className={`flex-[2] py-4 rounded-2xl items-center justify-center active:opacity-80 ${loading ? 'bg-slate-400' : 'bg-emerald-600'}`} 
                  onPress={analyzeImage}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View className="flex-row items-center">
                      <Text className="text-white text-base font-bold mr-2">Analizi Başlat</Text>
                      <Ionicons name="sparkles" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ADIM 1: TAHMİN VE ONAY KARTI */}
        {sonuc && !onaylandi && (
          <View className="bg-white p-6 rounded-3xl border border-slate-200 mb-6 border-l-4 border-l-blue-500">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider">Yapay Zeka Tahmini</Text>
              <Ionicons name="sparkles" size={18} color="#3b82f6" />
            </View>
            <Text className="text-lg font-semibold text-slate-800 leading-relaxed">
              Fotoğrafta <Text className="text-blue-500">{Array.from(new Set(sonuc.map(s => s.yemek_adi))).join(' + ')}</Text> görüyorum.
            </Text>

            {/* Besin Değerleri Kartları (Toplam Değerler) */}
            <View className="flex-row gap-2 mt-4">
              <View className="flex-1 bg-red-50 p-3 rounded-2xl items-center border border-red-100">
                <Ionicons name="flame" size={18} color="#ef4444" />
                <Text className="text-red-600 text-lg font-bold mt-1">{getTotals().kalori}</Text>
                <Text className="text-red-400 text-xs font-medium">kcal</Text>
              </View>
              <View className="flex-1 bg-indigo-50 p-3 rounded-2xl items-center border border-indigo-100">
                <Ionicons name="fitness" size={18} color="#6366f1" />
                <Text className="text-indigo-600 text-lg font-bold mt-1">{getTotals().protein || 0}g</Text>
                <Text className="text-indigo-400 text-xs font-medium">Protein</Text>
              </View>
              <View className="flex-1 bg-amber-50 p-3 rounded-2xl items-center border border-amber-100">
                <Ionicons name="water" size={18} color="#f59e0b" />
                <Text className="text-amber-600 text-lg font-bold mt-1">{getTotals().yag || 0}g</Text>
                <Text className="text-amber-400 text-xs font-medium">Yağ</Text>
              </View>
              <View className="flex-1 bg-emerald-50 p-3 rounded-2xl items-center border border-emerald-100">
                <Ionicons name="leaf" size={18} color="#10b981" />
                <Text className="text-emerald-600 text-lg font-bold mt-1">{getTotals().karbonhidrat || 0}g</Text>
                <Text className="text-emerald-400 text-xs font-medium">Karb</Text>
              </View>
            </View>

            {/* Tek tek yemek detayları listesi */}
            <View className="mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tespit Edilen Yemekler</Text>
              {sonuc.map((yemek, idx) => (
                <View key={idx} className="flex-row justify-between items-center py-2 border-b border-slate-200/50 last:border-b-0">
                  <View className="flex-1 mr-2">
                    <Text className="text-slate-800 font-semibold text-sm">{yemek.yemek_adi}</Text>
                    <Text className="text-slate-400 text-[11px] mt-0.5">
                      P: {yemek.protein || 0}g • Y: {yemek.yag || 0}g • K: {yemek.karbonhidrat || 0}g
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-red-500 font-bold text-sm">🔥 {yemek.kalori} kcal</Text>
                    <TouchableOpacity onPress={() => removeFoodFromPrediction(idx)}>
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Manuel Yemek Ekleme Bölümü */}
            <View className="mt-4 pt-4 border-t border-slate-100">
              {showManualAddList ? (
                <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="font-bold text-slate-700 text-sm">Eksik Yemeği Arayıp Ekle</Text>
                    <TouchableOpacity onPress={() => setShowManualAddList(false)}>
                      <Ionicons name="close" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <TextInput 
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm mb-3"
                    placeholder="Yemek ara... (örn: Köfte)"
                    value={manualSearchQuery}
                    onChangeText={setManualSearchQuery}
                  />
                  <ScrollView className="max-h-40" nestedScrollEnabled={true}>
                    {getFilteredFoods().map(([key, val]: any) => (
                      <TouchableOpacity 
                        key={key}
                        className="py-2.5 px-3 mb-1.5 bg-white border border-slate-100 rounded-xl flex-row justify-between items-center active:bg-slate-100"
                        onPress={() => addManualFood(key, val)}
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-slate-800 font-semibold text-xs">{val.yemek_adi}</Text>
                          <Text className="text-slate-400 text-[10px] mt-0.5">
                            P: {val.protein}g • Y: {val.yag}g • K: {val.karbonhidrat}g
                          </Text>
                        </View>
                        <Text className="text-red-500 font-bold text-xs">🔥 {val.kalori} kcal</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <TouchableOpacity 
                  className="flex-row items-center justify-center py-2.5 bg-slate-50 border border-slate-200 border-dashed rounded-xl active:bg-slate-100"
                  onPress={() => setShowManualAddList(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#475569" className="mr-2" />
                  <Text className="text-slate-600 font-bold text-xs">Eksik Yemek Ekle</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-base font-bold text-slate-800 mt-5 mb-4 text-center">Bu tahmini onaylıyor musunuz?</Text>
            
            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl border border-rose-500 items-center justify-center active:bg-rose-50" 
                onPress={() => setSonuc(null)}
              >
                <Text className="text-rose-500 font-bold">Hayır, Tekrar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl bg-blue-500 items-center justify-center active:opacity-80" 
                onPress={handleOnay} 
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Evet, Onaylıyorum</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ADIM 2: ANLIK GERİ BİLDİRİM KARTI (AI KOÇ) */}
        {onaylandi && geriBildirim && (
          <View className={`p-6 rounded-3xl mb-6 border-l-4 ${getTotals().kalori > 400 ? 'bg-amber-50 border-amber-400' : 'bg-emerald-50 border-emerald-500'}`}>
            <View className="flex-row items-center mb-3 gap-2">
              <Ionicons name={getTotals().kalori > 400 ? "alert-circle" : "checkmark-circle"} size={24} color={getTotals().kalori > 400 ? "#f59e0b" : "#10b981"} />
              <Text className="text-lg font-bold text-slate-800">AI Koç Geri Bildirimi</Text>
            </View>
            <Text className="text-base text-slate-700 leading-relaxed">{geriBildirim}</Text>
            <Text className="mt-4 text-xs text-slate-400 italic pt-3 border-t border-slate-200/50">
              Bu kayıt diyetisyeninize başarıyla iletildi!
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setSonuc(null); 
                setImage(null);
                setOnaylandi(false);
                setGeriBildirim(null);
              }}
            className="mt-6 bg-gray-100 py-4 rounded-2xl flex-row items-center justify-center border border-gray-200 active:bg-gray-200"
            >
              <Ionicons name="arrow-back-outline" size={22} color="#4b5563" />
              <Text className="text-gray-600 font-bold text-base ml-2">Ana Sayfaya Dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FOTOĞRAF ÇEKİLMEDİYSE GÜNLÜK ÖZETİ GÖSTER */}
        {!image && !sonuc && (
          <>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-800">Günlük Özetin</Text>
              <Ionicons name="bar-chart" size={20} color="#64748b" />
            </View>

            {/* VÜCUT BİLGİLERİ EKSİKSE GÖSTER */}
            {!ozet.kilo && (
              <View className="bg-white p-6 rounded-3xl border border-slate-200 mb-6 border-l-4 border-l-blue-500 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="body" size={24} color="#3b82f6" />
                  <Text className="text-lg font-bold text-slate-800 ml-2">Seni Daha İyi Tanıyalım</Text>
                </View>
                <Text className="text-slate-600 mb-4">
                  Günlük su ihtiyacını sana özel (kilona göre) hesaplayabilmemiz için boy ve kilo bilgilerine ihtiyacımız var.
                </Text>
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1 ml-1">BOY (cm)</Text>
                    <TextInput 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                      placeholder="170"
                      keyboardType="numeric"
                      value={boyInput}
                      onChangeText={setBoyInput}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1 ml-1">KİLO (kg)</Text>
                    <TextInput 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                      placeholder="65"
                      keyboardType="numeric"
                      value={kiloInput}
                      onChangeText={setKiloInput}
                    />
                  </View>
                </View>
                <TouchableOpacity 
                  className="bg-blue-500 py-3 rounded-xl items-center active:bg-blue-600"
                  onPress={profilKaydet}
                >
                  <Text className="text-white font-bold">Kaydet ve Hedeflerimi Belirle</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 border-b-4 border-b-rose-500">
                <Text className="text-slate-500 text-xs font-bold uppercase mb-1">Alınan Kalori</Text>
                <Text className="text-2xl font-extrabold text-slate-800">{ozet.bugun_kalori} <Text className="text-sm font-medium text-slate-400">/ {ozet.hedef_kalori}</Text></Text>
              </View>
              <TouchableOpacity className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 border-b-4 border-b-blue-500" onPress={suEkle} activeOpacity={0.7}>
                <View className="flex-row justify-between items-start">
                  <Text className="text-slate-500 text-xs font-bold uppercase mb-1">Su Tüketimi</Text>
                  <Ionicons name="add-circle" size={20} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-extrabold text-slate-800">{ozet.bugun_su.toFixed(2)}L <Text className="text-sm font-medium text-slate-400">/ {ozet.hedef_su}L</Text></Text>
              </TouchableOpacity>
            </View>

            {/* Motivasyon Alert Kartı */}
            {ozet.hedef_su - ozet.bugun_su > 0 ? (
              <View className="p-5 rounded-2xl mb-6 bg-blue-500 border border-blue-600">
                <Text className="text-white text-sm font-semibold leading-relaxed">
                  {ozet.kilo ? `Kilona (${ozet.kilo} kg) göre günlük içmen gereken ${ozet.hedef_su} litre suyun ` : "Günlük su hedefine ulaşmana "}
                  sadece {(ozet.hedef_su - ozet.bugun_su).toFixed(1)} litre kaldı. Su içmek için sağdaki mavi butona basabilirsin! 💧
                </Text>
              </View>
            ) : (
              <View className="p-5 rounded-2xl mb-6 bg-emerald-500 border border-emerald-600">
                <Text className="text-white text-sm font-semibold leading-relaxed">
                  Tebrikler! Bugünkü {ozet.hedef_su} litrelik su hedefine ulaştın. Vücudun sana teşekkür ediyor. 💧
                </Text>
              </View>
            )}

            {/* Bugün Yediklerim */}
            <View className="flex-row justify-between items-center mb-4 mt-2">
              <Text className="text-xl font-bold text-slate-800">Bugün Yediklerim</Text>
            </View>

            {ozet.bugun_yemekler && ozet.bugun_yemekler.length > 0 ? (
              ozet.bugun_yemekler.map((yemek: any, idx) => (
                <View key={`bugun-${idx}`} className="bg-white p-4 rounded-2xl mb-3 border-l-4 border-blue-500 border-y border-r border-slate-100 shadow-sm">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-base font-bold text-slate-800">{yemek.yemek_adi}</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-slate-400">{yemek.saat}</Text>
                      {yemek.id && (
                        <TouchableOpacity onPress={() => deleteRecordedMeal(yemek.id)}>
                          <Ionicons name="trash-outline" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text className="text-sm font-bold text-red-500 mt-1">🔥 {yemek.kalori} kcal</Text>
                  <View className="flex-row gap-3 mt-2">
                    <View className="flex-1">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-indigo-500 font-semibold">Protein</Text>
                        <Text className="text-xs text-indigo-400 font-bold">{yemek.protein || 0}g</Text>
                      </View>
                      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(((yemek.protein || 0) / 50) * 100, 100)}%` }} />
                      </View>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-amber-500 font-semibold">Yağ</Text>
                        <Text className="text-xs text-amber-400 font-bold">{yemek.yag || 0}g</Text>
                      </View>
                      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <View className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(((yemek.yag || 0) / 40) * 100, 100)}%` }} />
                      </View>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-emerald-500 font-semibold">Karb</Text>
                        <Text className="text-xs text-emerald-400 font-bold">{yemek.karbonhidrat || 0}g</Text>
                      </View>
                      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(((yemek.karbonhidrat || 0) / 60) * 100, 100)}%` }} />
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-slate-500 text-center italic mt-2 mb-6">Bugün için henüz bir öğün girmediniz. Yukarıdan fotoğraf çekebilirsiniz!</Text>
            )}

            {/* Geçmiş Öğünler */}
            <View className="flex-row justify-between items-center mb-4 mt-2">
              <Text className="text-xl font-bold text-slate-800">Dün Neler Yedin?</Text>
            </View>

            {ozet.dun_yemekler.length > 0 ? (
              ozet.dun_yemekler.map((yemek: any, idx) => (
                <View key={idx} className="bg-white p-4 rounded-2xl mb-3 border-l-4 border-slate-300 border-y border-r border-slate-100">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-base font-bold text-slate-800">Öğün</Text>
                    <Text className="text-xs text-slate-400 mt-1">{yemek.saat}</Text>
                  </View>
                  <Text className="text-lg font-semibold text-slate-700 my-1">{yemek.yemek_adi}</Text>
                  <Text className="text-sm font-bold text-slate-500 mt-1">🔥 {yemek.kalori} kcal</Text>
                </View>
              ))
            ) : (
              <Text className="text-slate-500 text-center italic mt-2 mb-4">Dün için bir öğün kaydı bulunamadı.</Text>
            )}
          </>
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}