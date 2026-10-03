# Projects · mobil

Tüm uygulamaların tek ekranda. iOS, Android ve mobil web aynı koddan.

## Çalıştır

```bash
npm install
npx expo start
```

`w` web, `i` iOS simülatörü, `a` Android. Telefonda Expo Go ile QR'ı okut.

## Ekranlar

- **Ana sayfa:** kaç uygulama, yarım kalanlar, bildirimler, analitik. Altında bugünün odağı ve proje şeridi.
- **Uygulamalar / proje sayfası:** aşama, yapılacaklar, metrik girişi, kaynaklar, commit ve mağaza akışı, notlar, aşama videosu.
- **Kaynaklar:** GitHub, Vercel, App Store, Supabase için API anahtarı; Google Play, Firebase, RevenueCat için elle giriş; mağaza reddi kaydı.

## Veri

Giriş yapmadan her şey cihazda (AsyncStorage) durur. `.env.example` dosyasını `.env` olarak kopyalayıp Firebase ayarını girince giriş açılır, ilk girişte yerel projeler hesaba taşınır. Claude analizi ve kaynak senkronu `functions/` içindeki Cloud Functions ile çalışır.

## Kontrol

```bash
npm run typecheck
npm test
```
