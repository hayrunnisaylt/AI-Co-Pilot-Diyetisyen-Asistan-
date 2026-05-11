import os
import shutil
from datetime import datetime
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
    username: str
    password: str
    role: str  # "diyetisyen" veya "danisan" gelecek

class UserLogin(BaseModel):
    username: str
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
    # Kullanıcı veritabanında var mı kontrol et
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten var.")
    
    # Şifreyi şifrele (hash) ve Atlas'a kaydet
    hashed_password = get_password_hash(user.password)
    new_user = {
        "username": user.username,
        "password_hash": hashed_password,
        "role": user.role
    }
    users_collection.insert_one(new_user)
    return {"status": "success", "message": "Kayıt başarılı!", "role": user.role}

@app.post("/login")
async def login(user: UserLogin):
    # Kullanıcıyı Atlas'ta bul
    db_user = users_collection.find_one({"username": user.username})
    
    # Kullanıcı yoksa veya şifreler eşleşmiyorsa hata fırlat
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı.")
    
    return {
        "status": "success", 
        "username": db_user["username"], 
        "role": db_user.get("role", "danisan")
    }

@app.post("/tahmin-et")
async def tahmin_et(hasta_adi: str = Form(...), file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tespitler = []
    
    if model:
        results = model(temp_filename, conf=0.25)
        # Eğer model hiçbir şey bulamazsa
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
                    
                    # Yemek analizini MongoDB Atlas'a kaydet
                    yemekler_collection.insert_one({
                        "hasta_adi": hasta_adi,
                        "yemek_adi": class_name,
                        "kalori": cal,
                        "guven_orani": conf,
                        "tarih": datetime.now().strftime("%Y-%m-%d %H:%M")
                    })

    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    return {"sonuc": tespitler}

@app.get("/diyetisyen-verileri")
async def verileri_getir():
    # Atlas'tan tüm verileri en yeniden en eskiye doğru çek
    cursor = yemekler_collection.find().sort("_id", -1)
    veriler = []
    for row in cursor:
        # MongoDB'nin özel ObjectId formatını React Native'in okuyabileceği formata çevir
        row["id"] = str(row["_id"]) 
        del row["_id"] # Eski objeyi sil
        veriler.append(row)
        
    return {"veriler": veriler}

def start_server():
    # Ngrok'u tekrar devreye alıyoruz
    ngrok.set_auth_token(NGROK_TOKEN)
    public_url = ngrok.connect(8000).public_url
    print(f"\n🚀 API VE MONGODB ATLAS AKTİF! Ngrok Linkin: {public_url}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()