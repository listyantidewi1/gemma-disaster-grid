# NusaSiaga · Gemma Rescue Grid — Rencana Tim (Bahasa Indonesia)

> *Versi Inggris: [`TEAM_PLAN.en.md`](TEAM_PLAN.en.md)*

Dokumen ini merupakan sumber acuan utama bagi tim selama pengerjaan submission untuk Kaggle Gemma 4 Good Hackathon. **Mohon dibaca terlebih dahulu sebelum melakukan `push` ke salah satu repo.** Dokumen ini sengaja disusun secara lengkap — apabila terdapat informasi yang terkesan berulang di bagian-bagian berikutnya, hal tersebut disengaja agar tidak menimbulkan keraguan.

---

## 1. Ringkasan 60 detik

Kita sedang membangun **NusaSiaga · Gemma Rescue Grid**, sebuah platform intelijen bencana *offline-first* yang ditenagai Gemma 4. Sistem ini merupakan satu produk dengan tiga tier yang berbagi satu kontrak JSON dari ujung ke ujung:

1. **Aplikasi Android** yang menjalankan Gemma 4 E2B pada perangkat. Responden lapangan mengambil foto (opsional disertai catatan suara atau teks), kemudian model menghasilkan laporan triase bencana yang terstruktur dalam waktu kurang dari lima detik. **Sepenuhnya offline. Tidak memerlukan koneksi internet.**
2. **Notebook Kaggle** yang menjalankan Gemma 4 31B di cloud. Pada saat perangkat memperoleh konektivitas, laporan-laporan yang berada di antrean disinkronisasi ke sini untuk proses sintesis lintas laporan: priority zones, ranked actions, dan validity flags. Keluarga model Gemma 4 yang sama, dengan ukuran lebih besar dan kapasitas reasoning yang lebih mendalam.
3. **Dashboard web** yang di-deploy di Vercel. Data yang sama, URL publik yang dapat diakses oleh juri. Menampilkan wildfire (lapisan satelit NASA FIRMS secara langsung) dan skenario flood/quake/industrial-fire (output sintesis Gemma 4) dalam satu disaster-type picker yang terpadu.

Kita melakukan submission ke **Kaggle Gemma 4 Good Hackathon** di track **Impact / Global Resilience**, dengan **Cactus Prize** sebagai prize tambahan yang ditumpuk di atasnya. Deadline: **Senin, 18 Mei 2026, pukul 11:59 PM UTC**. Bobot video adalah sekitar **70% dari total nilai** — alokasikan effort sesuai dengan proporsi tersebut.

Apabila hanya tersedia waktu untuk membaca satu bagian, bagian ini adalah yang paling penting.

---

## 2. Permasalahan yang sedang diselesaikan

Pada saat bencana terjadi — di mana pun di seluruh dunia — satu jam pertama merupakan periode paling mematikan. Periode tersebut sekaligus merupakan jam dengan kondisi konektivitas terburuk. Menara seluler rubuh. Bandwidth terputus. Informasi yang sampai kepada koordinator darurat tiba dalam bentuk lima puluh pesan WhatsApp yang tidak tersinkronisasi, foto buram dari perangkat yang bergetar, serta deskripsi yang disampaikan melalui radio dengan kondisi terdesak. Tim bantuan menghabiskan jam pertama yang sangat kritis hanya untuk membaca informasi tersebut.

Pola ini bersifat universal — badai di Karibia, gempa di Türkiye, banjir bandang di Bangladesh, kebakaran lahan gambut di Riau, gempa dangkal di Cianjur, atau kecelakaan industri di Surabaya. Bentuk bencananya berbeda; namun permasalahan respons lapangannya identik.

Perangkat AI bencana yang tersedia saat ini gagal tepat pada momen ini karena (a) memerlukan koneksi cloud yang stabil untuk dapat berfungsi, atau (b) merupakan chatbot berbasis teks yang tidak mampu membaca foto jalanan yang terendam banjir.

Gemma 4 merupakan keluarga model *open* pertama yang dirancang untuk menjawab kedua ujung permasalahan ini secara bersamaan: varian on-device 2,3 miliar parameter efektif yang berjalan sepenuhnya pada perangkat melalui Google AI Edge LiteRT, dan varian cloud 31 miliar parameter untuk reasoning lintas laporan yang lebih mendalam. **Keluarga model yang sama, kontrak JSON yang sama, prompt yang sama dapat dijalankan pada kedua skala tersebut.** Hal inilah yang menjadi landasan teknis bagi keberadaan proyek ini.

Skenario demonstrasi kami berlokasi di Indonesia (banjir Jakarta, gempa Cianjur, peristiwa kompleks banjir-kebakaran industri) karena itu merupakan konteks kerja tim. Arsitekturnya dirancang untuk dapat di-deploy di negara mana pun di mana responden dapat memegang sebuah perangkat HP.

---

## 3. Mengenai hackathon

**[The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon)** yang diselenggarakan di Kaggle. Deadline submission final pada **Senin, 18 Mei 2026, pukul 11:59 PM UTC** — atau bertepatan dengan **Selasa, 19 Mei 2026, pukul 06:59 WIB** di Jakarta. **Mohon untuk tidak melakukan submission di menit-menit terakhir.** Targetkan submission paling lambat enam jam sebelum deadline.

### Prize yang ditargetkan

- **Impact / Global Resilience — $10.000 (target utama).** Deskripsi track ini menyebutkan secara eksplisit "offline, edge-based disaster response to long-range climate mitigation." Sistem yang kita bangun persis sesuai dengan deskripsi tersebut. Track ini merupakan track yang paling defensible bagi proyek kita.
- **Special Tech / Cactus — $10.000 (dapat ditumpuk).** Deskripsinya adalah "aplikasi mobile atau wearable lokal-first terbaik yang secara cerdas merutekan tugas antar model." Arsitektur hybrid E2B-on-phone + 31B-in-cloud kita, dengan model on-device yang melakukan self-assessment untuk menentukan lane mana yang harus dilalui oleh setiap laporan, merupakan contoh kanonik untuk kategori ini.
- **Main Track — $10.000 hingga $50.000 (target ambisius).** Diberikan kepada proyek terbaik secara keseluruhan. Hanya akan tercapai apabila eksekusi berada pada tingkat tertinggi. Tidak perlu terlalu diandalkan, namun juga tidak perlu ditargetkan secara konservatif.

Prize Special Tech dan Main Track dapat ditumpuk. Impact Track merupakan pool tersendiri. Pada skenario terburuk, kita memperoleh Impact Track saja ($10K). Pada skenario yang kuat, kita menumpuk Impact + Cactus ($20K). Pada skenario terbaik, kita menambahkan penempatan Main Track di atasnya ($30K – $60K).

### Kriteria penilaian

Tiga kriteria dengan total 100 poin:

- **40 poin · Impact & Vision.** Diukur berdasarkan video. Apakah proyek mengangkat permasalahan dunia nyata yang signifikan? Apakah visi yang ditawarkan menginspirasi?
- **30 poin · Video Pitch & Storytelling.** Seberapa baik kualitas produksi video?
- **30 poin · Technical Depth & Execution.** Diverifikasi dari code repository dan writeup.

Hal ini berarti **70 poin (70%) ditentukan oleh video berdurasi 3 menit** dan 30 poin oleh code dan writeup. Implikasinya bersifat tegas: tidak peduli seberapa baik kualitas engineering yang dilakukan, apabila video tidak mampu mengomunikasikannya dengan baik, perolehan nilai akan tetap menurun. Mohon merencanakan alokasi waktu dengan mempertimbangkan hal tersebut.

---

## 4. Konsep kunci (glosarium)

Apabila menemukan salah satu istilah berikut di dokumentasi maupun kode dan terdapat keraguan terhadap maknanya, bagian ini menyediakan jawabannya.

### `EdgeTriageReport`

Objek JSON terstruktur yang dihasilkan oleh Gemma 4 E2B on-device dari satu foto. Field-nya antara lain: `disaster_type` (flood, fire, earthquake, dan sebagainya), `severity` (skala 1-5), `severity_rationale` (satu kalimat yang menjelaskan alasan skor tersebut), `hazards_visible` (array bahaya yang terlihat), `people_visible` (jumlah orang dewasa, anak-anak, lansia, korban luka, dan korban terjebak), `immediate_action` (satu tindakan paling penting yang harus dilakukan dalam 10 menit ke depan), serta `evacuation_priority` (immediate, urgent, standby, none). Tersedia pula `routing_recommendation` yang ditentukan oleh model on-device itu sendiri (fast_lane atau deep_lane). Setiap laporan disertai UUID dan timestamp dalam format ISO.

Saat ini terdapat 35 EdgeTriageReports yang disusun secara manual dalam tiga skenario, tersimpan di `data/synthesis_scenarios/` di repo Python dan di `src/lib/scenario_*.json` di repo dashboard. Inilah yang menjadi input bagi model sintesis.

### `CommandCenterSynthesis`

Objek JSON terstruktur yang dihasilkan oleh Gemma 4 31B di sisi cloud ketika menerima sebuah *array* yang terdiri dari beberapa EdgeTriageReports. Field-nya mencakup: `primary_disaster_classification`, `geographic_scope`, `severity_distribution`, `estimated_affected` (rentang jumlah orang yang terdampak), `priority_zones` (cluster laporan di area yang sama, diperingkat berdasarkan severity), `consolidated_hazards` (agregasi lintas laporan), `recommended_actions` (diperingkat berdasarkan prioritas life-safety), serta `report_validity_notes` (yang menandai duplikasi, konflik, gambar berkualitas rendah, atau laporan yang saling mengonfirmasi).

Output inilah yang dirender oleh dashboard untuk setiap skenario flood/quake/industrial-fire.

### Intelligent routing (hook untuk Cactus Prize)

Setiap EdgeTriageReport membawa field `routing_recommendation` — bernilai `fast_lane` atau `deep_lane` — yang ditentukan oleh model on-device berdasarkan tingkat confidence-nya sendiri dan severity yang diobservasi. Application layer kemudian *menambahkan di atasnya* konteks deterministik yang tidak dapat dilihat oleh model: berapa banyak laporan lain yang telah masuk dari area yang sama dalam satu jam terakhir, status konektivitas saat ini, kedalaman queue, dan level baterai. Keputusan gabungan itulah yang merupakan *intelligent routing* sebagaimana yang dihargai oleh deskripsi Cactus Prize.

Poin pentingnya: mekanisme routing bukan sekadar rules engine. Model memutuskan untuk kasus yang dipahaminya; aplikasi melakukan eskalasi untuk edge case yang tidak mungkin diketahui oleh model (konteks lintas laporan). Kedua keputusan ini ditampilkan di layar sehingga juri dapat melihatnya secara langsung.

### Skenario

Tiga skenario bencana yang disusun secara manual untuk mendemonstrasikan synthesis tier. Setiap skenario merupakan file JSON yang berisi array EdgeTriageReports beserta metadata.

- **Scenario A — Banjir rapid-onset Jakarta Pusat.** 12 laporan dalam jendela waktu 90 menit. Multiple priority zones, hazard electrical yang berulang di air banjir, satu orang lansia perempuan yang terjebak di atap rumah, satu kemungkinan pengendara motor yang terjebak di underpass yang terendam. Kasus dengan tingkat kesulitan menengah. **Sintesis telah diverifikasi pada Gemma 4 E4B (Colab) pada Hari 1.**
- **Scenario B — Simulasi gempa dangkal Cianjur.** 15 laporan dalam waktu dua jam. Tiga insiden severity-5 yang mencakup bangunan yang mengalami pancake-collapse dengan korban terjebak yang terkonfirmasi, kubah masjid yang rubuh dengan secondary failure pada menara, evakuasi rumah sakit, kebocoran gas di pasar, halaman sekolah berisi 30 anak, serta satu laporan yang sengaja dibuat ambigu dengan confidence rendah. Kasus tersulit. **Sintesis menunggu pelaksanaan pada Hari 4 melalui Kaggle 31B.**
- **Scenario C — Compound banjir + kebakaran industrial.** 8 laporan dalam waktu 60 menit. Responden yang berbeda secara sengaja melakukan klasifikasi berbeda terhadap area yang sama (fire vs flood vs building collapse). Sintesis harus mampu menghasilkan klasifikasi compound yang koheren. Termasuk di dalamnya ambulans yang terjebak dengan paramedis di atapnya, serta kelompok di atap gudang yang menyertakan satu pekerja lansia. **Sintesis menunggu pelaksanaan pada Hari 4 melalui Kaggle 31B.**

### View Wildfire (NASA FIRMS)

Layer terpisah pada dashboard yang menampilkan hotspot kebakaran hutan yang terdeteksi satelit di seluruh wilayah Indonesia secara langsung, di-refresh setiap 30 menit dari API NASA FIRMS VIIRS. **Bukan berasal dari Gemma 4.** Ini merupakan intelijen pasif (satelit) sebagai komplemen terhadap intelijen aktif kita (EdgeTriageReports yang di-submit oleh pengguna). Keduanya saling melengkapi untuk membentuk situational awareness, diakses melalui disaster-type picker terpadu yang sama.

View wildfire telah tersedia di NusaSiaga sebelum pekerjaan Gemma 4 dimulai dan dipertahankan sepenuhnya — tidak ada satupun komponennya yang dimodifikasi atau dihapus selama proses integrasi.

---

## 5. Alasan pemilihan keputusan-keputusan spesifik ini

Keputusan arsitektural berikut disertakan sebagai informasi untuk konteks.

**Mengapa Gemma 4, bukan Gemma 3n.** Hackathon ini secara spesifik berfokus pada Gemma 4. Gemma 3n memang tersedia untuk penggunaan on-device, namun Gemma 4 memiliki varian on-device yang setara (E2B / E4B) ditambah dengan varian 31B yang lebih besar untuk cloud reasoning, dan varian cloud-nya berbagi arsitektur dengan varian on-device. Hal ini memberikan stack vertikal yang lengkap dari satu keluarga model.

**Mengapa E2B untuk tier edge.** Merupakan varian Gemma 4 terkecil dengan multimodal native (gambar + audio + teks) dan dapat berjalan dengan konsumsi memori sekitar 1,5 GB dengan kuantisasi INT4 pada perangkat Android kelas menengah. E4B yang lebih besar akan memberikan kualitas yang lebih baik namun mengonsumsi memori dan baterai yang lebih banyak. Untuk keperluan demo, prioritas kita adalah kecepatan dan reliabilitas.

**Mengapa 31B untuk tier cloud.** Merupakan flagship dense dalam keluarga Gemma 4. Alternatif 26B MoE memang lebih cepat, namun reasoning 31B lebih tajam, dan ketajaman tersebut menjadi sangat penting ketika mensintesis 12 laporan atau lebih yang dapat saling bertentangan. Model ini dijalankan dengan kuantisasi 4-bit melalui Unsloth pada setup 2× T4 di Kaggle, yang merupakan hardware yang sama yang dapat diakses oleh juri.

**Mengapa LiteRT untuk Android.** Google AI Edge LiteRT (sebelumnya bernama TensorFlow Lite for LLMs) merupakan jalur deployment resmi untuk Gemma 4 di sisi on-device. Tersedia pula Special Tech LiteRT Prize, namun kita hanya dapat memenangkan satu Special Tech prize, dan Cactus memiliki kesesuaian yang lebih baik dengan narasi arsitektur kita.

**Mengapa sintesis di-pre-bake pada dashboard, bukan dipanggil secara live.** Terdapat dua alasan. Pertama, juri yang mengakses URL live demo seharusnya melihat hasilnya secara seketika, bukan menunggu beberapa menit untuk model menyelesaikan eksekusi. Kedua, JSON sintesis itu sendiri yang merupakan artefak yang ingin kita biarkan untuk dievaluasi — kualitas reasoning model, clustering priority zone, dan validity flag — dan artefak tersebut bersifat statis, identik untuk setiap viewer. Pemanggilan AI secara live hanya akan menambah varians tanpa menambah nilai.

**Mengapa dua repo terpisah, bukan satu monorepo.** Hal ini merupakan kombinasi antara historical accident dan pemisahan praktis. Dashboard telah eksis sebagai repo terpisah ketika pekerjaan kita mulai digabungkan. Daripada melawan git history, kita memilih untuk membiarkan keduanya tetap terpisah dan menghubungkan keduanya pada writeup. Untuk jangka panjang dapat dilakukan merge; namun untuk keperluan hackathon, hal tersebut tidak sebanding dengan churn-nya.

**Mengapa Vercel.** Tersedia free tier, deployment langsung dari GitHub, dan dukungan native untuk Next.js 16 + server components. Requirement Live Demo pada aturan Kaggle adalah "URL atau file... dapat diakses publik, tanpa login atau paywall" — Vercel menyediakannya hanya dengan satu klik.

---

## 6. Walkthrough dashboard

Pada saat juri atau koordinator membuka URL yang telah di-deploy, berikut adalah tampilan yang akan dilihat:

**Di bagian paling atas:** brand header bertuliskan "NusaSiaga · Gemma Rescue Grid" dengan subtitle "Wildfire monitoring · Offline-edge flood response · Powered by Gemma 4" serta badge "Offline-First Demo".

**Tepat di bawahnya:** satu disaster-type picker yang terpadu (berupa kartu dropdown). Picker ini memiliki nilai default "Flood" — skenario yang sintesisnya telah siap. Apabila diklik, akan ter-expand menjadi empat opsi:

- 🔥 **Wildfire** — Live NASA FIRMS satellite hotspots di seluruh Indonesia
- 🌊 **Flood** — Banjir Jakarta Pusat · 12 laporan, sintesis lengkap
- 🏚️ **Earthquake** — Simulasi gempa dangkal Cianjur · 15 laporan, sintesis pending
- ⚡ **Industrial Fire** — Banjir + kebakaran transformator di zona industri · 8 laporan, sintesis pending

Beserta footer di dropdown yang menampilkan jenis bencana yang direncanakan untuk ditambahkan (Volcanic, Tsunami, Landslide, Storm, Building Collapse) dengan pesan "Same Gemma 4 architecture · same JSON contract · just add a scenario file."

**Di bawah picker**, konten body berubah sesuai dengan view mana yang sedang aktif.

Untuk **Wildfire**, body menampilkan komponen NusaSiaga yang orisinal: hero "Live Disaster Intelligence", panel AI Hazard Analyzer bertema wildfire, peta hotspot Indonesia dengan marker FRP-weighted, statistik environmental intelligence (AQI, arah angin, estimasi CO₂), incident feed wildfire, panel demo readiness, serta kartu deskripsi arsitektur. Konten ini merupakan data satelit NASA FIRMS yang di-refresh setiap 30 menit.

Untuk **Flood / Earthquake / Industrial Fire**, body menampilkan: blok hero dengan tiga metrik (reports synthesized, severe count, people affected); kartu sample triage yang menampilkan laporan paling severe dari skenario tersebut; peta Jakarta/Cianjur/zona-industri dengan marker yang diwarnai sesuai severity untuk setiap laporan; `CommandCenterSynthesis` lengkap yang dirender sebagai panel (bar distribusi severity, vulnerable groups, priority zones dengan hazard chips, recommended actions yang diperingkat, report validity flags, data confidence notes); grid statistik Operational Intelligence; daftar lengkap EdgeTriageReports dalam bentuk kartu; serta kartu deskripsi arsitektur yang sama.

Untuk skenario yang sintesisnya masih dalam status pending (B dan C hingga Hari 4), panel sintesis dan grid statistik akan menurun secara graceful menjadi kartu "synthesis pending", sementara komponen lainnya (peta, hero, reports feed) tetap dirender sepenuhnya.

Aesthetic yang digunakan adalah dark operational — latar belakang slate, aksen warna sky/emerald/red/orange, dengan typography yang besar dan jelas. Didesain untuk dapat di-screenshot dengan baik untuk keperluan video.

---

## 7. Rencana aplikasi Android

Di-fork dari `google-ai-edge/gallery`, yang telah mengimplementasikan loading model LiteRT, konstruksi prompt multimodal, dan flow camera capture. Modifikasi yang akan kita lakukan:

- **Menghapus UI chat general-purpose dari gallery.** Mengganti dengan satu screen capture foto satu-tombol.
- **Embed system prompt kita.** Disematkan sebagai Kotlin `const` string pada `ai.grg.EDGE_SYSTEM_PROMPT`.
- **Menggunakan schema kita.** Output di-decode ke Kotlin data class `EdgeTriageReport` melalui kotlinx.serialization.
- **Menambahkan routing decision.** Setelah menerima EdgeTriageReport, aplikasi menjalankan `decideRouting()` dan menampilkan badge fast-lane atau deep-lane.

Keempat file Kotlin yang bersifat drop-in tersedia di `android/app/src/main/kotlin/ai/grg/` di repo Python: `Schemas.kt`, `EdgeTriagePrompt.kt`, `Routing.kt`, dan `JsonExtraction.kt`. File-file tersebut bersifat platform-agnostic dan plugin kotlinx.serialization merupakan satu-satunya perubahan pada Gradle yang diperlukan.

**Hal-hal yang secara sengaja TIDAK kita bangun:** login, akun pengguna, fitur multi-user, map view di dalam aplikasi, push notifications, background sync, port iOS. Tidak ada dari fitur tersebut yang berdampak pada demo, dan seluruhnya berpotensi mengonsumsi waktu pengerjaan.

---

## 8. Fungsi notebook Kaggle

`notebook/gemma_rescue_grid.ipynb` — dibangun dari `build_notebook.py`, terstruktur dalam 31 sel. Juri yang mengeksekusi "Run all" akan melewati alur berikut:

1. Instalasi dependencies (Unsloth, transformers di-pin pada versi 5.5.0, pydantic)
2. Clone repo gemma-disaster-grid
3. Loading Gemma 4 melalui `FastModel.from_pretrained` dari Unsloth (satu variabel mengontrol ukuran model — E4B untuk Colab, 31B untuk Kaggle final)
4. Loading prompt dan validator kita dari package `grg`
5. Loading 12 EdgeTriageReports dari Scenario A
6. Eksekusi synthesis prompt; streaming reasoning trace `<|channel>thought` dari model beserta JSON final
7. Validasi terhadap schema Pydantic `CommandCenterSynthesis` (dengan autotrim defense dan truncation repair)
8. Render dashboard operational-picture di dalam notebook
9. Inspeksi system prompt edge-tier dan satu EdgeTriageReport sebagai sampel
10. Eksekusi fungsi intelligent routing pada setiap laporan; print tabel yang menunjukkan keputusan fast-lane vs deep-lane
11. Perpindahan ke Scenario B atau C dengan mengubah satu variabel

Notebook ini merupakan artefak "proof of work" — engineering yang sesungguhnya dapat dieksekusi oleh juri.

---

## 9. Peta repository

### `github.com/listyantidewi1/gemma-disaster-grid`

Repo Python / Android / writeup.

```
docs/                          Arsitektur, integration brief, rencana tim ini
prompts/                       System prompt Gemma 4 (edge + cloud)
grg/                           Package Python: schemas, routing, JSON repair
data/synthesis_scenarios/      Tiga skenario yang disusun manual (A banjir, B gempa, C kompleks)
notebook/                      Notebook Kaggle/Colab (dibangun via build_notebook.py)
android/                       Scaffold domain Kotlin untuk aplikasi Android
writeup/                       Kaggle Writeup v0.5 (target 1500 kata)
```

### `github.com/NoesaaDecodes/nusasiaga`

Repo dashboard Next.js.

```
src/app/                       Next.js App Router (page.tsx, api/firms, api/analyze)
src/components/shared/         AppHeader, Metric
src/features/dashboard/        UnifiedDashboard + DashboardViewPicker
src/features/wildfire/         WildfireView (composing komponen NASA FIRMS)
src/features/flood/            Komponen scenario flood/earthquake/industrial-fire
src/features/maps/             Map NASA FIRMS (view wildfire)
src/features/incidents/        Incident feed wildfire (dari MVP, dipertahankan)
src/features/environment/      Statistik environment wildfire (dari MVP, dipertahankan)
src/features/hazard-analysis/  AI Hazard Analyzer wildfire (dari MVP, dipertahankan)
src/lib/                       Skenario, tipe, output synthesis, loader FIRMS
notebooks/                     Notebook pipeline data FIRMS
outputs/                       Output data FIRMS
```

---

## 10. Catatan kecepatan

Saat ini kita berjalan jauh lebih cepat dari jadwal manapun yang masuk akal — pekerjaan yang semula dianggarkan untuk Hari 1 dan Hari 2 sebagian besar telah diselesaikan pada jam-jam pertama Hari 1. **Rencana hari per hari di bawah ini merupakan anggaran, bukan batas bawah.** Banyak item yang tertulis untuk "hari ini" atau "besok" telah diselesaikan. Mohon membaca ulang checklist secara berurutan untuk mengetahui apa saja yang sesungguhnya tersisa.

Yang perlu diperhatikan: paruh kedua timeline (proses syuting video, finalisasi writeup, deployment ke Vercel, serta menjalankan aplikasi Android di perangkat fisik) memerlukan lebih banyak waktu dan lebih sulit diprediksi dibandingkan paruh pertama. **Mohon untuk tidak mengasumsikan bahwa sisa proyek akan terkompresi dengan cara yang sama.**

### Snapshot status — 2026-05-14

- Android Studio telah terpasang; `google-ai-edge/gallery` telah di-fork dan di-clone; Gradle sync pertama berjalan bersih; gallery (tanpa modifikasi) berhasil di-build tanpa error.
- **`gemma-4-E2B-it` tersedia pada model picker gallery tanpa memerlukan HuggingFace OAuth.** Hal ini menyelesaikan risiko Android terbesar yang sebelumnya teridentifikasi. Tidak diperlukan substitusi credential pada `ProjectConfig.kt` untuk jalur demo.
- Model saat ini sedang di-download pada perangkat HP test (~2,5 GB melalui Wi-Fi). Konfirmasi inference masih menunggu.
- Dashboard NusaSiaga telah di-push melalui commit `2668f7a` dengan seluruh revisi branding dan platform-positioning. Deployment Vercel masih menunggu.
- Cache sintesis dari Colab E4B: hanya Scenario A yang dipertahankan (file cache di-overwrite pada setiap eksekusi). Scenario B dan C akan di-regenerate oleh Gemma 4 31B di Kaggle pada Hari 4 — kualitas yang dihasilkan lebih baik dibandingkan apabila dijalankan ulang pada Colab saat ini.

Bullet poin ini terikat tanggal. Informasi yang lebih lama dari ~12 jam mungkin sudah tidak relevan; mohon membaca ulang rencana hari per hari di bawah untuk mengetahui apa yang masih benar-benar terbuka.

---

## 11. Rencana hari per hari

Setiap hari disertai rationale singkat yang menjelaskan *mengapa* aktivitas tertentu dikerjakan pada hari tersebut, diikuti dengan checklist tugas yang bersifat flat. Siapa pun yang memiliki kapasitas dapat mengambil tugas berikutnya yang sudah tidak terblokir dan menyelesaikannya. Tidak terdapat kolom kepemilikan — koordinasi dilakukan melalui chat.

### Hari 1 — 13 Mei ✅ SELESAI

*Hari pondasi. Membangun kontrak data, prompt, skenario, dan memverifikasi bahwa synthesis tier berjalan pada model yang lebih kecil sebelum melakukan commit ke model yang lebih besar pada Kaggle.*

- [x] Scaffold repo, schemas, prompts, tiga skenario, logika routing
- [x] Notebook Kaggle/Colab berjalan end-to-end pada Gemma 4 E4B
- [x] Sintesis Scenario A telah diverifikasi: 5 priority zones, recommended actions yang diperingkat, validity flags
- [x] Integrasi NusaSiaga: unified disaster-type picker, view wildfire + flood/earthquake/industrial-fire
- [x] Scaffold domain Kotlin untuk Android
- [x] Writeup v0.5 (1573 kata; akan dipangkas menjadi 1500 pada Hari 6)
- [x] Rencana tim dwibahasa (dokumen ini)

### Hari 2 — 14 Mei (hari ini)

*Hari persiapan seluruh hal yang bersifat fisik. Android Studio mengunduh SDK berukuran 5+ GB; proses deploy Vercel memerlukan env var; perangkat HP test memerlukan aktivasi USB debugging. Tidak ada di antara aktivitas ini yang sulit secara intelektual, namun seluruhnya harus diselesaikan sebelum Hari 3 hingga Hari 5.*

- [x] Melakukan fork pada `google-ai-edge/gallery` ke akun GitHub pribadi
- [x] Clone fork tersebut di Android Studio ke direktori `D:\Projects\hackathon\gallery\Android\src`
- [x] Gradle sync pertama (~22 menit pada percobaan pertama; build bersih pada retry)
- [x] Menyambungkan perangkat HP test melalui USB; mengaktifkan USB debugging dari Developer Options
- [ ] Menjalankan gallery (tanpa modifikasi) di HP; memastikan Gemma 4 E2B berhasil di-load dan berjalan (model saat ini sedang di-download)
- [x] Telah teridentifikasi bahwa hanya Scenario A yang tersimpan pada cache sintesis Colab; Scenario B dan C ditangguhkan untuk eksekusi Kaggle 31B pada Hari 4
- [ ] Eksekusi `git pull` pada `nusasiaga` main untuk memperoleh seluruh pekerjaan terkait unified-picker, scenario, branding, dan platform-positioning
- [ ] Eksekusi `npm install && npm run dev` secara lokal pada dashboard untuk memastikan tree hasil merge dapat di-build tanpa error
- [ ] Deploy NusaSiaga ke Vercel untuk memperoleh URL Live Demo (free tier mencukupi; daftar menggunakan akun GitHub pemilik repo dashboard)
- [ ] Mencatat URL Vercel pada rencana tim ini serta pada README NusaSiaga agar tersedia satu link Live Demo yang kanonik
- [ ] Mengatur `NASA_FIRMS_MAP_KEY` pada pengaturan project Vercel (Settings → Environment Variables) agar data live untuk view wildfire dapat berjalan

### Hari 3 — 15 Mei

*Hari kustomisasi Android disertai polishing dashboard. File domain Kotlin telah disiapkan; kita tinggal menambahkannya, menghubungkan inference loop agar menggunakan system prompt kita, dan mengganti chat free-form bawaan gallery dengan flow capture satu-tombol.*

- [ ] Menambahkan keempat file Kotlin `ai.grg.*` ke fork gallery pada path package yang sesuai (sebagai contoh: `app/src/main/kotlin/ai/grg/`)
- [ ] Menambahkan `kotlinx-serialization-json:1.6.x` ke dependencies dan plugin `org.jetbrains.kotlin.plugin.serialization` ke `app/build.gradle.kts`
- [ ] Mengganti chat flow default dari gallery dengan single-button photo-capture → triage flow (ini merupakan perubahan UI yang besar; flow camera permission yang telah ada dapat digunakan kembali)
- [ ] Melakukan inject pada system prompt kita sebagai konten user-turn pertama ketika memanggil model
- [ ] Melakukan decode output model dengan `parseEdgeReport()` dan melakukan render terhadap `EdgeTriageReport` yang dihasilkan sebagai result card dengan severity badge, hazards list, immediate action, dan routing badge
- [ ] Memastikan Gemma 4 E2B berhasil di-download dari model picker gallery dan dapat berjalan di dalam aplikasi yang telah dimodifikasi
- [ ] Memperbarui teks Hazard Analyzer pada dashboard view wildfire: "Local Gemma analysis" → "Local Gemma 4 analysis" (polishing kecil)
- [ ] Menangkap screenshot kedua view (Wildfire dan Flood) dari deployment Vercel untuk keperluan editor video
- [ ] Refinement storyboard video pada `writeup/video_script_v1.md` dengan menggunakan visual unified-picker aktual yang telah tersedia

### Hari 4 — 16 Mei (kuota mingguan Kaggle dilakukan reset pada awal hari ini)

*Hari sintesis kualitas production. Kita berpindah dari Colab E4B (untuk development) ke Kaggle 31B (untuk final submission). Scenario B dan C saat ini menampilkan kartu "pending" pada dashboard; pada hari ini kita menggantinya dengan sintesis JSON yang sesungguhnya dari model yang lebih besar.*

- [ ] Membuka notebook di Kaggle (bukan Colab), mengeksekusi pada 2× T4 dengan `unsloth/gemma-4-31B-it`
- [ ] Menjalankan sintesis untuk Scenario A (memvalidasi bahwa output 31B paling tidak setara dengan baseline dari E4B)
- [ ] Menjalankan sintesis untuk Scenario B
- [ ] Menjalankan sintesis untuk Scenario C
- [ ] Menyimpan setiap output sebagai modul TypeScript `synthesis-scenario-{a,b,c}.ts` masing-masing
- [ ] Menambahkan file-file tersebut ke `nusasiaga/src/lib/`, memperbarui `scenarios.ts` untuk melakukan import terhadap objek-objek baru, mengubah B dan C dari `synthesisStatus: "pending"` ke `"generated"`
- [ ] Melakukan push ke `nusasiaga` main; Vercel akan melakukan auto-rebuild
- [ ] Mengambil screenshot dashboard yang baru yang menampilkan ketiga disaster type dengan dashboard operasional yang lengkap (tidak lagi terdapat kartu "pending")
- [ ] Memulai syuting footage HP apabila UI Android telah siap — responden mengambil foto, triage muncul pada result card

### Hari 5 — 17 Mei

*Hari produksi video. Seluruh hal yang bersifat teknis seharusnya telah diselesaikan malam ini. Selanjutnya difokuskan pada editing, voice-over, musik, dan polishing.*

- [ ] Syuting video berdurasi 3 menit. Adegan yang direkomendasikan:
  1. B-roll bencana (footage gempa Cianjur atau banjir Jakarta; menggunakan lisensi CC0 atau fair-use, maksimal 5 detik per cuplikan)
  2. HP di tangan, toggle mode pesawat terlihat, pengambilan foto
  3. Result card EdgeTriageReport memenuhi layar HP
  4. Dashboard di-scroll, berpindah antara Wildfire / Flood / Earthquake / Industrial Fire
  5. Beat arsitektur (E2B → 31B → dashboard, dinarasikan)
- [ ] Editing. Menambahkan voice-over (bahasa Inggris; native atau near-native, dengan tone yang tenang/serius). Menambahkan music bed (YouTube Audio Library atau track CC-attribution yang sesuai dengan tone serius namun penuh harapan)
- [ ] Upload ke YouTube sebagai unlisted. Memverifikasi link dapat diakses tanpa login. Menyimpan link tersebut untuk writeup
- [ ] Opsional: Unsloth LoRA fine-tune E2B dengan gambar bencana yang telah dikurasi. Apabila fine-tune secara material memperbaiki kalibrasi severity, hal tersebut didokumentasikan; apabila tidak, dapat di-drop
- [ ] Opsional: menambahkan scenario user-report wildfire (kebakaran lahan gambut Riau, sekitar 10 laporan yang disusun manual). Hal ini akan membuat tab wildfire pada dashboard menampilkan data NASA FIRMS sekaligus sintesis user-report

### Hari 6 — 18 Mei · HARI SUBMISSION

*Polishing, dry run, submission. Mohon untuk tidak melakukan ship code pada hari ini kecuali terdapat hal yang bersifat kritis.*

- [ ] Memangkas writeup dari 1573 kata menjadi ≤1500 kata. Pemangkasan dilakukan dari bagian "Technical Challenges" terlebih dahulu; mempertahankan bagian impact dan arsitektur
- [ ] Menambahkan URL Vercel, URL YouTube, URL GitHub (kedua repo), serta link file APK ke writeup
- [ ] Memilih cover image — foto dashboard yang bersih dengan salah satu scenario yang terbuka merupakan image tunggal yang paling kuat
- [ ] Dry run: membuka form Kaggle writeup di browser, menyalin seluruh konten, melakukan preview, namun **mohon untuk belum melakukan submit**
- [ ] Verifikasi ulang pemilihan track: **Impact Track → Global Resilience**
- [ ] Melakukan submit paling lambat 6 jam sebelum deadline. **Deadline: pukul 11:59 PM UTC, Senin 18 Mei 2026.** Atau setara dengan **pukul 06:59 WIB, Selasa 19 Mei 2026.**

---

## 12. Deliverables submission (sesuai aturan Kaggle)

Kaggle Writeup merupakan artefak payung. Seluruh artefak lainnya di-attach kepadanya. Kita wajib menyertakan seluruh hal berikut:

1. **Kaggle Writeup ≤ 1500 kata.** Penjelasan dalam format paper- atau blog-style mengenai proyek. Mencakup arsitektur, penggunaan Gemma 4, technical challenges, serta alasan ketepatan pilihan-pilihan kita. Dokumen ini merupakan "proof of work" — juri akan membacanya untuk memverifikasi bahwa video bukan merupakan rekayasa. Submission yang melebihi 1500 kata berpotensi dikenai penalty.
2. **Video YouTube ≤ 3 menit.** Di-publish ke YouTube (unlisted diperkenankan), dapat dilihat secara publik tanpa login. Merupakan deliverable yang paling penting — 70% dari total nilai.
3. **Public Code Repository.** Kedua GitHub repo kita (`gemma-disaster-grid` dan `nusasiaga`) tercantum di bagian Project Links pada writeup. Code wajib dapat dibaca secara publik, tanpa login maupun paywall.
4. **Live Demo URL.** Deployment di Vercel. Memungkinkan juri untuk merasakan proyek secara langsung tanpa harus menjalankan apa pun. Wajib dapat diakses secara publik tanpa login.
5. **Media Gallery termasuk cover image.** Cover image bersifat wajib agar writeup dapat di-submit. Akan dipilih pada Hari 6.
6. **(Opsional) Lampiran file APK.** Aplikasi Android yang di-export sebagai APK yang dapat di-install, di-attach sebagai file pada writeup. Memungkinkan juri untuk melakukan install pada perangkat Android pribadi mereka apabila menghendaki.

Submission dilakukan pada kategori **Impact Track / Global Resilience**. Kita memenuhi syarat untuk Cactus Prize pada Special Tech track secara bersamaan — peraturan memperbolehkan tumpuk Main + Special Tech, dan writeup kita perlu menyebutkan secara eksplisit kelayakan terhadap Cactus pada bagian arsitektur.

---

## 13. Norma kerja

Proyek dengan dua orang, satu produk. Semakin sering kita melakukan sinkronisasi, semakin sedikit pekerjaan ulang yang diperlukan.

- **`git pull` sebelum memulai pekerjaan.** Checkout yang tertinggal menyebabkan konflik merge yang membuang waktu.
- **Melakukan push commit dalam ukuran kecil, dilakukan secara sering.** Satu commit untuk satu perubahan logis. Lebih mudah untuk di-review, lebih mudah untuk di-revert.
- **Apabila melakukan perubahan pada file yang digunakan bersama (schemas, prompts, scenarios, atau rencana tim itu sendiri), mohon untuk menginformasikan hal tersebut melalui chat atau pada pesan commit** agar rekan tim mengetahui bahwa pull perlu dilakukan sebelum memulai perubahan berikutnya.
- **Mohon untuk tidak melakukan force-push ke main.** Apabila perlu melakukan rewrite history, dilakukan diskusi terlebih dahulu dengan rekan tim. Tidak terdapat skenario dalam timeline enam hari kita di mana force-push merupakan jawaban yang tepat.
- **Seluruh keputusan branding atau arsitektur yang bersifat major didokumentasikan dalam file ini.** Apabila terdapat keputusan yang mempengaruhi cara presentasi proyek, dokumen ini diperbarui dan dilakukan push.
- **Satu orang pada satu waktu untuk refactor komponen besar.** Polishing kosmetik (CSS, copy edits, perbaikan kecil) yang dilakukan secara paralel masih dapat diterima.
- **Apabila terdapat ketidaksetujuan terhadap sesuatu di dalam dokumen ini**, mohon untuk mengangkat hal tersebut di chat. Mohon untuk tidak mem-push di sekitar isu tersebut. Tujuan dari single source of truth adalah agar tetap berfungsi sebagai single source of truth.
- **Apabila menjumpai merge conflict yang tidak diketahui cara penyelesaiannya**, mohon untuk tidak memaksakan resolusi. Hubungi rekan tim, tinjau bersama. Lima menit diskusi memberikan hasil yang jauh lebih baik dibandingkan satu jam merge yang buruk.

---

## 14. Risiko kritis dan mitigasi

| Risiko | Kemungkinan | Tindakan |
|---|---|---|
| ~~**Download Gemma 4 E2B pada Android gagal** karena gallery membutuhkan HuggingFace OAuth~~ | **Telah teratasi pada 2026-05-14** | `gemma-4-E2B-it` tersedia langsung pada model picker gallery tanpa memerlukan HuggingFace OAuth credentials. Substitusi placeholder pada `ProjectConfig.kt` tidak diperlukan. Risiko dicoret, tidak diperlukan fallback |
| **Eksekusi Kaggle 31B pada Hari 4 gagal** karena permasalahan memori, generasi yang lambat, atau error pada notebook | Rendah | Melakukan fallback ke output E4B dari Colab (kita telah memiliki Scenario A dari Hari 1) dan secara eksplisit mencantumkan pada writeup bahwa demo menggunakan E4B karena adanya keterbatasan compute. Narasi arsitektur tetap sama tanpa terpengaruh varian Gemma 4 mana yang dieksekusi |
| **Deployment Vercel gagal karena API key FIRMS** | Rendah | Loader dashboard-hotspots pada view wildfire memiliki fallback chain 3-tier (FIRMS live → output notebook JSON → demo data). Meskipun API key belum di-set, page akan tetap melakukan render data hotspot demo. Apabila Vercel berhasil melakukan deploy, view wildfire akan berfungsi |
| **Video tidak dapat diselesaikan pada Hari 5** karena syuting + editing memerlukan waktu lebih lama dari yang diperkirakan | Sedang | Memangkas menjadi versi 90-detik yang berfokus pada satu beat dari sisi dashboard (panel sintesis) ditambah satu beat dari sisi HP (mode pesawat + pengambilan foto + result card). Memanfaatkan banyak B-roll dan voice-over yang minimal |
| **Writeup melampaui 1500 kata** | Rendah | Pemangkasan dilakukan dari Section 5 (Technical Challenges) terlebih dahulu — drop contoh-contoh spesifik dan pertahankan headline. Pertahankan bagian impact + arsitektur dengan upaya maksimal |
| **HP tidak memiliki kapasitas RAM / storage yang memadai untuk menjalankan E2B** | Rendah | E2B membutuhkan sekitar 2,5 GB RAM kosong. Apabila HP test mengalami kesulitan, dokumentasikan hardware yang direkomendasikan pada writeup; rekam video demo pada HP apa pun yang BERHASIL berjalan; sebutkan bahwa pengguna dapat menemukan daftar "Recommended Android device" pada `android/README.md` kita |
| **Kedua anggota tim mengalami kelelahan menjelang Hari 6** | Tinggi (selalu) | Dry run submission dimulai satu hari penuh lebih awal. Mohon untuk tidak menulis code baru pada Hari 6 kecuali terdapat hal yang bersifat kritis. Hari 6 ditujukan untuk polishing, bukan untuk pengembangan fitur |

---

## 15. Quick reference

- **URL Hackathon:** <https://www.kaggle.com/competitions/gemma-4-good-hackathon>
- **Code repo (Python/Android/writeup):** <https://github.com/listyantidewi1/gemma-disaster-grid>
- **Code repo (dashboard):** <https://github.com/NoesaaDecodes/nusasiaga>
- **URL Live Demo:** (akan ditambahkan pada Hari 2 setelah deployment Vercel)
- **URL Video:** (akan ditambahkan pada Hari 5 setelah upload)
- **Notebook starter Kaggle (sebagai referensi saja):** <https://www.kaggle.com/code/danielhanchen/gemma4-31b-unsloth>
- **AI Edge Gallery (aplikasi Android yang kita fork):** <https://github.com/google-ai-edge/gallery>
- **Bobot Gemma 4 E2B LiteRT pada Hugging Face:** <https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm>
- **Bobot Gemma 4 31B Unsloth pada Hugging Face:** <https://huggingface.co/unsloth/gemma-4-31B-it>

---

## 16. Kontributor

- listyantidewi@gmail.com
- noesaaerp@gmail.com

Selamat bekerja.
