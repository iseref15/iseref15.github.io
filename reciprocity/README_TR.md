# Give & Grow — Kurulum ve deneme notları

## Dosyalar
- `index.html`: İngilizce kullanıcı arayüzü ve bahçe bölgeleri.
- `style.css`: gece bahçesi görünümü, duyarlı yerleşim ve animasyonlar.
- `script.js`: ayarlar, etkileşim geçmişi, kurallar ve arayüz güncellemesi.

## Yerel olarak açma
1. Üç dosyayı aynı klasörde tutun.
2. `index.html` dosyasını Chrome, Firefox, Safari veya başka güncel bir tarayıcıda açın.
3. Bahçedeki bölgeleri tıklayın/dokunun ya da sağdaki alternatif eylem düğmelerini kullanın.
4. Klavyeyle gezinmek için `Tab` kullanın; odaktaki düğmeyi `Enter` veya `Space` ile çalıştırın.
5. `Pause / Resume` animasyonları ve yeni girişleri duraklatır; `Reset` tüm geçmişi silerek başlangıca döner.

Harici kütüphane, servis, derleme adımı veya veri gönderimi yoktur.

## İki koşulu karşılaştırma
`script.js` dosyasının en üstündeki `DESIGN` nesnesinde şu ayarı değiştirin:

- `mode: "accumulation"`: Her eylem türü (`Water`, `Rest`, `Light`) en az `accumulationPerAction` kadar yapıldığında çiçek açar. Sıra önemli değildir.
- `mode: "sequence"`: Çiçek yalnızca `DESIGN.rules.sequence.pattern` dizisi art arda tamamlandığında açar. Varsayılan sıra `Water → Rest → Light` şeklindedir. Dizi bozulursa eşleşme yeniden başlar; yeni bir `Water` eylemi sıranın başlangıcı olabilir.

Her koşul değişiminden sonra dosyayı kaydedin ve sayfayı yenileyin. İki denemede de aynı başlangıç durumunu kullanın. Arayüzdeki görseller ve eylemler aynı kalır; yalnızca çiçeğin açılma kuralı değişir.

## Kısa manuel kontrol
1. Sayfayı açın: bitki tohum halinde görünmeli; üç geçmiş alanı `EMPTY` olmalı.
2. `Water` eylemini uygulayın: durum filize ilerlemeli, geri bildirim değişmeli ve `Water` izi görünmeli.
3. Kısa tepki animasyonu sırasında eylem düğmeleri geçici olarak devre dışı kalmalı.
4. `Pause` seçin: yeni eylemler kabul edilmemeli. `Resume` ile devam edilebilmeli.
5. Duraklatılmışken `Reset` seçin: animasyon/durum, eylem izleri ve hafıza temizlenmeli; kontrol tekrar kullanılabilir hale gelmeli.
6. `accumulation` koşulunda üç eylem türünün her birini bir kez yapın; çiçek açmalı.
7. `sequence` koşulunda aynı eylemleri `Light → Water → Rest` gibi başka bir sırayla deneyin; çiçek açmamalı. Resetleyip `Water → Rest → Light` yapın; çiçek açmalı ve yeni eylemler deneme bitene kadar kapanmalı.

## `DESIGN` ayarları neyi değiştirir?
- `colors`: Arka plan, yazı, vurgu, çiçek ve odak göstergesi renkleri.
- `sizes`: Sahne yüksekliği, bitki genişliği, etkileşim alanlarının boyutu, sayfa genişliği, köşe yuvarlaklığı ve sütun aralığı.
- `timing.responseMs`: Her eylem sonrası kısa animasyonun ve eylem kilidinin süresi.
- `timing.ambientMs`: Yıldız ve sis animasyonlarının döngü süresi.
- `thresholds.accumulationPerAction`: Biriken koşulda her eylem türünün gerekli tekrar sayısı.
- `thresholds.visibleHistoryLength`: Ekranda gösterilen son eylem sayısı.
- `rules.accumulation.requiredActions`: Biriken koşulda gereken eylem türleri.
- `rules.sequence.pattern`: Sıralı koşulda gereken eylem dizisi.

Not: Sıralı koşulun varsayılan uygulaması, dizinin art arda gelmesini şart koşar. Görsel `bud` aşaması, üç eylem türü de en az bir kez görüldüğünde oluşur; fakat yalnızca seçili koşulun kuralı sağlandığında çiçek açar.
