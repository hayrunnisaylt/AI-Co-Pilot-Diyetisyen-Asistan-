import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HastaHome() {
  const [hastaAdi, setHastaAdi] = useState('Danışan');
  const [hastaEmail, setHastaEmail] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [sonuc, setSonuc] = useState<any>(null);
  const [onaylandi, setOnaylandi] = useState(false);
  const [geriBildirim, setGeriBildirim] = useState<string | null>(null);

  const [diyetisyenler, setDiyetisyenler] = useState<string[]>([]);
  const [seciliDiyetisyen, setSeciliDiyetisyen] = useState<string | null>(null);
  const [bekleyenDiyetisyen, setBekleyenDiyetisyen] = useState<string | null>(null);
  const [showDiyetisyenSecimi, setShowDiyetisyenSecimi] = useState(false);

  const [ozet, setOzet] = useState({
    bugun_kalori: 0,
    hedef_kalori: 2000,
    bugun_su: 0.0,
    hedef_su: 2.5,
    dun_yemekler: [],
    boy: null,
    kilo: null
  });

  const [boyInput, setBoyInput] = useState('');
  const [kiloInput, setKiloInput] = useState('');

  const router = useRouter();

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
    init();
  }, []);

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
        setSonuc(response.data.sonuc[0]);
      } else {
        Alert.alert("Bilgi", "Yemek tam olarak tanımlanamadı.");
      }
    } catch (error) {
      Alert.alert("Hata", "Sunucuyla bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnay = () => {
    setIsSaving(true);
    
    setTimeout(async () => {
      let mesaj = "";
      if (sonuc.kalori > 400) {
        mesaj = `Bu öğün (${sonuc.yemek_adi}), diyetisyeninizin belirlediği hedeflerle biraz çelişiyor. Bir dahaki sefere daha hafif bir alternatif tercih etmeye ne dersiniz?`;
      } else {
        mesaj = `Harika seçim! Bu öğün (${sonuc.yemek_adi}), günlük hedeflerinize ulaşmanıza çok yardımcı olacak. Aynen böyle devam!`;
      }

      setGeriBildirim(mesaj);
      setOnaylandi(true);
      setIsSaving(false);
      await gunlukOzetiGetir(hastaEmail);
    }, 1500);
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
        <TouchableOpacity activeOpacity={0.8} onPress={pickImage}>
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
              <TouchableOpacity 
                className={`py-4 rounded-2xl items-center active:opacity-80 ${loading ? 'bg-slate-400' : 'bg-emerald-600'}`} 
                onPress={analyzeImage}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base font-bold mr-2">Yapay Zeka Analizi Başlat</Text>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
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
              Fotoğrafta <Text className="text-blue-500">{sonuc.yemek_adi}</Text> (Tahmini {sonuc.kalori} kcal) görüyorum.
            </Text>
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
          <View className={`p-6 rounded-3xl mb-6 border-l-4 ${sonuc.kalori > 400 ? 'bg-amber-50 border-amber-400' : 'bg-emerald-50 border-emerald-500'}`}>
            <View className="flex-row items-center mb-3 gap-2">
              <Ionicons name={sonuc.kalori > 400 ? "alert-circle" : "checkmark-circle"} size={24} color={sonuc.kalori > 400 ? "#f59e0b" : "#10b981"} />
              <Text className="text-lg font-bold text-slate-800">AI Koç Geri Bildirimi</Text>
            </View>
            <Text className="text-base text-slate-700 leading-relaxed">{geriBildirim}</Text>
            <Text className="mt-4 text-xs text-slate-400 italic pt-3 border-t border-slate-200/50">
              Bu kayıt diyetisyeninize başarıyla iletildi!
            </Text>
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