import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Mesajlar() {
  const mesajlar = [
    {
      id: 1,
      gonderen: "Dr. Diyetisyen",
      mesaj: "Merhaba! Son 3 gündür su ve protein hedefine mükemmel şekilde ulaştığını görüyorum. Harika gidiyorsun, aynen böyle devam et! 💧💪",
      tarih: "Bugün, 10:30",
      tip: "basari" 
    },
    {
      id: 2,
      gonderen: "Sistem (AI Koç)",
      mesaj: "Diyetisyeniniz haftalık hedeflerinizi güncelledi. Menünüzdeki karbonhidrat oranı %10 azaltıldı.",
      tarih: "Dün, 14:15",
      tip: "bilgi"
    },
    {
      id: 3,
      gonderen: "Dr. Diyetisyen",
      mesaj: "Dünkü akşam yemeği fotoğrafında porsiyonların biraz büyüdüğünü fark ettim. Bugün akşam daha hafif, zeytinyağlı bir sebze yemeği tercih edebilir misin?",
      tarih: "18 Nisan, 09:00",
      tip: "uyari"
    }
  ];

  // Modern ve Renkli Tasarım İçin Dinamik Stil Fonksiyonu
  const getCardStyle = (tip: string) => {
    switch(tip) {
      case 'basari': 
        return { 
          bg: 'bg-emerald-50', border: 'border-emerald-400', 
          iconBg: 'bg-emerald-200', iconColor: '#059669', icon: 'leaf' 
        };
      case 'uyari': 
        return { 
          bg: 'bg-rose-50', border: 'border-rose-400', 
          iconBg: 'bg-rose-200', iconColor: '#e11d48', icon: 'warning' 
        };
      default: 
        return { 
          bg: 'bg-indigo-50', border: 'border-indigo-400', 
          iconBg: 'bg-indigo-200', iconColor: '#4f46e5', icon: 'sparkles' 
        };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FB]">
      
      {/* Üst Kısım (Header) - Altı hafif yuvarlatılmış modern görünüm */}
      <View className="px-6 pt-6 pb-5 bg-white rounded-b-[30px] shadow-sm z-10">
        <Text className="text-3xl font-extrabold text-gray-800 tracking-tight">Gelen Kutusu</Text>
        <Text className="text-base text-gray-500 mt-1 font-medium">Motivasyon ve Tavsiyeler</Text>
      </View>

      {/* Mesaj Listesi */}
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 40, paddingTop: 25 }} 
        showsVerticalScrollIndicator={false}
      >
        {mesajlar.map((msg) => {
          const style = getCardStyle(msg.tip);
          return (
            <TouchableOpacity 
              key={msg.id} 
              activeOpacity={0.8}
              // flex-row ile yan yana dizilim, border-l-4 ile sol tarafa kalın renkli vurgu çizgisi
              className={`flex-row p-4 mb-4 rounded-2xl border-l-[5px] shadow-sm ${style.bg} ${style.border}`}
            >
              
              {/* İkon Kutusu */}
              <View className={`w-12 h-12 rounded-2xl justify-center items-center mr-4 ${style.iconBg}`}>
                <Ionicons name={style.icon as any} size={24} color={style.iconColor} />
              </View>
              
              {/* Metin Kutusu (flex-1 hayat kurtarır, metnin taşmasını engeller!) */}
              <View className="flex-1 justify-center">
                
                {/* Gönderen ve Tarih Satırı */}
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-base font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                    {msg.gonderen}
                  </Text>
                  <Text className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    {msg.tarih}
                  </Text>
                </View>

                {/* Mesaj İçeriği */}
                <Text className="text-sm text-gray-700 leading-[22px]">
                  {msg.mesaj}
                </Text>

              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

    </SafeAreaView>
  );
}