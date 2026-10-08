# Projects · Cloud Functions

Projects mobil uygulamasının (Expo, `../mobile`) sunucu tarafı. Firebase Cloud Functions 2. nesil, TypeScript, Node 22, bölge `europe-west1`.

Veri modeli `src/model.ts` içinde; `mobile/src/domain/model.ts` ile birebir aynıdır. Birini değiştirirsen diğerini de değiştir.

## Fonksiyonlar

| Ad | Tür | Ne yapar |
| --- | --- | --- |
| `analyze` | callable (giriş ve Claude hakkı şart) | Abonelik hakkı ya da kredi varsa bir çağrı düşer, sonra projeleri, sinyalleri, metrikleri, olayları, son 30 commit'i ve notları Claude'a gönderir. Çağrı başarısız olursa hakkı iade eder. |
| `syncSources` | callable (giriş şart) | Kullanıcının bütün API bağlantılarını hemen senkronlar. |
| `scheduledSync` | 6 saatte bir | `private/credentials` belgesi olan her kullanıcı için aynı senkronu çalıştırır. |
| `dailyDigest` | her gün 09:00 (Europe/Istanbul) | Claude hakkı olan hesaplarda analizi çalıştırır ve Expo push ile gönderir. Hakkı olmayan hesabı atlar. |

Senkron sonunda `src/rules.ts` içindeki kural çalışır: aşaması `idea` veya `building` olup 14 gündür hareketsiz projeler için uyarı sinyali oluşur. Sinyaller `dedupeKey` ile tekilleştirilir (belge id = anahtarın hash'i); tekrar eden senkronlar kopya üretmez ve okundu işaretini bozmaz.

## Kurulum

```bash
cd functions
npm install
npm run build
npm test
```

Claude anahtarını gizli değer olarak kaydet (Secret Manager):

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Deploy (kök dizinden):

```bash
firebase deploy --only functions
# kurallar da değiştiyse
firebase deploy --only functions,firestore:rules
```

Yerel deneme: `npm run serve` (Functions + Firestore emülatörü).

## Claude anahtarı sunucudan çıkmaz

`ANTHROPIC_API_KEY` yalnızca Secret Manager'da durur ve sadece `analyze` ile `dailyDigest` çalışırken fonksiyonun içinde okunur. Mobil uygulamaya, Firestore'a veya loglara hiçbir zaman yazılmaz. Uygulama Claude'u yalnızca `analyze` callable'ı üzerinden, Firebase Auth ile kimliği doğrulanmış olarak çağırır.

## Kaynaklar ve gereken kimlik bilgileri

Kimlik bilgileri istemciden `users/{uid}/private/credentials` belgesine yazılır. Firestore kuralları bu belgeyi istemcinin **okumasına izin vermez**; sadece oluşturup güncelleyebilir. Fonksiyonlar Admin SDK ile okur.

```ts
{
  github?:   { token },                          // GitHub
  vercel?:   { token, teamId? },                 // Vercel
  appstore?: { issuerId, keyId, privateKey },    // App Store Connect API anahtarı
  supabase?: { accessToken },                    // Supabase
  expoPushTokens?: string[]                      // günlük özet bildirimi
}
```

Her projenin `connections` listesindeki `mode: "api"` bağlantılar senkronlanır; `mode: "manual"` olanlar atlanır.

| Kaynak | `connection.ref` | Kimlik bilgisi | Ne çekilir |
| --- | --- | --- | --- |
| GitHub | `owner/repo` | Fine-grained token, repo için salt-okunur Contents + Metadata (public repo'da token olmadan da çalışır, düşük limitle) | Son 20 commit → `commits/{sha}`, projenin `lastActivityAt` alanı |
| Vercel | Proje id'si (`prj_…`) veya proje adı | Hesap token'ı; takım projesiyse `teamId` | Son 10 deploy → `deployed` / `deploy_failed` olayları; son hazır deploy'dan yeni bir ERROR varsa kritik sinyal |
| App Store | App Store Connect app id (sayısal Apple ID) | App Store Connect API anahtarı: Issuer ID, Key ID ve `.p8` dosyasının içeriği (Developer rolü yeter) | Son 5 sürüm; inceleme/red/yayın olayları, iOS sürüm ve durumu, proje aşaması. Red → kritik "App Store reddetti", DEVELOPER_ACTION_NEEDED → uyarı |
| Supabase | Proje ref'i (`<ref>.supabase.co`) | Personal access token | db / auth / rest sağlığı; sağlıksız servis → uyarı |
| Google Play | paket adı | **Henüz yok.** Play Console'a bağlı servis hesabı + Android Publisher API gerekir | — (uygulamadan elle giriş) |
| Firebase Crashlytics | — | **Henüz yok.** Crashlytics'in REST API'si yok; BigQuery export açılıp sorgulanmalı | — (elle giriş) |
| RevenueCat | proje id'si | **Henüz yok.** RevenueCat v2 secret API anahtarı gerekir | — (elle giriş) |

Bir kaynak hata verirse bütün senkron düşmez: o bağlantı için "GitHub senkronu başarısız: …" gibi bir `info` sinyali oluşur, diğer kaynaklar devam eder. Başarılı her bağlantının `lastSyncAt` alanı güncellenir.

## Dosyalar

- `src/index.ts` — fonksiyon tanımları
- `src/analyze.ts` — Claude çağrısı ve şema (`InsightSchema`)
- `src/sync.ts` — `syncUser(uid)`
- `src/sources/<kaynak>.ts` — her kaynak için ayrı adaptör
- `src/rules.ts` — saf kurallar (hareketsizlik, aşama ilerletme)
- `src/signals.ts` — dedupeKey ile sinyal upsert
- `src/push.ts` — Expo push
- `test/` — `node:test` + `tsx` birim testleri
