# Projects

Uygulama rafı. App Store’daki işlerin bugünkü sırası, notları ve her repo için kısa bir brifing.

## Ne var

- Öncelik kuyruğu. Satırı sürükle ya da oklarla taşı. Üstte duran, bugün bakılacak iş.
- Proje sayfası. Sürüm, mağaza durumu, repo, Firebase proje adı, not.
- Notlar özel ya da ortak işaretlenir. Davet sonraki sürümde.
- Sync. Seçili reponun son commitlerini okur, brifingdeki “Son değişiklikler” bölümünü yeniler, diğer bölümleri bırakır. İstersen `docs/project-brief.md` dosyasını da o repoya yazar.

## Çalıştır

```bash
npm install
npm run dev
```

Aç: [http://localhost:3000](http://localhost:3000)

`npm test` brifing birleştirmesini dener.

## Veri

İlk açılışta on mağaza uygulaması bu tarayıcıya yazılır. Sıra, not ve brifing `localStorage` içindedir.

Firebase’e geçmek için Ayarlar’a web uygulama ayarını yapıştır. Giriş e-posta ve parolayla. Kurallar `firestore.rules` dosyasında, yol `users/{uid}/projects/{id}`. Hesabında yeni proje kotası dolu olduğu için hazır bir Firebase projesi gerekir. E-posta/parola sağlayıcısını o projede aç, sonra:

```bash
npx firebase deploy --only firestore:rules
```

## GitHub

Sync, sunucudaki `GITHUB_TOKEN` değerini kullanır. Yerelde bu değer `.env.local` içindedir ve repoya girmez. Başka bir makinede token’ı ayarlardan da verebilirsin. Token repoya yazacaksa `contents` izni gerekir.

Repo adları GitHub hesabındaki isimlerden eşlendi. ScreenMotion ve BARK için repo boş. Simetra’nın iOS reposu belli olmadığı için o da boş; Android ve web link olarak duruyor.
