import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // DÜZELTME: None -> null, False -> false olarak değiştirildi
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [veriler, setVeriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Sayfa açılınca veritabanındaki eski kayıtları çek
  useEffect(() => {
    verileriGetir();
  }, []);

  const verileriGetir = async () => {
    try {
      // Backend yerel adresi
      const response = await axios.get("http://localhost:8000/diyetisyen-verileri");
      setVeriler(response.data.veriler);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  const dosyaSec = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    // Seçilen resmin önizlemesini oluştur
    if (selectedFile) {
        setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const gonder = async () => {
    if (!file) return alert("Lütfen bir fotoğraf seçin!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("hasta_adi", "Hayrunnisa Y."); 

    setYukleniyor(true); // DÜZELTME: True -> true
    try {
      await axios.post("http://localhost:8000/tahmin-et", formData);
      alert("✅ Analiz tamamlandı ve veritabanına kaydedildi!");
      verileriGetir(); // Tabloyu yenile
      setFile(null);    // DÜZELTME: None -> null
      setPreview(null); // DÜZELTME: None -> null
    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu!");
    }
    setYukleniyor(false); // DÜZELTME: False -> false
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🥗 Akıllı Diyet Asistanı</h1>
      </header>

      <div className="container">
        {/* SOL TARAF: HASTA EKRANI */}
        <div className="card hasta-panel">
          <h2>📸 Hasta Paneli (Fotoğraf Yükle)</h2>
          <div className="upload-area">
            <input type="file" onChange={dosyaSec} accept="image/*" />
            {preview && <img src={preview} alt="Önizleme" className="preview-img" />}
            <button onClick={gonder} disabled={yukleniyor} className="btn-analiz">
              {yukleniyor ? "Analiz Ediliyor..." : "Analiz Et ve Gönder"}
            </button>
          </div>
        </div>

        {/* SAĞ TARAF: DİYETİSYEN EKRANI */}
        <div className="card diyetisyen-panel">
          <h2>👩‍⚕️ Diyetisyen Paneli (Hasta Geçmişi)</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hasta</th>
                <th>Yemek</th>
                <th>Kalori (Tahmini)</th>
                <th>Güven Oranı</th>
              </tr>
            </thead>
            <tbody>
              {veriler.map((veri) => (
                <tr key={veri.id}>
                  <td>{veri.tarih}</td>
                  <td>{veri.hasta_adi}</td>
                  <td><strong>{veri.yemek_adi}</strong></td>
                  <td>{veri.kalori} kcal</td>
                  <td>%{Math.round(veri.guven_orani * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;