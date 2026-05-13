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

# ---------------------------------------------------------
NGROK_TOKEN = "376t368dVBGJH9HVkipE26sjcpS_63mPp1vknCNymVAFRbrVC"
# Not: Şifreni doğrudan koda yazmak yerine ileride .env dosyasına taşıyabilirsin 😊
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

# Kalori Cetveli
KALORI_CETVELI = {
    "Hamburger": 300, "Kebab": 450, "Iskender": 600,
    "Pizza": 250, "Salad": 100, "Unknown": 0
}

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
                    cal = KALORI_CETVELI.get(class_name, 0)
                    
                    tespitler.append({
                        "yemek_adi": class_name,
                        "kalori": cal,
                        "guven_orani": conf
                    })
                    
                    yemekler_collection.insert_one({
                        "hasta_email": hasta_email,
                        "hasta_adi": hasta_fullname,
                        "yemek_adi": class_name,
                        "kalori": cal,
                        "guven_orani": conf,
                        "tarih": datetime.now().strftime("%Y-%m-%d %H:%M")
                    })

    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    return {"sonuc": tespitler}

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
    dun_yemekler = []
    
    for row in cursor:
        tarih = row.get("tarih", "")
        if tarih.startswith(today_str):
            bugun_kalori += row.get("kalori", 0)
        elif tarih.startswith(yesterday_str):
            dun_yemekler.append({
                "yemek_adi": row.get("yemek_adi"),
                "kalori": row.get("kalori"),
                "saat": tarih.split(" ")[1] if " " in tarih else tarih
            })
            
    # Dünün yemeklerini en son eklenenden en eskiye doğru sırala
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
        "dun_yemekler": dun_yemekler
    }

@app.post("/profil-guncelle")
async def profil_guncelle(hasta_email: str = Form(...), boy: float = Form(...), kilo: float = Form(...)):
    users_collection.update_one(
        {"email": hasta_email},
        {"$set": {"boy": boy, "kilo": kilo}}
    )
    hedef_su = round(float(kilo) * 0.035, 1)
    return {"status": "success", "message": "Profil güncellendi.", "hedef_su": hedef_su}

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

def start_server():
    # Ngrok'u tekrar devreye alıyoruz
    ngrok.set_auth_token(NGROK_TOKEN)
    public_url = ngrok.connect(8000).public_url
    print(f"\n🚀 API VE MONGODB ATLAS AKTİF! Ngrok Linkin: {public_url}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()