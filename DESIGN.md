# KRİSTAL ÇEKİRDEK (Crystal Core) - Oyun Tasarım Dokümanı

## 1. Tek Cümlelik Pitch
Kozmik bir enerji çekirdeğinin etrafında dönen bir enerji kıvılcımını kontrol et; dokunarak yerçekimini tersine çevir, karanlık maddelerden kaç ve enerji halkalarını toplayarak süpernovaya ulaş!

## 2. Ana Mekanik (The "Hook")
**"Ters Yörünge & İvme Bükme":**
Oyuncu merkezdeki Kristal Çekirdek etrafında doğal olarak dairesel bir yörüngede döner. 
- **Ekrana Dokun & Basılı Tut:** Çekirdeğin yerçekimi tersine döner (itme kuvveti uygular) ve kıvılcım dış yörüngelere doğru hızla savrulur.
- **Parmağını Bırak:** Yerçekimi tekrar devreye girer ve kıvılcım çekirdeğe doğru sarmal çizerek çekilir.
- **Zamanlama Bonusu (Mükemmel Geçiş):** Bir enerji halkasını tam merkezinden geçerek topladığında veya bir engeli kıl payı (Near-Miss) sıyırdığında zaman yavaşlar (hit-stop), kıvılcım parlar ve kombo çarpanı artar.

## 3. Neden Bağımlılık Yapacak?
- **3 Saniyede Öğrenme:** Tek parmak, tek aksiyon. Basılı tut = dışarı açıl, bırak = içeri çekil.
- **İlk 5 Saniyede "Vay Be" Anı:** İlk dokunuşla birlikte arka plandaki dinamik partikül ağı tepki verir, synth baslar yükselir ve kıvılcımın arkasında bıraktığı neon ışık izi (trail) ekranı boyar.
- **Risk-Ödül Dengesi:** Çekirdeğe çok yaklaşmak tehlikelidir ama en yüksek puanlı "Çekirdek Öpücüğü" (Core Kiss) bonusunu verir. Dış çeperdeki "Karanlık Kuşak" ise ölümcüldür.
- **Kısa Oturumlar (30-90 sn):** Hızlı tempo, anında yeniden başlama (0.2 sn geçiş) ve "sadece bir el daha" psikolojisi.

## 4. Oyun Döngüsü (Core Loop)
1. **Başlangıç:** Çekirdek uyanır, kıvılcım güvenli orta yörüngede dönmeye başlar.
2. **Aksiyon:** Farklı hızlarda ve desenlerde gelen *Karanlık Madde* bloklarından kaçılırken *Işık Kristalleri* toplanır.
3. **Süpernova Modu:** Kombo barı dolduğunda kıvılcım "Süpernova" formuna geçer; 5 saniye boyunca tüm engelleri parçalayarak ekstra puan kazanır.
4. **Oyun Sonu & Ödül:** Çarpışma anında dramatik bir patlama, kazanılan "Yıldız Tozu" (para birimi), rekor kontrolü ve yeni kostüm/tema açma ilerlemesi gösterilir.

## 5. İlerleme ve Koleksiyon Sistemi
Toplanan **Yıldız Tozları** ile kalıcı kozmetikler ve görsel temalar açılır:
- **Kıvılcım Formları (Skinler):** Klasik Safir, Güneş Patlaması, Zümrüt Hayalet, Kuantum Prizması.
- **Çekirdek Temaları:** Derin Uzay (Varsayılan), Siber Nebula, Altın Güneş, Kızıl Gezegen.
- **Görev Sistemi:** Her oyun başında 3 dinamik mini görev (Örn: "Tek oyunda 5 kıl payı geçiş yap", "30 saniye hayatta kal").

## 6. Sanat ve Ses Yönü
- **Görsel Stil:** Minimalist Neon Geometrik / Kozmik Soyut. Yüksek kontrastlı koyu arka plan üzerinde parlayan vektörel çizimler, dinamik ışık izleri (motion trails) ve ekran sarsıntıları.
- **Ses Tasarımı (Web Audio API):** Tamamen prosedürel olarak üretilen, oyuncunun yörünge yüksekliğine göre perdesi (pitch) değişen ambient synth atmosferi ve kristal toplama harmonikleri.