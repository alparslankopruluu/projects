# Projects — Video

Projects için Remotion ile yazılmış videolar. Hepsi 1080x1920 (dikey, telefon), 30 fps.

| Kompozisyon    | Süre | Ne anlatıyor |
| -------------- | ---- | ------------ |
| `Kickoff`      | 20 sn | Ürün vizyonu: dağınıklık → tek telefon → kaynak bağlantıları → Claude içgörüsü → kapanış kartı |
| `ProjectStage` | 8 sn  | Tek bir projenin aşaması (`start`, `middle`, `end`), JSON ile parametrelenir |

## Kurulum

```bash
cd video
npm install
```

Remotion ilk render'da kendi headless tarayıcısını indirir, bu yüzden ilk çalıştırma biraz sürebilir.

## Studio

```bash
npm run studio
```

Tarayıcıda Remotion Studio açılır. `ProjectStage` seçiliyken sağdaki props panelinden isim, renk tonu (`hue`), aşama, istatistikler ve checklist canlı olarak değiştirilebilir.

## Render

```bash
npm run render:kickoff   # out/kickoff.mp4
npm run render:stage     # props/example-stage.json ile out/stage.mp4
npm run still:kickoff    # out/kickoff-preview.png (300. kare)
npm run typecheck
```

Başka bir proje için kendi JSON dosyanı ver:

```bash
npx remotion render src/index.ts ProjectStage out/loopa.mp4 --props=./props/loopa.json
```

`ProjectStage` props şeması (`src/ProjectStage.tsx` içindeki `ProjectStageProps`):

```ts
{
  name: string;
  hue: number;                         // 0-360, kart gradyanının tonu
  stage: "start" | "middle" | "end";   // Başlangıç / Geliştirme / Yayında
  headline: string;
  stats: { label: string; value: string }[];     // en fazla 3, sayılar sayarak gelir
  checklist: { label: string; done: boolean }[]; // en fazla 5
}
```

## Mobil uygulama bu videoları nasıl tetikleyecek (sonraki adım, henüz yok)

Bugün render yalnızca yerelde, CLI ile yapılıyor. Planlanan akış:

1. Mobil uygulama bir proje aşama değiştirdiğinde (ör. `middle` → `end`) projenin verisini `ProjectStageProps` biçiminde hazırlar.
2. Bu veri bir sunucu uç noktasına gönderilir (ör. Firebase Function veya küçük bir Node servisi).
3. Sunucu, bu paketi `@remotion/bundler` ile bir kere paketler ve `@remotion/renderer` içindeki `renderMedia()` ile (ya da ölçek gerekirse Remotion Lambda / Cloud Run ile) `ProjectStage` kompozisyonunu render eder.
4. Çıkan MP4 depolamaya (ör. Firebase Storage) yüklenir, bağlantısı projeye yazılır ve uygulama bildirim gönderir.

Sunucu tarafı render henüz kurulmadı; bu paket şimdilik kompozisyonları ve yerel render komutlarını içerir.

## Notlar

- Kaynaklar (GitHub, Vercel, Firebase, Supabase, App Store, Google Play) yalnızca metin etiketiyle gösterilir; gerçek marka logosu kullanılmaz.
- Görsel dil mobil uygulamayla aynıdır: `#F6F4EF` zemin, `#16151A` mürekkep, 28 px köşe yarıçapı, ton (hue) ile üretilen pastel kartlar, Inter yazı tipi. Renkler `src/theme.ts` içinde.
- `out/` altındaki MP4 dosyaları git'e girmez; yalnızca `out/kickoff-preview.png` izlenir.
