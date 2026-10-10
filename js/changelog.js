// Release notes shown from the version label in the top-right corner. Newest first.
// Every player-visible change bumps VERSION and adds a Turkish entry here (see CLAUDE.md).

export const CHANGELOG = [
  {
    version: '0.4.0',
    date: '2026-10-11',
    notes: [
      'Petler: kahramanın yanında tek bir pet savaşır. 100 elmasla yumurta aç; Sıradan, Nadir, Destansı ve Efsanevi petler çıkar.',
      'Aynı pet tekrar çıkarsa ★ yıldız kazanır (+%20 hasar). Her pet kristalle iki kez evrimleşir ve görünümü değişir.',
      'Pet Eğitimi: petin hasarını altınla yükselt. Eğitim tüm petler için ortaktır.',
      'Zindan: yoldaşlar artık 3 kişilik takımla zindanda canlı savaşır. Tank, vurucu, büyücü ve şifacı rolleri var.',
      'Kristal: zindanda kazanılır; yoldaş toplamak, yükseltmek ve pet evrimi için kullanılır.',
      'Elmas: ana savaşta ve zindanda her yeni boss ilk kez yenildiğinde kazanılır.',
      'Eski kayıtlarda yoldaşlara harcanan altın iade edildi; başlangıç köpeği ve 100 elmas hediye.',
      'Sağ üstte sürüm notları.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-11',
    notes: [
      'Aktif yetenekler: Öfke, Savaş Narası, Kılıç Fırtınası, Keskin Bakış, Altın Yağmuru.',
      'Yetenekler bölüm ilerledikçe açılır, altınla seviye atlar ve savaş alanındaki çubuktan kullanılır.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-11',
    notes: [
      'Telefonda ana ekrana eklenebilir uygulama; ilk açılıştan sonra internetsiz oynanır.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-10',
    notes: [
      'İlk sürüm: dokunarak savaş, bölümler, bosslar, 6 bölge, güçlendirmeler, yoldaşlar, Yeniden Doğuş.',
      'Otomatik kayıt, çevrimdışı altın ve kayıt kodu ile cihazlar arası taşıma.',
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
