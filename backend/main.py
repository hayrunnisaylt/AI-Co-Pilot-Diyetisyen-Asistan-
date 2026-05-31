import os
import shutil
import urllib.request
import urllib.error
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from pymongo import MongoClient

# Python 3.12+ compatibility fix for passlib
import configparser
configparser.SafeConfigParser = configparser.ConfigParser

# pyrefly: ignore [missing-import]
import bcrypt
# pyrefly: ignore [missing-import]
from pyngrok import ngrok
# pyrefly: ignore [missing-import]
import uvicorn
# pyrefly: ignore [missing-import]
from ultralytics import YOLO
import io
# pyrefly: ignore [missing-import]
from PIL import Image

# --- DYNAMIC ENVIRONMENT VARIABLE LOADER (Zero-dependency) ---
def load_env(env_path: str = "../.env"):
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        os.environ[key] = val
            print("🌱 .env dosyası başarıyla yüklendi!")
        except Exception as e:
            print("⚠️ .env yüklenirken hata oluştu:", e)

# Load environment variables
load_env()

NGROK_TOKEN = os.getenv("NGROK_TOKEN", "").strip()
MONGO_URI = os.getenv("MONGO_URI", "").strip()


app = FastAPI()

# --- 1. CORS AYARLARI ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. MONGODB ATLAS BAĞLANTISI ---
try:
    client = MongoClient(MONGO_URI)
    db = client["diyet_app"]
    users_collection = db["users"]
    yemekler_collection = db["yemekler"]
    nutrition_collection = db["nutrition_data"]
    print("✅ MongoDB Atlas'a başarıyla bağlanıldı!")
except Exception as e:
    print("❌ Bağlantı hatası:", e)

# --- 3. ŞİFRE GÜVENLİĞİ (HASHING) ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

# --- 4. VERİ MODELLERİ (PYDANTIC) ---
class UserRegister(BaseModel):
    fullname: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    mesaj: str
    hasta_email: str

# Besin Değerleri Cetveli (kalori, protein, yag, karbonhidrat)
BESIN_CETVELI = {
    "french_fries": {
        "yemek_adi": "Patates Kızartması",
        "kalori": 312,
        "protein": 3.4,
        "yag": 15.0,
        "karbonhidrat": 41.0
    },
    "kebab": {
        "yemek_adi": "Kebap",
        "kalori": 350,
        "protein": 25.0,
        "yag": 22.0,
        "karbonhidrat": 8.0
    },
    "bulgur_pilavi": {
        "yemek_adi": "Bulgur Pilavı",
        "kalori": 215,
        "protein": 6.0,
        "yag": 5.0,
        "karbonhidrat": 38.0
    },
    "fried_fish": {
        "yemek_adi": "Kızarmış Balık",
        "kalori": 290,
        "protein": 22.0,
        "yag": 16.0,
        "karbonhidrat": 12.0
    },
    "gozleme": {
        "yemek_adi": "Gözleme",
        "kalori": 410,
        "protein": 12.0,
        "yag": 14.0,
        "karbonhidrat": 58.0
    },
    "hamburger": {
        "yemek_adi": "Hamburger",
        "kalori": 300,
        "protein": 17.0,
        "yag": 14.0,
        "karbonhidrat": 28.0
    },
    "iskender": {
        "yemek_adi": "İskender",
        "kalori": 750,
        "protein": 38.0,
        "yag": 45.0,
        "karbonhidrat": 48.0
    },
    "karniyarik": {
        "yemek_adi": "Karnıyarık",
        "kalori": 270,
        "protein": 12.0,
        "yag": 18.0,
        "karbonhidrat": 15.0
    },
    "kisir": {
        "yemek_adi": "Kısır",
        "kalori": 180,
        "protein": 4.0,
        "yag": 7.0,
        "karbonhidrat": 26.0
    },
    "kofte": {
        "yemek_adi": "Köfte",
        "kalori": 280,
        "protein": 20.0,
        "yag": 18.0,
        "karbonhidrat": 10.0
    },
    "kumpir": {
        "yemek_adi": "Kumpir",
        "kalori": 550,
        "protein": 15.0,
        "yag": 22.0,
        "karbonhidrat": 75.0
    },
    "kunefe": {
        "yemek_adi": "Künefe",
        "kalori": 480,
        "protein": 8.0,
        "yag": 20.0,
        "karbonhidrat": 68.0
    },
    "kuru_fasulye": {
        "yemek_adi": "Kuru Fasulye",
        "kalori": 290,
        "protein": 14.0,
        "yag": 8.0,
        "karbonhidrat": 40.0
    },
    "lahmacun": {
        "yemek_adi": "Lahmacun",
        "kalori": 240,
        "protein": 10.0,
        "yag": 8.0,
        "karbonhidrat": 32.0
    },
    "menemen": {
        "yemek_adi": "Menemen",
        "kalori": 190,
        "protein": 11.0,
        "yag": 13.0,
        "karbonhidrat": 8.0
    },
    "mihlama": {
        "yemek_adi": "Mıhlama",
        "kalori": 450,
        "protein": 12.0,
        "yag": 38.0,
        "karbonhidrat": 15.0
    },
    "pide": {
        "yemek_adi": "Pide",
        "kalori": 460,
        "protein": 18.0,
        "yag": 16.0,
        "karbonhidrat": 60.0
    },
    "pirinc_pilav": {
        "yemek_adi": "Pirinç Pilavı",
        "kalori": 270,
        "protein": 4.0,
        "yag": 8.0,
        "karbonhidrat": 45.0
    },
    "pizza": {
        "yemek_adi": "Pizza",
        "kalori": 250,
        "protein": 11.0,
        "yag": 10.0,
        "karbonhidrat": 30.0
    },
    "sekerpare": {
        "yemek_adi": "Şekerpare",
        "kalori": 320,
        "protein": 4.0,
        "yag": 12.0,
        "karbonhidrat": 50.0
    },
    "tulumba_tatlisi": {
        "yemek_adi": "Tulumba Tatlısı",
        "kalori": 280,
        "protein": 3.0,
        "yag": 10.0,
        "karbonhidrat": 45.0
    },
    "yaprak_sarma": {
        "yemek_adi": "Yaprak Sarma",
        "kalori": 170,
        "protein": 3.0,
        "yag": 8.0,
        "karbonhidrat": 22.0
    },
    "manti": {
        "yemek_adi": "Mantı",
        "kalori": 320,
        "protein": 10.0,
        "yag": 12.0,
        "karbonhidrat": 50.0
    },
    "salad": {
        "yemek_adi": "Salata",
        "kalori": 100,
        "protein": 3.0,
        "yag": 5.0,
        "karbonhidrat": 10.0
    },
    "unknown": {
        "yemek_adi": "Tanımlanamadı",
        "kalori": 0,
        "protein": 0.0,
        "yag": 0.0,
        "karbonhidrat": 0.0
    }
}

# Geriye dönük uyumluluk ve arama kolaylığı için yardımcı fonksiyonlar
def get_besin(yemek_adi):
    if not yemek_adi:
        return BESIN_CETVELI["unknown"]
    
    # Harf büyüklüklerini ve boşluk/alt çizgileri normalize et
    key = yemek_adi.lower().strip().replace(" ", "_")
    if key in BESIN_CETVELI:
        return BESIN_CETVELI[key]
    
    # Alt çizgisiz düz karşılaştırma denemesi
    normalized_key = key.replace("_", "")
    for k, v in BESIN_CETVELI.items():
        if k.replace("_", "") == normalized_key:
            return v
            
    return BESIN_CETVELI["unknown"]

def get_kalori(yemek_adi):
    return get_besin(yemek_adi)["kalori"]

# --- CLINICAL DIETETICS EXPERT SYSTEM ENGINE ---
class DieteticsExpertSystem:
    @staticmethod
    def calculate_vki(boy: float, kilo: float) -> tuple[float, str, str]:
        """VKİ ve kilo kategorisi hesaplar."""
        vki = kilo / ((boy / 100) ** 2)
        vki = round(vki, 1)
        if vki < 18.5:
            return vki, "Zayıf", "Mavi"
        elif vki < 25:
            return vki, "Normal Kilolu", "Yeşil"
        elif vki < 30:
            return vki, "Fazla Kilolu", "Turuncu"
        else:
            return vki, "Obez", "Kırmızı"

    @staticmethod
    def calculate_ideal_weight(boy: float) -> tuple[float, float]:
        """Boy bazlı ideal kilo aralığı (VKI 18.5 - 24.9)."""
        min_ideal = round(18.5 * ((boy / 100) ** 2), 1)
        max_ideal = round(24.9 * ((boy / 100) ** 2), 1)
        return min_ideal, max_ideal

    @staticmethod
    def calculate_tdee(boy: float, kilo: float, vki_status: str) -> int:
        """Klinik kalori bütçesi (BMR ve aktivite çarpımlı)."""
        # Standart BMR: Mifflin-St Jeor (Basitleştirilmiş nötr)
        bmr = 10 * kilo + 6.25 * boy - 5 * 25 # Varsayılan yaş: 25
        tdee = int(bmr * 1.3) # Hafif aktif çarpanı
        
        # Kilo yönetimi için kalori açığı veya fazlası
        if vki_status == "Obez" or vki_status == "Fazla Kilolu":
            return max(1500, tdee - 500) # Kilo verme bütçesi (minimum 1500 kcal)
        elif vki_status == "Zayıf":
            return tdee + 300 # Sağlıklı kilo alma bütçesi
        return tdee # Kiloyu koruma bütçesi

    @classmethod
    def analyze_patient(cls, data: dict) -> list[dict]:
        """
        Hastanın tüm verilerini alıp, diyetisyene yol gösterecek zengin,
        formatlı ve klinik diyetetik analiz kartları (insights) üretir.
        """
        fullname = data.get("fullname", "Danışan")
        boy = data.get("boy")
        kilo = data.get("kilo")
        bugun_kalori = data.get("bugun_toplam_kalori", 0)
        bugun_protein = data.get("bugun_protein", 0)
        bugun_yag = data.get("bugun_yag", 0)
        bugun_karb = data.get("bugun_karbonhidrat", 0)
        bugun_ogun = data.get("bugun_ogun_sayisi", 0)
        dun_kalori = data.get("dun_toplam_kalori", 0)
        su_bugun = data.get("bugun_su_tuketimi_l", 0.0)
        hedef_su = data.get("hedef_su_l", 2.5)
        kayitli_yemekler = data.get("kayitli_yemekler", [])

        insights = []

        # 1. BOY VE KİLO VARSA DETAYLI VKI VE TIBBİ ANALİZLER
        if boy and kilo:
            try:
                boy_f = float(boy)
                kilo_f = float(kilo)
                vki, durum, renk = cls.calculate_vki(boy_f, kilo_f)
                min_w, max_w = cls.calculate_ideal_weight(boy_f)
                tdee = cls.calculate_tdee(boy_f, kilo_f, durum)

                # VKİ Kartı
                if durum == "Zayıf":
                    insights.append({
                        "tip": "dikkat", "ikon": "alert-circle", "renk": "indigo",
                        "baslik": f"ℹ️ {fullname} - Düşük VKİ ({vki})",
                        "mesaj": f"Danışanın kilosu boyuna göre zayıf sınırda. Kas kütlesini artırarak sağlıklı ideal aralığa ({min_w}-{max_w} kg) yükselmesi için hiperkalorik beslenme planlanmalı."
                    })
                elif durum == "Normal Kilolu":
                    insights.append({
                        "tip": "basari", "ikon": "checkmark-circle", "renk": "emerald",
                        "baslik": f"✅ {fullname} - İdeal VKİ ({vki})",
                        "mesaj": f"Danışanın vücut kütle indeksi ideal aralıkta. Mevcut formunu koruması ve makro besin dengesini sürdürmesi teşvik edilebilir."
                    })
                elif durum == "Fazla Kilolu":
                    insights.append({
                        "tip": "dikkat", "ikon": "trending-up", "renk": "amber",
                        "baslik": f"⚡ {fullname} - Fazla Kilolu VKİ ({vki})",
                        "mesaj": f"Danışanın ağırlığı idealin üzerinde. Hedef ağırlığı olan {max_w} kg sınırına inmesi için hafif kalori açığı (günlük hedef: {tdee} kcal) ve egzersiz planı önerilir."
                    })
                elif durum == "Obez":
                    insights.append({
                        "tip": "uyari", "ikon": "warning", "renk": "rose",
                        "baslik": f"⚠️ {fullname} - Obezite Sınırı VKİ ({vki})",
                        "mesaj": f"Tıbbi değerlendirme: Danışanın kilosu sağlık riski oluşturabilecek obez sınırda. İdeal kiloya ({min_w}-{max_w} kg) kademeli geçiş için hipokalorik ({tdee} kcal) beslenme planı düşünlebilir."
                    })
            except Exception as e:
                print("VKİ analizi sırasında hata:", e)

        # 2. ÖĞÜN VE KALORİ ANALİZLERİ
        if bugun_ogun > 0:
            # Hedef kalori kontrolü (boy/kilo varsa dinamik tdee, yoksa 2000)
            target = 2000
            if boy and kilo:
                try:
                    target = cls.calculate_tdee(float(boy), float(kilo), cls.calculate_vki(float(boy), float(kilo))[1])
                except Exception:
                    pass

            if bugun_kalori > target:
                insights.append({
                    "tip": "uyari", "ikon": "flame", "renk": "rose",
                    "baslik": f"🔥 {fullname} - Kalori Aşımı",
                    "mesaj": f"Bugün şu ana kadar {bugun_kalori} kcal aldı ve belirlenen dinamik limiti ({target} kcal) aştı. Sonraki öğünlerde sebze ağırlıklı veya hafif geçişler önerin."
                })
            elif bugun_kalori > target * 0.8:
                insights.append({
                    "tip": "dikkat", "ikon": "alert-circle", "renk": "amber",
                    "baslik": f"⚡ {fullname} - Kalori Sınırda",
                    "mesaj": f"Günlük kalori alımı ({bugun_kalori} kcal) hedefe ({target} kcal) çok yakın. Akşam saatlerinde porsiyon kontrolü yapması hatırlatılabilir."
                })
            else:
                insights.append({
                    "tip": "basari", "ikon": "checkmark-circle", "renk": "emerald",
                    "baslik": f"✅ {fullname} - Dengeli Kalori",
                    "mesaj": f"Bugün alınan kalori ({bugun_kalori} kcal) gayet dengeli seyrediyor. Günlük hedefin ({target} kcal) altında kalınarak yağ yakımı destekleniyor."
                })

        # 3. MAKRO BESİN DENGESİ ANALİZLERİ (PROTEİN, YAĞ, KARBONHİDRAT)
        if bugun_ogun >= 1:
            # Kas kütlesi için protein gereksinimi (kilo * 1.5g)
            ideal_p = 60 # varsayılan
            if kilo:
                try:
                    ideal_p = round(float(kilo) * 1.5)
                except Exception:
                    pass

            if bugun_protein < ideal_p * 0.5:
                insights.append({
                    "tip": "oneri", "ikon": "fitness", "renk": "indigo",
                    "baslik": f"💪 {fullname} - Yetersiz Protein",
                    "mesaj": f"Kas kaybını önlemek için protein alımı ({bugun_protein}g) artırılmalı (ideal hedef: {ideal_p}g). Öğünlerine lor peyniri veya 150g tavuk eti eklemesi önerilebilir."
                })
            
            if bugun_yag > 70:
                insights.append({
                    "tip": "uyari", "ikon": "alert-circle", "renk": "rose",
                    "baslik": f"🧈 {fullname} - Aşırı Yağ Tüketimi",
                    "mesaj": f"Bugün alınan yağ miktarı ({bugun_yag}g) çok yüksek seviyede. Doymuş yağ ve kızartma alternatifleri yerine zeytinyağlı ve fırınlanmış pişirme yöntemlerine yönlendirin."
                })

            if bugun_karb > 220:
                insights.append({
                    "tip": "dikkat", "ikon": "alert-circle", "renk": "amber",
                    "baslik": f"🍞 {fullname} - Yüksek Karbonhidrat",
                    "mesaj": f"Günlük karbonhidrat tüketimi ({bugun_karb}g) oldukça yüksek. Kan şekerinin dengede kalması için basit şekerler yerine kompleks kaynaklar önerin."
                })

        # 4. SU TÜKETİMİ ANALİZİ
        if su_bugun > 0:
            if su_bugun < hedef_su * 0.5:
                insights.append({
                    "tip": "dikkat", "ikon": "water", "renk": "cyan",
                    "baslik": f"💧 {fullname} - Orta Seviye Dehidrasyon",
                    "mesaj": f"Su alımı ({su_bugun}L) günlük hedefin ({hedef_su}L) çok gerisinde. Böbrek sağlığı ve toksin atılımı için su bardağını yanından ayırmaması söylenmeli."
                })
            elif su_bugun >= hedef_su:
                insights.append({
                    "tip": "basari", "ikon": "checkmark-circle", "renk": "emerald",
                    "baslik": f"🎉 {fullname} - Su Hedefi Başarısı",
                    "mesaj": f"Harika su bilinci! Danışan bugün tam {su_bugun}L su tüketerek {hedef_su}L sınırını aştı. Metabolizma hızı mükemmel destekleniyor."
                })
        else:
            insights.append({
                "tip": "bilgi", "ikon": "help-circle", "renk": "indigo",
                "baslik": f"❓ {fullname} - Su Kaydı Eksik",
                "mesaj": "Bugün henüz hiç su kaydı girilmemiş. Vücudun su dengesini korumak için danışana su içmesini hatırlatın."
            })

        # 5. DİYET ÇEŞİTLİLİĞİ VE FAST-FOOD DENSİTESİ
        fast_food_counts = 0
        healthy_counts = 0
        heavy_foods = ["hamburger", "french_fries", "pizza", "kunefe", "iskender", "pide", "kebab", "lahmacun"]
        clean_foods = ["salad", "fried_fish", "kuru_fasulye", "yaprak_sarma", "menemen", "bulgur_pilavi"]

        for yemek in kayitli_yemekler:
            y_adi = yemek.get("yemek_adi", "").lower()
            if any(h in y_adi for h in heavy_foods):
                fast_food_counts += 1
            if any(c in y_adi for c in clean_foods):
                healthy_counts += 1

        if fast_food_counts >= 2:
            insights.append({
                "tip": "uyari", "ikon": "heart", "renk": "rose",
                "baslik": f"💔 {fullname} - Kardiyovasküler Yük",
                "mesaj": "Günlük öğünlerde çoklu fast-food ve doymuş yağ yoğunluğu tespit edildi. Kalp sağlığı ve damar esnekliği için bir sonraki gün tamamen arındırıcı bir plan uygulanmalı."
            })
        elif healthy_counts >= 2:
            insights.append({
                "tip": "basari", "ikon": "ribbon", "renk": "emerald",
                "baslik": f"🏆 {fullname} - Süper Temiz Beslenme",
                "mesaj": "Harika besin çeşitliliği! Öğünlerde yüksek lifli sebze, bakliyat veya sağlıklı yağ tercihleri baskın durumda. Sindirim sağlığı mükemmel."
            })

        # 6. DÜN VE BUGÜN TREND ANALİZİ
        if dun_kalori > 0 and bugun_kalori > 0:
            diff = bugun_kalori - dun_kalori
            if diff > 400:
                insights.append({
                    "tip": "dikkat", "ikon": "trending-up", "renk": "amber",
                    "baslik": f"📈 {fullname} - Kalori Artış Trendi",
                    "mesaj": f"Bugün düne göre +{diff} kcal daha fazla tüketildi. Kademeli bir artış mı yoksa kontrol dışı bir aşım mı olduğunu anlamak için öğün saatlerini inceleyin."
                })
            elif diff < -400:
                insights.append({
                    "tip": "basari", "ikon": "trending-down", "renk": "emerald",
                    "baslik": f"📉 {fullname} - Kalori Açığı Başarısı",
                    "mesaj": f"Düne göre -{abs(diff)} kcal daha az tüketildi. Başarılı bir kalori açığı sürdürülüyor, yağ yakımı desteklenecektir."
                })

        return insights

    @classmethod
    def analyze_patients(cls, hastalar_data: list) -> list:
        all_insights = []
        for patient_data in hastalar_data:
            fullname = patient_data.get("fullname", "Danışan")
            patient_insights = cls.analyze_patient(patient_data)
            
            if not patient_insights:
                continue
                
            # Filter warnings vs successes
            warnings = [ins for ins in patient_insights if ins["tip"] in ["uyari", "dikkat", "oneri"]]
            successes = [ins for ins in patient_insights if ins["tip"] == "basari"]
            
            if warnings:
                # Select the worst status (uyari > dikkat > oneri)
                worst_tip = "oneri"
                worst_color = "indigo"
                worst_icon = "fitness"
                
                if any(w["tip"] == "uyari" for w in warnings):
                    worst_tip = "uyari"
                    worst_color = "rose"
                    worst_icon = "warning"
                elif any(w["tip"] == "dikkat" for w in warnings):
                    worst_tip = "dikkat"
                    worst_color = "amber"
                    worst_icon = "alert-circle"
                
                # Combine issues
                issues = []
                for w in warnings:
                    title = w["baslik"]
                    if "-" in title:
                        issues.append(title.split("-")[-1].strip())
                    else:
                        issues.append(title)
                
                combined_msg = f"{fullname} bugün şu konularda destek gerektiriyor: {', '.join(issues)}. Detaylı klinik analiz ve diyetisyen tavsiyeleri için danışanın profiline göz atabilirsiniz."
                
                all_insights.append({
                    "tip": worst_tip,
                    "ikon": worst_icon,
                    "renk": worst_color,
                    "baslik": f"⚠️ {fullname} - Klinik Değerlendirme Gerekiyor",
                    "mesaj": combined_msg,
                    "hasta_email": patient_data.get("email", ""),
                    "hasta_fullname": fullname
                })
            elif successes:
                all_insights.append({
                    "tip": "basari",
                    "ikon": "checkmark-circle",
                    "renk": "emerald",
                    "baslik": f"✅ {fullname} - Diyet Uyum Durumu Başarılı",
                    "mesaj": f"Danışanın kalori ve su tüketimi hedefleriyle tam uyumlu seyrediyor. Tebrik mesajı gönderebilirsiniz.",
                    "hasta_email": patient_data.get("email", ""),
                    "hasta_fullname": fullname
                })
            else:
                all_insights.append({
                    "tip": "bilgi",
                    "ikon": "help-circle",
                    "renk": "slate",
                    "baslik": f"❓ {fullname} - Bugün Henüz Kayıt Yok",
                    "mesaj": "Danışan bugün henüz yemek veya su kaydı girmedi. Veri girişi yapmasını isteyebilirsiniz.",
                    "hasta_email": patient_data.get("email", ""),
                    "hasta_fullname": fullname
                })
        
        return all_insights

# --- 5. YAPAY ZEKA MODELİ YÜKLEME ---
try:
    model = YOLO("best.pt")
    print("✅ YOLO modeli yüklendi!")
except Exception as e:
    print("❌ YOLO modeli yüklenemedi:", e)
    model = None

# --- 6. API UÇ NOKTALARI (ENDPOINTS) ---

@app.post("/register")
async def register(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kullanılıyor.")
    
    hashed_password = get_password_hash(user.password)
    new_user = {
        "fullname": user.fullname,
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role
    }
    result = users_collection.insert_one(new_user)
    return {
        "status": "success", 
        "message": "Kayıt başarılı!", 
        "role": user.role,
        "user_id": str(result.inserted_id)
    }

@app.post("/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"$or": [{"email": user.email}, {"username": user.email}]})
    
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email adresi veya şifre hatalı.")
    
    return {
        "status": "success", 
        "email": db_user.get("email", db_user.get("username", "")), 
        "fullname": db_user.get("fullname", db_user.get("username", "")),
        "role": db_user.get("role", "danisan")
    }

@app.post("/tahmin-et")
async def tahmin_et(hasta_email: str = Form(...), hasta_fullname: str = Form(...), file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tespitler = []
    
    if model:
        results = model(temp_filename, conf=0.15)
        if not results[0].boxes:
            tespitler.append({
                "yemek_adi": "Tanımlanamadı", 
                "kalori": 0, 
                "protein": 0, 
                "yag": 0, 
                "karbonhidrat": 0, 
                "guven_orani": 0.0
            })
        else:
            detected_classes = set()
            for r in results:
                for box in r.boxes:
                    class_name = model.names[int(box.cls[0])].title()
                    conf = float(box.conf[0])
                    besin = get_besin(class_name)
                    yemek_turkce = besin.get("yemek_adi", class_name)
                    
                    if yemek_turkce in detected_classes:
                        continue
                    detected_classes.add(yemek_turkce)
                    
                    tespitler.append({
                        "yemek_adi": yemek_turkce,
                        "kalori": besin["kalori"],
                        "protein": besin["protein"],
                        "yag": besin["yag"],
                        "karbonhidrat": besin["karbonhidrat"],
                        "guven_orani": conf
                    })
                    
    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    return {"sonuc": tespitler}

@app.post("/analyze-food")
async def analyze_food(file: UploadFile = File(...)):
    try:
        # 1. Gelen resmi oku ve belleğe al
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # 2. YOLO modeliyle nesne tespiti yap
        results = model(image)
        
        totals = {
            "total_calories": 0,
            "total_protein": 0,
            "total_fat": 0,
            "total_carbs": 0,
            "foods": []
        }

        # 3. Modelin bulduğu her nesne için kendi veritabanından bilgi çek
        detected_classes = set()
        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id] # Örn: "lahmacun"
                
                if class_name in detected_classes:
                    continue
                detected_classes.add(class_name)
                
                # Kendi MongoDB koleksiyonun: nutrition_data
                food_data = db["nutrition_data"].find_one({"food_name": class_name})
                
                if not food_data:
                    # Fallback to local dictionary
                    local_info = get_besin(class_name)
                    food_data = {
                        "food_name": class_name,
                        "yemek_adi": local_info.get("yemek_adi", class_name),
                        "kalori": local_info.get("kalori", 0),
                        "protein": local_info.get("protein", 0),
                        "yag": local_info.get("yag", 0),
                        "karbonhidrat": local_info.get("karbonhidrat", 0)
                    }
                
                if food_data:
                    display_name = food_data.get("yemek_adi", food_data.get("food_name", class_name))
                    totals["foods"].append(display_name)
                    totals["total_calories"] += food_data.get("kalori", 0)
                    totals["total_protein"] += food_data.get("protein", 0)
                    totals["total_fat"] += food_data.get("yag", 0)
                    totals["total_carbs"] += food_data.get("karbonhidrat", food_data.get("karbs", 0))

        # 4. Sonuçları React Native'e (Frontend) paketleyip gönder
        return {
            "success": True,
            "foods": list(set(totals["foods"])), # Tekrar eden isimleri temizle
            "total_calories": round(totals["total_calories"], 1),
            "total_protein": round(totals["total_protein"], 1),
            "total_fat": round(totals["total_fat"], 1),
            "total_carbs": round(totals["total_carbs"], 1)
        }

    except Exception as e:
        print(f"❌ Analiz Hatası: {e}")
        return {"success": False, "message": "Yemek analiz edilemedi."}

@app.get("/diyetisyenler")
async def diyetisyenleri_getir():
    cursor = users_collection.find({"role": "diyetisyen"}, {"email": 1, "username": 1, "fullname": 1, "_id": 0})
    diyetisyenler = [
        {
            "email": user.get("email", user.get("username", "")), 
            "fullname": user.get("fullname", user.get("username", ""))
        } 
        for user in cursor
    ]
    return {"diyetisyenler": diyetisyenler}

@app.post("/diyetisyen-sec")
async def diyetisyen_sec(hasta_email: str = Form(...), diyetisyen_email: str = Form(...)):
    result = users_collection.update_one(
        {"email": hasta_email},
        {"$set": {"istenen_diyetisyen": diyetisyen_email, "diyetisyen_status": "beklemede"}}
    )
    if result.modified_count > 0:
        return {"status": "success", "message": "Diyetisyen isteği başarıyla gönderildi."}
    else:
        return {"status": "info", "message": "İstek gönderilemedi veya kullanıcı bulunamadı."}

@app.get("/hasta-diyetisyen")
async def hasta_diyetisyen_getir(hasta_email: str):
    user = users_collection.find_one({"$or": [{"email": hasta_email}, {"username": hasta_email}]})
    if user:
        # Resolve diyetisyen fullname
        diyetisyen_info = None
        if user.get("diyetisyen"):
            diyetisyen_info = users_collection.find_one({"$or": [{"email": user.get("diyetisyen")}, {"username": user.get("diyetisyen")}]})
        istenen_diyetisyen_info = None
        if user.get("istenen_diyetisyen"):
            istenen_diyetisyen_info = users_collection.find_one({"$or": [{"email": user.get("istenen_diyetisyen")}, {"username": user.get("istenen_diyetisyen")}]})
            
        return {
            "diyetisyen": user.get("diyetisyen"),
            "diyetisyen_fullname": diyetisyen_info.get("fullname") if diyetisyen_info else None,
            "istenen_diyetisyen": user.get("istenen_diyetisyen"),
            "istenen_diyetisyen_fullname": istenen_diyetisyen_info.get("fullname") if istenen_diyetisyen_info else None,
            "diyetisyen_status": user.get("diyetisyen_status")
        }
    return {"diyetisyen": None, "istenen_diyetisyen": None, "diyetisyen_status": None}

@app.get("/diyetisyen-istekleri")
async def istekleri_getir(diyetisyen_email: str):
    cursor = users_collection.find({"istenen_diyetisyen": diyetisyen_email, "diyetisyen_status": "beklemede"})
    istekler = [
        {
            "email": user.get("email", user.get("username", "")), 
            "fullname": user.get("fullname", user.get("username", ""))
        } 
        for user in cursor
    ]
    return {"istekler": istekler}

@app.post("/diyetisyen-istek-cevapla")
async def istek_cevapla(hasta_email: str = Form(...), durum: str = Form(...)):
    if durum == "kabul":
        user = users_collection.find_one({"email": hasta_email})
        if user and user.get("istenen_diyetisyen"):
            diyetisyen_adi = user.get("istenen_diyetisyen")
            users_collection.update_one(
                {"email": hasta_email},
                {"$set": {"diyetisyen": diyetisyen_adi, "diyetisyen_status": "onaylandi"}}
            )
            return {"status": "success", "message": "İstek kabul edildi."}
    elif durum == "red":
        users_collection.update_one(
            {"email": hasta_email},
            {"$unset": {"istenen_diyetisyen": "", "diyetisyen_status": ""}}
        )
        return {"status": "success", "message": "İstek reddedildi."}
    return {"status": "error", "message": "Geçersiz işlem."}

@app.get("/diyetisyen-hastalar")
async def diyetisyen_hastalar(diyetisyen_email: str):
    cursor = users_collection.find({"diyetisyen": diyetisyen_email, "diyetisyen_status": "onaylandi"})
    hastalar = [
        {
            "email": user.get("email", user.get("username", "")),
            "fullname": user.get("fullname", user.get("username", ""))
        }
        for user in cursor
    ]
    return {"hastalar": hastalar}

@app.post("/diyetisyen-hasta-cikar")
async def diyetisyen_hasta_cikar(hasta_email: str = Form(...)):
    users_collection.update_one(
        {"$or": [{"email": hasta_email}, {"username": hasta_email}]},
        {"$unset": {"diyetisyen": "", "diyetisyen_status": ""}}
    )
    return {"status": "success", "message": "Hasta ile ilişik kesildi."}

@app.get("/diyetisyen-verileri")
async def verileri_getir(diyetisyen_email: str = None):
    if diyetisyen_email:
        hastalar = users_collection.find({"diyetisyen": diyetisyen_email})
        hasta_emailleri = [hasta["email"] for hasta in hastalar]
        cursor = yemekler_collection.find({"hasta_email": {"$in": hasta_emailleri}}).sort("_id", -1)
    else:
        cursor = yemekler_collection.find().sort("_id", -1)
        
    veriler = []
    for row in cursor:
        row["id"] = str(row["_id"]) 
        del row["_id"]
        veriler.append(row)
        
    return {"veriler": veriler}

@app.get("/hasta-ozet")
async def hasta_ozet(hasta_email: str):
    today_str = datetime.now().strftime("%Y-%m-%d")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    user = users_collection.find_one({"email": hasta_email})
    su_gunluk = 0.0
    if user and "su_gunlugu" in user:
        su_gunluk = user["su_gunlugu"].get(today_str, 0.0)
        
    cursor = yemekler_collection.find({"hasta_email": hasta_email})
    
    bugun_kalori = 0
    bugun_yemekler = []
    dun_yemekler = []
    
    for row in cursor:
        tarih = row.get("tarih", "")
        if tarih.startswith(today_str):
            bugun_kalori += row.get("kalori", 0)
            bugun_yemekler.append({
                "id": str(row["_id"]),
                "yemek_adi": row.get("yemek_adi"),
                "kalori": row.get("kalori", 0),
                "protein": row.get("protein", 0),
                "yag": row.get("yag", 0),
                "karbonhidrat": row.get("karbonhidrat", 0),
                "saat": tarih.split(" ")[1] if " " in tarih else tarih
            })
        elif tarih.startswith(yesterday_str):
            dun_yemekler.append({
                "id": str(row["_id"]),
                "yemek_adi": row.get("yemek_adi"),
                "kalori": row.get("kalori", 0),
                "protein": row.get("protein", 0),
                "yag": row.get("yag", 0),
                "karbonhidrat": row.get("karbonhidrat", 0),
                "saat": tarih.split(" ")[1] if " " in tarih else tarih
            })
            
    # Yemekleri en son eklenenden en eskiye doğru sırala
    bugun_yemekler.sort(key=lambda x: x["saat"], reverse=True)
    dun_yemekler.sort(key=lambda x: x["saat"], reverse=True)
            
    # Hedefleri hesapla
    kilo = user.get("kilo")
    boy = user.get("boy")
    hedef_su = 2.5 # varsayılan
    if kilo:
        hedef_su = round(float(kilo) * 0.035, 1) # Her kg için 35ml su

    # Uzman Sistem Analizi
    bugun_protein = sum(y.get("protein", 0) for y in bugun_yemekler)
    bugun_yag = sum(y.get("yag", 0) for y in bugun_yemekler)
    bugun_karb = sum(y.get("karbonhidrat", 0) for y in bugun_yemekler)
    bugun_ogun = len(bugun_yemekler)
    dun_kalori = sum(y.get("kalori", 0) for y in dun_yemekler)

    # Detaylı çeşitlilik analizi için hastanın tüm yemek geçmişini alalım
    all_meals = list(yemekler_collection.find({"hasta_email": hasta_email}))

    patient_data = {
        "fullname": user.get("fullname", user.get("username", hasta_email)) if user else hasta_email,
        "boy": boy,
        "kilo": kilo,
        "bugun_toplam_kalori": bugun_kalori,
        "bugun_protein": bugun_protein,
        "bugun_yag": bugun_yag,
        "bugun_karbonhidrat": bugun_karb,
        "bugun_ogun_sayisi": bugun_ogun,
        "dun_toplam_kalori": dun_kalori,
        "bugun_su_tuketimi_l": su_gunluk,
        "hedef_su_l": hedef_su,
        "kayitli_yemekler": all_meals
    }

    patient_insights = DieteticsExpertSystem.analyze_patient(patient_data)
            
    return {
        "bugun_kalori": bugun_kalori,
        "hedef_kalori": 2000,
        "bugun_su": su_gunluk,
        "hedef_su": hedef_su,
        "kilo": kilo,
        "boy": boy,
        "bugun_yemekler": bugun_yemekler,
        "dun_yemekler": dun_yemekler,
        "analizler": patient_insights
    }

@app.post("/profil-guncelle")
async def profil_guncelle(hasta_email: str = Form(...), boy: float = Form(...), kilo: float = Form(...), fullname: str = Form(None)):
    update_fields = {"boy": boy, "kilo": kilo}
    if fullname:
        update_fields["fullname"] = fullname
        
    users_collection.update_one(
        {"email": hasta_email},
        {"$set": update_fields}
    )
    hedef_su = round(float(kilo) * 0.035, 1)
    return {"status": "success", "message": "Profil güncellendi.", "hedef_su": hedef_su}

@app.get("/profil")
async def profil_getir(email: str):
    user = users_collection.find_one({"$or": [{"email": email}, {"username": email}]})
    if user:
        return {
            "fullname": user.get("fullname", user.get("username", "")),
            "email": user.get("email", user.get("username", "")),
            "boy": user.get("boy", ""),
            "kilo": user.get("kilo", ""),
            "role": user.get("role", "danisan")
        }
    return {"error": "Kullanıcı bulunamadı"}

@app.post("/su-ekle")
async def su_ekle(hasta_email: str = Form(...), miktar: float = Form(...)):
    today_str = datetime.now().strftime("%Y-%m-%d")
    user = users_collection.find_one({"email": hasta_email})
    
    current_su = 0.0
    if user and "su_gunlugu" in user:
        current_su = user["su_gunlugu"].get(today_str, 0.0)
        
    new_su = current_su + miktar
    
    users_collection.update_one(
        {"email": hasta_email},
        {"$set": {f"su_gunlugu.{today_str}": new_su}}
    )
    return {"status": "success", "bugun_su": new_su}

@app.get("/yemek-gecmisi")
async def yemek_gecmisi(hasta_email: str):
    """Hastanın tüm yemek kayıtlarını ve günlük besin istatistiklerini döndürür."""
    cursor = yemekler_collection.find({"hasta_email": hasta_email}).sort("tarih", -1)
    
    yemekler = []
    gunluk_istatistik = {}  # {"2026-05-15": {kalori: X, protein: Y, yag: Z, karbonhidrat: W}}
    
    for row in cursor:
        tarih = row.get("tarih", "")
        gun = tarih.split(" ")[0] if " " in tarih else tarih
        
        yemek = {
            "id": str(row["_id"]),
            "yemek_adi": row.get("yemek_adi", ""),
            "kalori": row.get("kalori", 0),
            "protein": row.get("protein", 0),
            "yag": row.get("yag", 0),
            "karbonhidrat": row.get("karbonhidrat", 0),
            "guven_orani": row.get("guven_orani", 0),
            "tarih": tarih
        }
        yemekler.append(yemek)
        
        # Günlük istatistik topla
        if gun not in gunluk_istatistik:
            gunluk_istatistik[gun] = {"kalori": 0, "protein": 0, "yag": 0, "karbonhidrat": 0, "ogun_sayisi": 0}
        gunluk_istatistik[gun]["kalori"] += row.get("kalori", 0)
        gunluk_istatistik[gun]["protein"] += row.get("protein", 0)
        gunluk_istatistik[gun]["yag"] += row.get("yag", 0)
        gunluk_istatistik[gun]["karbonhidrat"] += row.get("karbonhidrat", 0)
        gunluk_istatistik[gun]["ogun_sayisi"] += 1
    
    sorted_days = sorted(gunluk_istatistik.keys(), reverse=True)[:7]
    gunluk_liste = []
    for gun in reversed(sorted_days):  # Eski → yeni sırada grafik için
        stat = gunluk_istatistik[gun]
        gunluk_liste.append({
            "tarih": gun,
            "gun_kisa": datetime.strptime(gun, "%Y-%m-%d").strftime("%d/%m"),
            **stat
        })
    
    toplam_kalori = sum(y["kalori"] for y in yemekler)
    toplam_protein = sum(y["protein"] for y in yemekler)
    toplam_yag = sum(y["yag"] for y in yemekler)
    toplam_karbonhidrat = sum(y["karbonhidrat"] for y in yemekler)
    toplam_ogun = len(yemekler)
    
    return {
        "yemekler": yemekler,
        "gunluk_istatistik": gunluk_liste,
        "toplam": {
            "kalori": toplam_kalori,
            "protein": toplam_protein,
            "yag": toplam_yag,
            "karbonhidrat": toplam_karbonhidrat,
            "ogun_sayisi": toplam_ogun
        }
    }

@app.post("/test-veri-ekle")
async def test_veri_ekle(hasta_email: str = Form(...)):
    """Test amaçlı geçmiş yemek verileri ekler."""
    import random
    
    user = users_collection.find_one({"email": hasta_email})
    if not user:
        return {"status": "error", "message": "Kullanıcı bulunamadı"}
    
    hasta_adi = user.get("fullname", hasta_email)
    
    yemek_listesi = [
        {"yemek_adi": "Hamburger", **BESIN_CETVELI["hamburger"]},
        {"yemek_adi": "Kebap",     **BESIN_CETVELI["kebab"]},
        {"yemek_adi": "İskender",  **BESIN_CETVELI["iskender"]},
        {"yemek_adi": "Pizza",     **BESIN_CETVELI["pizza"]},
        {"yemek_adi": "Salata",    **BESIN_CETVELI["salad"]},
    ]
    
    eklenen = 0
    for gun_oncesi in range(7):
        tarih_obj = datetime.now() - timedelta(days=gun_oncesi)
        ogun_sayisi = random.randint(2, 4)
        
        for ogun in range(ogun_sayisi):
            saat = random.choice(["08:30", "12:15", "13:00", "18:45", "19:30", "20:00"])
            yemek = random.choice(yemek_listesi)
            tarih_str = tarih_obj.strftime(f"%Y-%m-%d {saat}")
            
            yemekler_collection.insert_one({
                "hasta_email": hasta_email,
                "hasta_adi": hasta_adi,
                "yemek_adi": yemek["yemek_adi"],
                "kalori": yemek["kalori"],
                "protein": yemek["protein"],
                "yag": yemek["yag"],
                "karbonhidrat": yemek["karbonhidrat"],
                "guven_orani": round(random.uniform(0.75, 0.98), 2),
                "tarih": tarih_str
            })
            eklenen += 1
    
    # Su verileri de ekle
    for gun_oncesi in range(7):
        tarih_obj = datetime.now() - timedelta(days=gun_oncesi)
        gun_str = tarih_obj.strftime("%Y-%m-%d")
        su_miktari = round(random.uniform(1.0, 3.5), 1)
        users_collection.update_one(
            {"email": hasta_email},
            {"$set": {f"su_gunlugu.{gun_str}": su_miktari}}
        )
    
    return {"status": "success", "message": f"{eklenen} yemek kaydı ve 7 günlük su verisi eklendi.", "eklenen": eklenen}


@app.post("/yemek-ekle")
async def yemek_ekle(
    hasta_email: str = Form(...),
    hasta_fullname: str = Form(...),
    yemek_adi: str = Form(...),
    kalori: float = Form(...),
    protein: float = Form(0.0),
    yag: float = Form(0.0),
    karbonhidrat: float = Form(0.0)
):
    try:
        yemek_doc = {
            "hasta_email": hasta_email,
            "hasta_adi": hasta_fullname,
            "yemek_adi": yemek_adi,
            "kalori": float(kalori),
            "protein": float(protein),
            "yag": float(yag),
            "karbonhidrat": float(karbonhidrat),
            "guven_orani": 1.0,  # Manuel eklenen yemek için %100
            "tarih": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        yemekler_collection.insert_one(yemek_doc)
        return {"status": "success", "message": "Yemek başarıyla eklendi!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/yemek-sil")
async def yemek_sil(yemek_id: str = Form(...)):
    # pyrefly: ignore [missing-import]
    from bson import ObjectId
    try:
        result = yemekler_collection.delete_one({"_id": ObjectId(yemek_id)})
        if result.deleted_count > 0:
            return {"status": "success", "message": "Yemek başarıyla silindi!"}
        else:
            raise HTTPException(status_code=404, detail="Yemek bulunamadı.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/ai-asistan-analiz")
async def ai_asistan_analiz(diyetisyen_email: str):
    """Diyetisyenin tüm hastalarını analiz edip akıllı öneriler üretir (Klinik Uzman Sistem Motoru)."""
    
    # Diyetisyenin hastalarını bul
    hastalar_cursor = users_collection.find({"diyetisyen": diyetisyen_email, "diyetisyen_status": "onaylandi"})
    hastalar = list(hastalar_cursor)
    
    if not hastalar:
        return {"analizler": [{"tip": "bilgi", "ikon": "information-circle", "baslik": "Henüz Hasta Yok", "mesaj": "Sisteminizde onaylı hasta bulunmamaktadır. Hastalar sizi seçtikten sonra burada analizler görünecektir.", "renk": "slate"}]}
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    hastalar_data = []
    
    for hasta in hastalar:
        h_email = hasta.get("email", "")
        h_adi = hasta.get("fullname", h_email)
        h_kilo = hasta.get("kilo")
        h_boy = hasta.get("boy")
        
        # Hastanın yemeklerini çek
        yemek_cursor = yemekler_collection.find({"hasta_email": h_email})
        yemek_list = list(yemek_cursor)
        
        bugun_kalori = 0
        bugun_protein = 0
        bugun_yag = 0
        bugun_karb = 0
        bugun_ogun = 0
        dun_kalori = 0
        toplam_kalori = 0
        toplam_protein = 0
        toplam_yag = 0
        gun_sayilari = {}
        
        for y in yemek_list:
            tarih = y.get("tarih", "")
            gun = tarih.split(" ")[0] if " " in tarih else tarih
            toplam_kalori += y.get("kalori", 0)
            toplam_protein += y.get("protein", 0)
            toplam_yag += y.get("yag", 0)
            
            if gun not in gun_sayilari:
                gun_sayilari[gun] = 0
            gun_sayilari[gun] += y.get("kalori", 0)
            
            if tarih.startswith(today_str):
                bugun_kalori += y.get("kalori", 0)
                bugun_protein += y.get("protein", 0)
                bugun_yag += y.get("yag", 0)
                bugun_karb += y.get("karbonhidrat", 0)
                bugun_ogun += 1
            elif tarih.startswith(yesterday_str):
                dun_kalori += y.get("kalori", 0)
        
        # Su tüketimi
        su_bugun = 0.0
        hedef_su = 2.5
        if hasta.get("su_gunlugu"):
            su_bugun = hasta["su_gunlugu"].get(today_str, 0.0)
        if h_kilo:
            hedef_su = round(float(h_kilo) * 0.035, 1)
        
        aktif_gun = len(gun_sayilari)
        ort_gunluk = round(toplam_kalori / aktif_gun) if aktif_gun > 0 else 0
        
        hastalar_data.append({
            "fullname": h_adi,
            "email": h_email,
            "boy": h_boy,
            "kilo": h_kilo,
            "bugun_toplam_kalori": bugun_kalori,
            "bugun_protein": bugun_protein,
            "bugun_yag": bugun_yag,
            "bugun_karbonhidrat": bugun_karb,
            "bugun_ogun_sayisi": bugun_ogun,
            "dun_toplam_kalori": dun_kalori,
            "bugun_su_tuketimi_l": su_bugun,
            "hedef_su_l": hedef_su,
            "ortalama_gunluk_kalori": ort_gunluk,
            "kayitli_yemekler": [
                {
                    "yemek_adi": y.get("yemek_adi"),
                    "kalori": y.get("kalori"),
                    "protein": y.get("protein"),
                    "yag": y.get("yag"),
                    "karbonhidrat": y.get("karbonhidrat"),
                    "tarih": y.get("tarih")
                }
                for y in yemek_list[-10:]
            ]
        })
        
    print("🧠 Klinik Uzman Sistem Analizleri üretiliyor...")
    expert_analizler = DieteticsExpertSystem.analyze_patients(hastalar_data)
    
    # Başa tanıtım kartı ekle
    expert_analizler.insert(0, {
        "tip": "bilgi",
        "ikon": "sparkles",
        "renk": "indigo",
        "baslik": "✨ Klinik Karar Destek Sistemi",
        "mesaj": "Mühendislik tabanlı Klinik Uzman Sistem devrede! Algoritma, hastalarınızın VKİ, BMR, makro besin dengesi ve öğün çeşitliliğini anlık olarak klinik kurallarla tarar."
    })
    
    return {"analizler": expert_analizler}


@app.post("/ai-chat")
async def ai_chat(request: ChatRequest):
    """Kullanıcının AI Diyet Koçu ile konuşmasını sağlar (Gelişmiş Klinik Yerel Ajan)."""
    # Hastanın güncel bilgilerini alalım (ad, boy, kilo)
    hasta = users_collection.find_one({"email": request.hasta_email})
    h_adi = hasta.get("fullname", "Danışan") if hasta else "Danışan"
    h_boy = hasta.get("boy")
    h_kilo = hasta.get("kilo")
    
    # Bugün alınan kalori ve makro bilgilerini ekleyelim
    yemek_cursor = yemekler_collection.find({"hasta_email": request.hasta_email})
    yemek_list = list(yemek_cursor)
    bugun_kalori = 0
    bugun_protein = 0
    bugun_yag = 0
    bugun_karb = 0
    today_str = datetime.now().strftime("%Y-%m-%d")
    for y in yemek_list:
        if y.get("tarih", "").startswith(today_str):
            bugun_kalori += y.get("kalori", 0)
            bugun_protein += y.get("protein", 0)
            bugun_yag += y.get("yag", 0)
            bugun_karb += y.get("karbonhidrat", 0)
            
    su_bugun = 0.0
    if hasta and "su_gunlugu" in hasta:
        su_bugun = hasta["su_gunlugu"].get(today_str, 0.0)

    # Standart hedefleri hesapla
    vki_str = ""
    target_cal = 2000
    target_water = 2.5
    
    if h_boy and h_kilo:
        try:
            boy_f = float(h_boy)
            kilo_f = float(h_kilo)
            vki, durum, renk = DieteticsExpertSystem.calculate_vki(boy_f, kilo_f)
            vki_str = f"VKİ'n {durum} sınırda ({vki})."
            target_cal = DieteticsExpertSystem.calculate_tdee(boy_f, kilo_f, durum)
            target_water = round(kilo_f * 0.035, 1)
        except Exception:
            pass

    user_msg = request.mesaj.lower().strip()
    
    # ------------------ KLİNİK DİYALOG KARAR AĞACI ------------------
    # 1. Selamlaşma
    if any(word in user_msg for word in ["merhaba", "selam", "hey", "naber", "nasılsın", "günaydın", "iyi günler"]):
        cevap = f"Merhaba {h_adi}! 😊 Ben senin kişisel AI Diyet Koçunum. Bugün sana nasıl yardımcı olabilirim? Öğün kalorilerini analiz edebilir, su durumumuzu konuşabilir ya da kilo hedeflerimize bakabiliriz!"
    
    # 2. Kalori ve Öğün Analizi
    elif any(word in user_msg for word in ["kalori", "kaç kalori", "enerji", "yediklerim", "yemekler"]):
        if bugun_kalori == 0:
            cevap = f"Bugün henüz hiç yemek kaydetmemişsin {h_adi}. Akıllı yemek tanımayı kullanarak tabağının fotoğrafını çekip bana gönderebilirsin! Günlük kalori hedefin: {target_cal} kcal."
        elif bugun_kalori > target_cal:
            cevap = f"Bugün şu ana kadar {bugun_kalori} kcal almışsın. Günlük bütçeni ({target_cal} kcal) biraz aşmış durumdayız. Akşam öğününü hafif salata veya fırınlanmış sebzeyle geçirmeni öneririm. 🥦"
        else:
            kalan = target_cal - bugun_kalori
            cevap = f"Bugün harika gidiyorsun! Aldığın toplam kalori: {bugun_kalori} kcal. Hedefine ulaşmana daha {kalan} kcal var. Dengeli beslenmeye aynen devam! 💪"
            
    # 3. Su tüketimi
    elif any(word in user_msg for word in ["su", "su içtim", "bardak", "dehidrasyon", "litre"]):
        if su_bugun == 0:
            cevap = f"Bugün hiç su kaydı girmemişsin {h_adi}! 💧 Vücudunun su dengesini korumak ve metabolizmanı hızlandırmak için hemen bir büyük bardak (250ml) su içip kaydetmeye ne dersin? Hedefimiz: {target_water}L."
        elif su_bugun < target_water:
            kalan = round(target_water - su_bugun, 1)
            cevap = f"Harika, bugün {su_bugun}L su içmişsin! 💧 Günlük hedefine ({target_water}L) ulaşmak için sadece {kalan}L su kaldı. Bir bardak su daha içerek hedefe yaklaşalım!"
        else:
            cevap = f"Süpersin! 🎉 Bugün {su_bugun}L su tüketerek {target_water}L olan günlük hedefini başarıyla tamamladın. Harika bir su bilincine sahipsin!"
            
    # 4. Protein / Kas
    elif any(word in user_msg for word in ["protein", "kas", "et", "tavuk", "yumurta"]):
        ideal_p = round(float(h_kilo) * 1.5) if h_kilo else 60
        if bugun_protein < ideal_p * 0.5:
            cevap = f"Bugün aldığın protein miktarı ({bugun_protein}g) kas kütleni korumak için biraz düşük kalmış {h_adi}. Günlük protein hedefin olan {ideal_p}g seviyesine çıkmak için akşam yemeğine lor peyniri veya tavuk ızgara eklemen harika olur!"
        else:
            cevap = f"Harika! Bugün vücuduna {bugun_protein}g protein kazandırdın. Kas gelişimin ve tokluk hissin için bu oran çok ideal. Tebrikler!"
            
    # 5. Diyetisyen Durumu
    elif any(word in user_msg for word in ["diyetisyen", "doktor", "uzman"]):
        if hasta and hasta.get("diyetisyen") and hasta.get("diyetisyen_status") == "onaylandi":
            cevap = f"Diyetisyenin Dr. {hasta.get('diyetisyen')} ile bağlantıdasın! Onun yazdığı özel diyet listelerine sadık kalmanı ve her gün öğünlerinin fotoğrafını çekip kaydetmeni tavsiye ederim."
        else:
            cevap = f"Henüz onaylı bir diyetisyen eşleşmen bulunmuyor {h_adi}. Ana sayfadaki 'Diyetisyen Seçimi' panelinden bir uzman seçip istek gönderebilirsin. Diyetisyenin onayladığı andan itibaren tüm öğünlerin ona anlık raporlanacaktır!"
            
    # 6. Kilo Verme / Diyet Hedefleri
    elif any(word in user_msg for word in ["kilo", "zayıflama", "diyet", "yağ yakımı", "kilo verme", "obez"]):
        if h_boy and h_kilo:
            cevap = f"Boyun {h_boy} cm, kilon {h_kilo} kg ve {vki_str} Kilo vermek için en kritik kural günlük {target_cal} kcal bütçesini aşmamak, su hedefini ({target_water}L) tamamlamak ve öğünlerinde fast-food yerine yüksek protein/sebze tercih etmektir."
        else:
            cevap = f"Kilo verme sürecini sana özel yönetebilmem için lütfen ana sayfadaki profil kartından boy ve kilo bilgilerini gir. Su ve kalori hedeflerini kilona göre anında hesaplayacağım!"
            
    # 7. Varsayılan Asistan Yanıtı
    else:
        cevap = f"Çok haklısın {h_adi}, sağlıklı yaşama giden bu yolda motivasyonumuz en büyük gücümüz! Soruna tam odaklanabilmem için bana su tüketimini, bugünkü kalorilerini, protein alımını sorabilir ya da boy-kilo analizi yapmamı isteyebilirsin. Her zaman buradayım! 😊"

    return {"cevap": cevap}


@app.on_event("startup")
async def startup_event():
    # Seed or sync nutrition database with BESIN_CETVELI
    try:
        if nutrition_collection is not None:
            added_count = 0
            for key, val in BESIN_CETVELI.items():
                if key == "unknown":
                    continue
                # Check if it exists in DB
                existing = nutrition_collection.find_one({"food_name": key})
                if not existing:
                    nutrition_collection.insert_one({
                        "food_name": key,
                        "yemek_adi": val["yemek_adi"],
                        "kalori": val["kalori"],
                        "protein": val["protein"],
                        "yag": val["yag"],
                        "karbonhidrat": val["karbonhidrat"]
                    })
                    added_count += 1
            if added_count > 0:
                print(f"🌱 MongoDB'ye {added_count} adet yeni besin verisi başarıyla eklendi/senkronize edildi!")
            else:
                total_db_count = nutrition_collection.count_documents({})
                print(f"ℹ️ MongoDB 'nutrition_data' koleksiyonu güncel ({total_db_count} kayıt).")
    except Exception as e:
        print("⚠️ Otomatik veritabanı besleme hatası:", e)

def start_server():
    # Ngrok'u tekrar devreye alıyoruz
    ngrok.set_auth_token(NGROK_TOKEN)
    public_url = ngrok.connect("127.0.0.1:8000").public_url
    print(f"\n🚀 API VE MONGODB ATLAS AKTİF! Ngrok Linkin: {public_url}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()