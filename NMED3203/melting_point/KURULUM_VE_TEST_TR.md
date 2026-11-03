# Melting Point — Kurulum, Ayarlar ve Manuel Test (Türkçe)

## Çalıştırma
1. `index.html`, `style.css` ve `script.js` dosyalarını aynı klasöre koyun.
2. `index.html` dosyasına çift tıklayıp Chrome, Firefox, Safari veya Edge'de açın.
3. İnternet bağlantısına, ek kütüphaneye, sunucuya veya derleme adımına ihtiyaç yoktur.
4. Fareyle tıklama, telefonda dokunma ve klavyede Tab → Enter/Space ile beş konuma parça eklenebilir.

## Kullanıcı etkileşimi
- `01`–`05` düğmeleri: Beş sabit konumdan birine buz ekler. Dolu konuma yeni parça eklenemez.
- `Visible Past`: Erimiş parçaların en son bıraktığı izi gösterir.
- `Hidden Past`: Aynı geçmişi bellekte tutar fakat göstermez. Ekran okuyuculara da iz bilgisi aktarılmaz.
- Mod değiştirmek yeni, boş bir karşılaştırma denemesi başlatır (saat ve izler sıfırlanır).
- `Pause`: Deneyim saatini ve erimeyi dondurur; ekleme düğmeleri kullanılamaz.
- `Resume`: Kaldığı andan devam eder.
- `Reset`: Aktif buzları, her konumdaki izi ve deneyim zamanını temizler; aynı modda yeni deneme başlatır.
- Sekme gizlenirse otomatik Pause çalışır. Sekmeye dönünce `Resume` gerekir.
- Yalnızca tamamlanmış standart düğme aktivasyonları işlenir; Undo yoktur.
- Puanlama, kazanma/kaybetme, takip/analitik ya da veri toplama özelliği yoktur.

## DESIGN nesnesi (`script.js` dosyasının en üstünde)

### `colors`
- `page`: genel arka plan; `paper`: paneller; `ink`: ana yazı; `muted`: açıklama yazısı.
- `soft`: açık dolgu; `line`: sınır/ayraç; `ice`, `iceLight`, `iceDeep`: buz gövde/ışık/kenar renkleri.
- `accent`: seçili seçenek ve iz; `accentDark`: ana düğme; `shadow`: kart gölgesi.

### `sizes`
- `stageMinHeightPx`: masaüstü heykel sahnesinin minimum yüksekliği.
- `iceSizePx`: yeni bir parçanın başlangıç büyüklüğü; erime oranı buna uygulanır.
- `cardRadiusPx`: panellerin köşe yuvarlaklığı.
- `controlMinHeightPx`: düğmelerin dokunma yüksekliği.

### `timings`
- `meltDurationMs`: her parçanın toplam ömrü. **Seçilen tasarımda 15000 ms (15 saniye).**
- `displayRefreshMs`: görsel animasyon devam ederken metinlerin kaç milisaniyede bir güncellendiği. Erimenin hızını değiştirmez.

### `thresholds`
- `freshUntil`: ömrün hangi oranına kadar "Fresh ice" yazacağı (0.20 = ilk %20).
- `nearlyGoneFrom`: "Nearly melted" etiketinin hangi orandan itibaren görüneceği (0.80 = son %20).
- Bu iki eşik parçanın gerçek ömrünü veya boyutunu değiştirmez, yalnızca metin etiketini değiştirir.

### `rules`
- `slotCount`: sabit konum sayısı (tasarım gereği 5; görsel konum koordinatları `buildSlots` içindeki beş yerleşime bağlıdır).
- `requireEmptyPosition`: `true` olduğunda konuma tekrar eklemek için mevcut parçanın erimesi beklenir. `false` yapılırsa yeni parça eskisinin yerini alır.
- `retainLastTrace`: `true` olduğunda her konum için yalnızca son erime izi kalır; `false` olduğunda iz tutulmaz.
- `allowAddWhilePaused`: `true` yapılırsa duraklatılmış deneyde de parça eklenebilir; varsayılan tasarımda `false`.
- `autoPauseWhenHidden`: `true` iken sekme gizlenince duraklatır. `false` yapılırsa geçen süre sekmeye dönünce hesaba katılır.
- `clearEverythingOnReset`: `true` iken geçmiş silinir; `false` yapılırsa Reset sonrası son izler korunur.
- `resetOnModeSwitch`: `true` iken mod değişiminde her şey sıfırlanır; `false` yapılırsa mevcut deneme devam eder.
- Geri alma (Undo) mekanizması tasarım gereği bulunmaz.

**Not:** Yukarıdaki değerler onaylanan deneyimi aynen uygular. Ayarları değiştirmeniz yeni bir tasarım varyantı üretir ve karşılaştırmayı değiştirebilir. `slotCount` beş görsel yerleşimle eşleştirildiğinden bu proje için 5 bırakılmalıdır. Her konumda yalnızca tek aktif parça ve tek son iz bulunur.

## Manuel kontrol listesi
1. Sayfayı açın: saat sıfırdan başlamalı; beş konum boş olmalı.
2. `01` düğmesine basın: tek parça belirmeli ve küçülmeye başlamalı. Aynı düğme parça eriyene kadar kapalı olmalı.
3. Yaklaşık 5 saniye sonra `02`'ye basın: birinci parça ikinciden küçük görünmeli.
4. 15 saniye sonra ilk parça kaybolmalı ve `01` yeniden kullanılabilir olmalı. Visible Past'te iz görünecek.
5. İlk iz varken `01`'e yeni parça ekleyin: iz bellekte kalmalı. Bu parça eriyince eski izin yerine yeni tek iz geçmeli.
6. `Hidden Past` modunu seçin: yeni boş deneme başlamalı. Parçalar aynı sürede eriyecek, izler görünmeyecek ve durum açıklamalarında ifşa edilmeyecek.
7. `Pause`'a basıp 5 saniye bekleyin: saat ve buz boyutu değişmemeli; konum düğmeleri kapalı olmalı. `Resume` ile devam etmeli.
8. Başka bir sekmeye geçip dönün: deneyim otomatik duraklatılmış olmalı; kendiliğinden erime devam etmemeli.
9. Art arda birkaç kez `Reset`'e basın: ekranda çift hızda erime olmamalı; saat, parçalar ve izler temizlenmeli.
10. Klavyede Tab ve Enter/Space, telefonda dokunma ile düğmeleri kontrol edin. Focus göstergeleri görünür olmalı.

## Küçük karşılaştırma — gözlem uydurmayın
Gönüllü bir arkadaşınıza önce **Visible Past**, sonra **Hidden Past** modunda aynı geçici kompozisyonu oluşturma görevini verin. Her yeni deneme boş ve sıfır zamanla başlar. Deneme sırasında ne kadar beklediğini, eski yerleri yeniden kullanıp kullanmadığını ve nerede tereddüt ettiğini gözlemleyin. Ardından şu soruları sorun: "Önce ne eklediğini hatırlamak kolay mıydı?", "Bir sonraki parçayı ne zaman ekleyeceğine nasıl karar verdin?", "İzlerin olması/olmaması kararlarını etkiledi mi?" Gözlemleri ve sonuçları ancak denemeden sonra kendiniz yazın.
