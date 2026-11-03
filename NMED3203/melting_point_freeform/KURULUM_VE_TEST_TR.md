# Melting Point — Kurulum ve test

`index.html`, `style.css`, `script.js` dosyalarını aynı klasöre koyup `index.html` dosyasını açın. İnternet veya kütüphane gerekmez.

## Kullanım

- Galeriye istediğiniz noktada tıklayın/dokunun. Buz orada oluşur ve yerçekimiyle aşağı düşer.
- Başka parçaların üzerine buz ekleyerek heykel oluşturun. Destek parçaları 15 saniyede eridikçe üsttekiler düşer.
- Klavye: galeri alanına Tab ile odaklanın, oklarla imleci hareket ettirin, Enter veya Space ile buz yerleştirin. `Place at cursor` düğmesi de kullanılabilir.
- Visible Past: erimiş buzun **ilk yerleştirildiği konum** kesik çizgili iz olarak görünür. Hidden Past: izler çizilmez. Mod değişimi yeni deneme başlatır.
- Pause erimeyi ve hareketi durdurur, yeni eklemeyi engeller. Sekme gizlenince otomatik Pause uygulanır; dönüşte Resume gerekir.
- Reset parçaları, izleri ve deneyim saatini temizler.

## DESIGN ayarları

`script.js` başındaki `DESIGN` nesnesinde `colors` görsel renkleri, `sizes.icePx` başlangıç parçası boyunu, `sizes.cursorStepPx` klavye adımını, `timings.meltMs` erime süresini (varsayılan 15000 ms), `thresholds.gravity` düşme ivmesini, `thresholds.maxFrameSeconds` uzun karelerde zaman adımının üst sınırını, `rules.maxTraces` bellek üst sınırını ayarlar. Bellek sınırı uzun deneylerde performansı korur; her izin ilk konumu saklanır.

## Elle kontrol

1. Üst üste iki veya üç buz ekleyin; alttakiler eridikçe üsttekilerin düşmesini gözleyin.
2. 15 saniye sonra ilk buz kaybolmalı; Visible Past modunda ilk tıkladığınız yerde iz kalmalı.
3. Hidden Past modunda aynı erime sürmeli ancak izler görünmemeli.
4. Pause sırasında saat ve hareket durmalı; yeni parça eklenmemeli. Resume devam ettirmeli.
5. Reset tüm geçmişi ve zamanı sıfırlamalı. Sekmeyi gizleyip dönünce otomatik duraklama çalışmalı.

## Karşılaştırma

Bir arkadaşınıza her modda boş galeriden başlayarak serbest bir heykel oluşturmasını söyleyin. İlk yerleştirmeleri hatırlayıp hatırlamadığını, erime sonrası nasıl karar verdiğini ve hangi anda yeni destek eklediğini sorun. Sonuçları varsaymayın.

## Sınırlar

Fizik, tarayıcıda hızlı çalışan basitleştirilmiş iki boyutlu dikdörtgen destek modelidir; gerçekçi kırılma, dönme veya sıvı simülasyonu değildir. İzler ilk yerleştirme noktasında kalır, parçanın son düştüğü yerde değil. Her erime kendi izini oluşturur ve bellek `maxTraces` ile sınırlandırılır.
