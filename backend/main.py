import sqlite3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import shutil
import os
from datetime import datetime
from pyngrok import ngrok
import uvicorn

# ---------------------------------------------------------
# BURAYA GÜNCEL NGROK TOKEN'INI YAPIŞTIR
NGROK_TOKEN = "376t368dVBGJH9HVkipE26sjcpS_63mPp1vknCNymVAFRbrVC"
# ---------------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KALORI_CETVELI = {
    "Hamburger": 300, "Kebab": 450, "Iskender": 600,
    "Pizza": 250, "Salad": 100, "Unknown": 0
}

# --- VERİTABANI KURULUMU ---
def init_db():
    conn = sqlite3.connect("diyet_app.db")
    cursor = conn.cursor()
    
    # Yemekler Tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS yemekler (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hasta_adi TEXT,
        yemek_adi TEXT,
        kalori INTEGER,
        guven_orani REAL,
        tarih TEXT
    )
    """)
    
    # Kullanıcılar Tablosu (YENİ)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
    """)
    
    conn.commit()
    conn.close()

init_db()

# Model Yükleme
try:
    model = YOLO("best.pt")
except:
    model = None

# --- YENİ: KULLANICI İŞLEMLERİ İÇİN MODELLER ---
class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/register")
async def register(user: UserLogin):
    conn = sqlite3.connect("diyet_app.db")
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, user.password))
        conn.commit()
        return {"status": "success", "message": "Kayıt başarılı!"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten var.")
    finally:
        conn.close()

@app.post("/login")
async def login(user: UserLogin):
    conn = sqlite3.connect("diyet_app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username=? AND password=?", (user.username, user.password))
    user_data = cursor.fetchone()
    conn.close()
    
    if user_data:
        return {"status": "success", "username": user.username}
    else:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı.")

# --- YEMEK TAHMİN (GÜNCELLENDİ: ARTIK KULLANICI ADI ALIYOR) ---
@app.post("/tahmin-et")
async def tahmin_et(hasta_adi: str = Form(...), file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tespitler = []
    
    if model:
        results = model(temp_filename, conf=0.25)
        # Eğer model bir şey bulamazsa manuel ekle
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
                    
                    # Veritabanına Kaydet
                    conn = sqlite3.connect("diyet_app.db")
                    cursor = conn.cursor()
                    cursor.execute("INSERT INTO yemekler (hasta_adi, yemek_adi, kalori, guven_orani, tarih) VALUES (?, ?, ?, ?, ?)",
                                   (hasta_adi, class_name, cal, conf, datetime.now().strftime("%Y-%m-%d %H:%M")))
                    conn.commit()
                    conn.close()

    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    return {"sonuc": tespitler}

@app.get("/diyetisyen-verileri")
async def verileri_getir():
    conn = sqlite3.connect("diyet_app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM yemekler ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return {"veriler": rows}

def start_server():
    ngrok.set_auth_token(NGROK_TOKEN)
    public_url = ngrok.connect(8000).public_url
    print(f"\n🚀 DATABASE AKTİF! Linkin: {public_url}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()