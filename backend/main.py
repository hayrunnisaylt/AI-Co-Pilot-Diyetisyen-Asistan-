import os
import shutil
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from passlib.context import CryptContext
from pyngrok import ngrok
import uvicorn
from ultralytics import YOLO
import io
from PIL import Image

# ---------------------------------------------------------
NGROK_TOKEN = "376t368dVBGJH9HVkipE26sjcpS_63mPp1vknCNymVAFRbrVC"
MONGO_URI = "mongodb+srv://hayrunnisayoltan_db_user:1377Nisa.@cluster0.hqyueq0.mongodb.net/?appName=Cluster0"
# ---------------------------------------------------------

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
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# --- 4. VERİ MODELLERİ (PYDANTIC) ---
class UserRegister(BaseModel):
    fullname: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

# Besin Değerleri Cetveli (kalori, protein, yag, karbonhidrat)
BESIN_CETVELI = {
    "Hamburger": {"kalori": 300, "protein": 17, "yag": 14, "karbonhidrat": 28},
    "Kebab":     {"kalori": 450, "protein": 32, "yag": 25, "karbonhidrat": 22},
    "Iskender":  {"kalori": 600, "protein": 35, "yag": 33, "karbonhidrat": 40},
    "Pizza":     {"kalori": 250, "protein": 11, "yag": 10, "karbonhidrat": 30},
    "Salad":     {"kalori": 100, "protein": 3,  "yag": 5,  "karbonhidrat": 10},
    "Unknown":   {"kalori": 0,   "protein": 0,  "yag": 0,  "karbonhidrat": 0}
}

# Geriye dönük uyumluluk için basit kalori erişimi
def get_kalori(yemek_adi):
    return BESIN_CETVELI.get(yemek_adi, BESIN_CETVELI["Unknown"])["kalori"]

def get_besin(yemek_adi):
    return BESIN_CETVELI.get(yemek_adi, BESIN_CETVELI["Unknown"])

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
    users_collection.insert_one(new_user)
    return {"status": "success", "message": "Kayıt başarılı!", "role": user.role}

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
        results = model(temp_filename, conf=0.25)
        if not results[0].boxes:
            tespitler.append({"yemek_adi": "Tanımlanamadı", "kalori": 0, "guven_orani": 0.0})
        else:
            for r in results:
                for box in r.boxes:
                    class_name = model.names[int(box.cls[0])].title()
                    conf = float(box.conf[0])
                    besin = get_besin(class_name)
                    
                    tespitler.append({
                        "yemek_adi": class_name,
                        "kalori": besin["kalori"],
                        "protein": besin["protein"],
                        "yag": besin["yag"],
                        "karbonhidrat": besin["karbonhidrat"],
                        "guven_orani": conf
                    })
                    
                    yemekler_collection.insert_one({
                        "hasta_email": hasta_email,
                        "hasta_adi": hasta_fullname,
                        "yemek_adi": class_name,
                        "kalori": besin["kalori"],
                        "protein": besin["protein"],
                        "yag": besin["yag"],
                        "karbonhidrat": besin["karbonhidrat"],
                        "guven_orani": conf,
                        "tarih": datetime.now().strftime("%Y-%m-%d %H:%M")
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
        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id] # Örn: "lahmacun"
                
                # Kendi MongoDB koleksiyonun: nutrition_data
                food_data = db["nutrition_data"].find_one({"food_name": class_name})
                
                if food_data:
                    totals["foods"].append(class_name)
                    totals["total_calories"] += food_data.get("kalori", 0)
                    totals["total_protein"] += food_data.get("protein", 0)
                    totals["total_fat"] += food_data.get("yag", 0)
                    totals["total_carbs"] += food_data.get("karbonhidrat", 0)

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
                "yemek_adi": row.get("yemek_adi"),
                "kalori": row.get("kalori", 0),
                "protein": row.get("protein", 0),
                "yag": row.get("yag", 0),
                "karbonhidrat": row.get("karbonhidrat", 0),
                "saat": tarih.split(" ")[1] if " " in tarih else tarih
            })
        elif tarih.startswith(yesterday_str):
            dun_yemekler.append({
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
            
    return {
        "bugun_kalori": bugun_kalori,
        "hedef_kalori": 2000,
        "bugun_su": su_gunluk,
        "hedef_su": hedef_su,
        "kilo": kilo,
        "boy": boy,
        "bugun_yemekler": bugun_yemekler,
        "dun_yemekler": dun_yemekler
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
        {"yemek_adi": "Hamburger", **BESIN_CETVELI["Hamburger"]},
        {"yemek_adi": "Kebab",     **BESIN_CETVELI["Kebab"]},
        {"yemek_adi": "Iskender",  **BESIN_CETVELI["Iskender"]},
        {"yemek_adi": "Pizza",     **BESIN_CETVELI["Pizza"]},
        {"yemek_adi": "Salad",     **BESIN_CETVELI["Salad"]},
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


@app.get("/ai-asistan-analiz")
async def ai_asistan_analiz(diyetisyen_email: str):
    """Diyetisyenin tüm hastalarını analiz edip akıllı öneriler üretir."""
    
    # Diyetisyenin hastalarını bul
    hastalar_cursor = users_collection.find({"diyetisyen": diyetisyen_email, "diyetisyen_status": "onaylandi"})
    hastalar = list(hastalar_cursor)
    
    if not hastalar:
        return {"analizler": [{"tip": "bilgi", "ikon": "information-circle", "baslik": "Henüz Hasta Yok", "mesaj": "Sisteminizde onaylı hasta bulunmamaktadır. Hastalar sizi seçtikten sonra burada analizler görünecektir.", "renk": "slate"}]}
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    analizler = []
    
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
        
        # ===== AKILLI ANALİZLER =====
        
        # 1. Yüksek kalori uyarısı
        if bugun_kalori > 1500:
            analizler.append({
                "tip": "uyari", "ikon": "warning", "renk": "rose",
                "baslik": f"⚠️ {h_adi} - Yüksek Kalori",
                "mesaj": f"Bugün {bugun_kalori} kcal aldı (hedef: 2000 kcal). {bugun_ogun} öğün yedi. Kalori alımını kontrol altına almak için bir görüşme planlayabilirsiniz."
            })
        elif bugun_kalori > 800:
            analizler.append({
                "tip": "dikkat", "ikon": "alert-circle", "renk": "amber",
                "baslik": f"⚡ {h_adi} - Orta Kalori",
                "mesaj": f"Bugün şu ana kadar {bugun_kalori} kcal aldı ({bugun_ogun} öğün). Gün sonuna kadar hedefe ulaşabilir."
            })
        
        # 2. Düşük protein uyarısı
        if bugun_ogun >= 2 and bugun_protein < 20:
            analizler.append({
                "tip": "oneri", "ikon": "fitness", "renk": "indigo",
                "baslik": f"💪 {h_adi} - Düşük Protein",
                "mesaj": f"Bugün sadece {bugun_protein}g protein aldı. Kas kaybını önlemek için protein ağırlıklı öğünler önerebilirsiniz."
            })
        
        # 3. Yüksek yağ uyarısı
        if bugun_yag > 40:
            analizler.append({
                "tip": "uyari", "ikon": "heart-dislike", "renk": "rose",
                "baslik": f"🧈 {h_adi} - Yüksek Yağ Alımı",
                "mesaj": f"Bugün {bugun_yag}g yağ aldı. Doymuş yağ oranını kontrol edin ve daha sağlıklı alternatifler önerin."
            })
        
        # 4. Su eksikliği
        if su_bugun < hedef_su * 0.5 and su_bugun > 0:
            analizler.append({
                "tip": "dikkat", "ikon": "water", "renk": "cyan",
                "baslik": f"💧 {h_adi} - Su Eksikliği",
                "mesaj": f"Bugün sadece {su_bugun}L su içti (hedef: {hedef_su}L). Yeterli su tüketmesi için hatırlatma yapabilirsiniz."
            })
        elif su_bugun >= hedef_su:
            analizler.append({
                "tip": "basari", "ikon": "checkmark-circle", "renk": "emerald",
                "baslik": f"✅ {h_adi} - Su Hedefi Tamamlandı",
                "mesaj": f"Bugün {su_bugun}L su içerek {hedef_su}L hedefini aştı. Harika performans!"
            })
        
        if dun_kalori > 0 and bugun_kalori > 0:
            fark = bugun_kalori - dun_kalori
            if fark > 300:
                analizler.append({
                    "tip": "dikkat", "ikon": "trending-up", "renk": "amber",
                    "baslik": f"📈 {h_adi} - Kalori Artışı",
                    "mesaj": f"Bugün düne göre {fark} kcal daha fazla aldı (Dün: {dun_kalori} → Bugün: {bugun_kalori}). Yükselen trend izlenebilir."
                })
            elif fark < -300:
                analizler.append({
                    "tip": "basari", "ikon": "trending-down", "renk": "emerald",
                    "baslik": f"📉 {h_adi} - Kalori Düşüşü",
                    "mesaj": f"Bugün düne göre {abs(fark)} kcal daha az aldı. Diyete uyumu artıyor!"
                })
        
        # 6. Diyete uyum (genel)
        if aktif_gun >= 5 and ort_gunluk <= 1800:
            analizler.append({
                "tip": "basari", "ikon": "ribbon", "renk": "emerald",
                "baslik": f"🏆 {h_adi} - Mükemmel Uyum",
                "mesaj": f"Son {aktif_gun} gündür ortalama {ort_gunluk} kcal alıyor. Diyetine harika uyum sağlıyor!"
            })
        
        # 7. Bugün hiç yemek kaydı yoksa
        if bugun_ogun == 0 and len(yemek_list) > 0:
            analizler.append({
                "tip": "bilgi", "ikon": "help-circle", "renk": "slate",
                "baslik": f"❓ {h_adi} - Bugün Kayıt Yok",
                "mesaj": f"Bugün henüz yemek kaydı girmemiş. Hatırlatma mesajı gönderebilirsiniz."
            })
    
    # Boşsa genel bilgi
    if not analizler:
        analizler.append({
            "tip": "bilgi", "ikon": "sparkles", "renk": "blue",
            "baslik": "Analiz Bekleniyor",
            "mesaj": "Hastalarınız yemek ve su kaydı eklediğinde burada akıllı analizler göreceksiniz."
        })
    
    return {"analizler": analizler}


def start_server():
    # Ngrok'u tekrar devreye alıyoruz
    ngrok.set_auth_token(NGROK_TOKEN)
    public_url = ngrok.connect(8000).public_url
    print(f"\n🚀 API VE MONGODB ATLAS AKTİF! Ngrok Linkin: {public_url}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()