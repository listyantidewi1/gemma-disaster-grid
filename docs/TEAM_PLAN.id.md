# NusaSiaga · Gemma Rescue Grid — Rencana Tim (Bahasa Indonesia)

> *Versi Inggris: [`TEAM_PLAN.en.md`](TEAM_PLAN.en.md)*

Satu sumber acuan utama bagi tim selama kita mengerjakan submission untuk Kaggle Gemma 4 Good Hackathon. **Baca dokumen ini sebelum melakukan `push` ke salah satu repo.** Sengaja ditulis panjang — kalau ada yang terasa diulang-ulang di bawah, itu disengaja. Mending kami ulangi daripada salah satu dari kita harus menebak-nebak.

---

## 1. Versi 60 detik

Kita lagi bangun **NusaSiaga · Gemma Rescue Grid**, platform intelijen bencana *offline-first* yang ditenagai Gemma 4. Ini satu produk dengan tiga tier yang berbagi satu kontrak JSON yang sama:

1. **Aplikasi Android** yang menjalankan Gemma 4 E2B di HP. Responden lapangan ambil foto (opsional tambahkan voice note atau teks), dan model menghasilkan laporan triase bencana yang terstruktur dalam kurang dari lima detik. **Sepenuhnya offline. Tidak perlu internet.**
2. **Notebook Kaggle** yang menjalankan Gemma 4 31B di cloud. Saat HP dapat sinyal, laporan yang ngantri di-sync ke sini untuk sintesis lintas laporan: priority zones, ranked actions, validity flags. Keluarga Gemma 4 yang sama, model lebih besar, reasoning lebih dalam.
3. **Dashboard web** yang di-deploy di Vercel. Data yang sama, URL publik yang bisa diklik juri. Menampilkan wildfire (layer satelit NASA FIRMS langsung) dan skenario flood/quake/industrial-fire (output sintesis Gemma 4) di satu disaster-type picker yang terpadu.

Kita submit ke **Kaggle Gemma 4 Good Hackathon** di track **Impact / Global Resilience**, dengan **Cactus Prize** ditumpuk di atasnya. Deadline: **Senin 18 Mei 2026, 11:59 PM UTC**. Video memegang sekitar **70% nilai** — alokasikan effort sesuai itu.

Kalau cuma sempat baca satu bagian, baca ini.

---

## 2. Masalah yang sedang kita selesaikan

Saat bencana terjadi — gempa 5,6 di Cianjur, banjir bandang di Jakarta Pusat, kebakaran lahan gambut di Riau — satu jam pertama adalah yang paling mematikan. Itu juga jam dengan konektivitas paling buruk. Menara seluler ambruk. Bandwidth jebol. Informasi yang sampai ke koordinator darurat datang dalam bentuk lima puluh pesan WhatsApp yang tidak sinkron, foto buram dari HP yang gemetar, dan deskripsi yang diteriakkan lewat radio. Tim bantuan menghabiskan jam pertama yang kritis itu cuma untuk membaca.

Tools AI bencana yang ada gagal tepat di momen ini karena (a) butuh koneksi cloud yang stabil untuk berfungsi, atau (b) chatbot teks-only yang tidak bisa membaca foto jalanan yang banjir.

Gemma 4 adalah keluarga model open pertama yang dirancang untuk menjawab kedua ujung masalah ini sekaligus: varian on-device 2,3 miliar parameter efektif yang berjalan sepenuhnya di HP via Google AI Edge LiteRT, plus varian cloud 31 miliar parameter untuk reasoning lintas laporan yang serius. **Keluarga yang sama, kontrak JSON yang sama, prompt yang sama bekerja di kedua skala.** Itu insight teknis yang membuat proyek ini layak dikerjakan.

---

## 3. Tentang hackathon-nya

**[The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon)** di Kaggle. Deadline submission final **Senin 18 Mei 2026, 11:59 PM UTC** — itu **Selasa 19 Mei 2026, 06:59 WIB** di Jakarta. **Jangan submit di menit-menit terakhir.** Targetkan submit minimal enam jam sebelum deadline.

### Prize yang kita target

- **Impact / Global Resilience — $10.000 (utama).** Deskripsi track-nya menyebut "offline, edge-based disaster response to long-range climate mitigation." Sistem kita persis itu. Ini track yang paling defensible buat kita.
- **Special Tech / Cactus — $10.000 (bisa ditumpuk).** "Aplikasi mobile/wearable lokal-first terbaik yang secara cerdas merutekan tugas antar model." Arsitektur hybrid E2B-on-phone + 31B-in-cloud kita, dengan model on-device melakukan self-assessment lane mana yang harus dijalanin tiap laporan, adalah contoh paling kanonik.
- **Main Track — $10.000 sampai $50.000 (ambisi tertinggi).** Diberikan ke proyek terbaik secara keseluruhan. Hanya kena kalau eksekusi top-tier. Jangan diandalkan, tapi juga jangan sengaja main aman.

Prize Special Tech dan Main Track bisa ditumpuk. Impact Track adalah pool tersendiri. Skenario terburuk: kita dapat Impact Track saja ($10K). Skenario kuat: kita tumpuk Impact + Cactus ($20K). Skenario mimpi: tambah penempatan Main Track di atasnya ($30K – $60K).

### Bagaimana kita dinilai

Tiga kriteria, total 100 poin:

- **40 poin · Impact & Vision.** Diukur dari video. Apakah proyek mengangkat masalah dunia-nyata yang signifikan? Apakah visinya menginspirasi?
- **30 poin · Video Pitch & Storytelling.** Sebagus apa produksi video-nya?
- **30 poin · Technical Depth & Execution.** Diverifikasi dari code repository dan writeup.

Artinya **70 poin (70%) ditentukan oleh video 3 menit** dan 30 poin oleh code dan writeup. Implikasinya brutal: tidak peduli sebagus apa engineering-nya, kalau video-nya tidak menyampaikan dengan baik, nilai-nya tetap turun. Plan accordingly.

---

## 4. Konsep kunci (glossary)

Kalau ketemu salah satu istilah ini di dokumentasi atau kode kita dan bingung artinya, section ini jawabannya.

### `EdgeTriageReport`

Objek JSON terstruktur yang dihasilkan Gemma 4 E2B on-device dari satu foto. Field-nya: `disaster_type` (flood, fire, earthquake, dll.), `severity` (1-5), `severity_rationale` (satu kalimat alasan), `hazards_visible` (array bahaya yang terlihat), `people_visible` (hitungan dewasa, anak, lansia, terluka, terjebak), `immediate_action` (satu tindakan paling penting dalam 10 menit ke depan), dan `evacuation_priority` (immediate, urgent, standby, none). Plus `routing_recommendation` dari model on-device sendiri (fast_lane atau deep_lane). Setiap laporan punya UUID dan timestamp ISO.

Kita punya 35 EdgeTriageReports buatan tangan di tiga skenario yang tersimpan di `data/synthesis_scenarios/` di repo Python dan `src/lib/scenario_*.json` di repo dashboard. Ini yang kita umpankan ke model sintesis.

### `CommandCenterSynthesis`

Objek JSON terstruktur yang dihasilkan Gemma 4 31B di cloud saat menelan *array* EdgeTriageReports. Field-nya: `primary_disaster_classification`, `geographic_scope`, `severity_distribution`, `estimated_affected` (range jumlah orang yang terdampak), `priority_zones` (cluster laporan di area yang sama, di-rank berdasarkan severity), `consolidated_hazards` (agregasi lintas laporan), `recommended_actions` (di-rank berdasarkan life-safety priority), dan `report_validity_notes` (flagging duplikasi, konflik, gambar kualitas rendah, atau laporan yang saling mengkorroborasi).

Inilah yang dirender dashboard untuk tiap skenario flood/quake/industrial-fire.

### Intelligent routing (hook Cactus Prize)

Setiap EdgeTriageReport bawa field `routing_recommendation` — `fast_lane` atau `deep_lane` — yang ditentukan oleh model on-device berdasarkan confidence-nya sendiri dan severity yang dia observasi. Application layer kemudian *menumpuk di atas* konteks deterministik yang model tidak bisa lihat: berapa laporan lain yang sudah masuk dari area ini dalam satu jam terakhir, status konektivitas saat ini, depth queue, baterai. Keputusan gabungan itulah *intelligent routing* yang dihargai oleh deskripsi Cactus Prize.

Poin utamanya: routing bukan rules engine sederhana. Model memutuskan untuk kasus yang dia pahami; aplikasi yang melakukan eskalasi untuk edge case yang model tidak mungkin tahu (konteks lintas laporan). Kedua keputusan terlihat di layar supaya juri bisa melihatnya.

### Skenario

Tiga skenario bencana buatan tangan yang dipakai untuk men-demo synthesis tier. Setiap skenario adalah file JSON berisi array EdgeTriageReports plus metadata.

- **Scenario A — Banjir bandang Jakarta Pusat.** 12 laporan dalam jendela 90 menit. Multiple priority zones, hazard electrical yang berulang di air banjir, satu lansia perempuan terjebak di atap, satu kemungkinan pengendara motor terjebak di underpass yang terendam. Kasus tingkat menengah. **Synthesis sudah diverifikasi di Gemma 4 E4B (Colab) di Hari 1.**
- **Scenario B — Simulasi gempa dangkal Cianjur.** 15 laporan dalam dua jam. Tiga insiden severity-5 termasuk bangunan ambruk pancake-collapse dengan korban terjebak terkonfirmasi, kubah masjid ambruk dengan secondary failure menara, evakuasi rumah sakit, kebocoran gas di pasar, halaman sekolah dengan 30 anak, dan satu laporan yang sengaja dibuat ambigu dengan confidence rendah. Kasus paling sulit. **Synthesis menunggu Hari 4 Kaggle 31B.**
- **Scenario C — Compound banjir + kebakaran industrial.** 8 laporan dalam 60 menit. Responden yang berbeda sengaja mengklasifikasi area yang sama secara berbeda (fire vs flood vs building collapse). Synthesis harus menghasilkan klasifikasi compound yang koheren. Termasuk ambulans yang terjebak dengan paramedis di atapnya, dan kelompok di atap gudang dengan satu pekerja lansia. **Synthesis menunggu Hari 4 Kaggle 31B.**

### View Wildfire (NASA FIRMS)

Layer terpisah di dashboard yang menampilkan hotspot kebakaran hutan yang dideteksi satelit di seluruh Indonesia secara live, di-refresh tiap 30 menit dari API NASA FIRMS VIIRS. **Bukan dari Gemma 4.** Ini intelijen pasif (satelit) versus intelijen aktif kita (EdgeTriageReports yang di-submit user). Keduanya saling melengkapi untuk situational awareness, diakses lewat disaster-type picker terpadu yang sama.

View wildfire sudah ada di NusaSiaga sebelum pekerjaan Gemma 4 dimulai dan dipertahankan sepenuhnya — tidak ada komponennya yang dimodifikasi atau dihapus saat integrasi.

---

## 5. Kenapa kita memilih pilihan-pilihan ini

Keputusan arsitektural, kalau-kalau ada yang penasaran.

**Kenapa Gemma 4 bukan Gemma 3n.** Hackathon-nya spesifik tentang Gemma 4. Gemma 3n memang ada untuk on-device, tapi Gemma 4 punya varian on-device yang setara (E2B / E4B) plus varian 31B yang lebih besar untuk cloud reasoning, dan varian cloud-nya berbagi arsitektur dengan varian on-device. Kita dapat stack vertikal lengkap dari satu keluarga.

**Kenapa E2B untuk edge.** Ini varian Gemma 4 terkecil dengan multimodal native (gambar + audio + teks) dan jalan di sekitar 1,5 GB memori dengan kuantisasi INT4 di HP Android kelas menengah. E4B yang lebih besar akan kasih kualitas lebih bagus tapi makan lebih banyak memori dan baterai. Untuk demo kita butuh kecepatan dan reliabilitas.

**Kenapa 31B untuk cloud.** Ini flagship dense dalam keluarga Gemma 4. Alternatif 26B MoE lebih cepat tapi reasoning 31B lebih tajam, dan itu penting saat mensintesis 12+ laporan yang bisa saling bertentangan. Kita jalanin di 4-bit-quantization via Unsloth di setup 2× T4 Kaggle, hardware yang sama yang juri punya akses ke sana.

**Kenapa LiteRT di Android.** Google AI Edge LiteRT (sebelumnya TensorFlow Lite untuk LLM) adalah jalur deployment resmi untuk Gemma 4 on-device. Ada juga Special Tech LiteRT Prize tapi kita cuma bisa menang satu Special Tech prize, dan Cactus lebih cocok dengan cerita arsitektur kita.

**Kenapa synthesis di-pre-bake di dashboard, bukan panggil AI live.** Dua alasan. Pertama, juri yang klik URL live demo harus melihat hasilnya seketika, bukan nunggu menitan untuk model selesai. Kedua, JSON synthesis itu sendiri yang ingin kita ditampilkan untuk dievaluasi — kualitas reasoning model, clustering priority zone, validity flag — dan artefak itu statis, identik untuk setiap viewer. Live AI call cuma akan menambah varians tanpa menambah nilai.

**Kenapa dua repo, bukan satu monorepo.** Kecelakaan sejarah ditambah pemisahan praktis. Dashboard sudah jadi repo terpisah saat kita mulai gabungkan kerja. Daripada melawan git history, kita biarkan terpisah dan link keduanya di writeup. Jangka panjang mungkin kita merge; untuk hackathon, tidak worth churn-nya.

**Kenapa Vercel.** Free tier, deploy langsung dari GitHub, dukung Next.js 16 + server components secara native. Requirement Live Demo di aturan Kaggle adalah "URL atau file... bisa diakses publik, tanpa login atau paywall" — Vercel kasih itu dalam satu klik.

---

## 6. Walkthrough dashboard

Saat juri atau koordinator buka URL yang di-deploy, inilah yang mereka lihat:

**Di paling atas:** brand header "NusaSiaga · Gemma Rescue Grid" dengan subtitle "Wildfire monitoring · Offline-edge flood response · Powered by Gemma 4" dan badge "Offline-First Demo".

**Tepat di bawahnya:** satu disaster-type picker terpadu (kartu dropdown). Default ke "Flood" — skenario yang synthesis-nya sudah siap. Klik untuk expand jadi empat opsi:

- 🔥 **Wildfire** — Live NASA FIRMS satellite hotspots di Indonesia
- 🌊 **Flood** — Banjir Jakarta Pusat · 12 laporan, synthesis lengkap
- 🏚️ **Earthquake** — Simulasi gempa dangkal Cianjur · 15 laporan, synthesis pending
- ⚡ **Industrial Fire** — Banjir + kebakaran transformator di zona industri · 8 laporan, synthesis pending

Dan footer di dropdown yang menampilkan jenis bencana yang direncanakan (Volcanic, Tsunami, Landslide, Storm, Building Collapse) dengan pesan "Same Gemma 4 architecture · same JSON contract · just add a scenario file."

**Di bawah picker**, isi body berubah tergantung view mana yang aktif.

Untuk **Wildfire**, body menampilkan komponen NusaSiaga asli: hero "Live Disaster Intelligence", panel AI Hazard Analyzer bertema wildfire, peta hotspot Indonesia dengan marker FRP-weighted, statistik environmental intelligence (AQI, arah angin, estimasi CO₂), incident feed wildfire, panel demo readiness, dan kartu deskripsi arsitektur. Ini data satelit NASA FIRMS, di-refresh tiap 30 menit.

Untuk **Flood / Earthquake / Industrial Fire**, body menampilkan: block hero dengan tiga metrik (reports synthesized, severe count, people affected); kartu sample triage yang nampilin laporan paling severe dari skenario; peta Jakarta/Cianjur/zona-industri dengan marker yang di-color sesuai severity untuk setiap laporan; `CommandCenterSynthesis` lengkap di-render sebagai panel (bar distribusi severity, vulnerable groups, priority zones dengan hazard chips, recommended actions yang sudah di-rank, report validity flags, data confidence notes); grid statistik Operational Intelligence; daftar lengkap EdgeTriageReports sebagai kartu; dan kartu deskripsi arsitektur yang sama.

Untuk skenario yang synthesis-nya masih pending (B dan C sampai Hari 4), panel synthesis dan grid statistik degrade dengan baik ke kartu "synthesis pending" sementara sisanya (peta, hero, reports feed) tetap render penuh.

Aesthetic-nya dark operational — background slate, aksen sky/emerald/red/orange, typography besar dan jelas. Didesain untuk di-screenshot buat video.

---

## 7. Aplikasi Android, rencananya

Di-fork dari `google-ai-edge/gallery`, yang sudah mengimplementasi loading model LiteRT, konstruksi prompt multimodal, dan flow kamera capture. Kita customize:

- **Strip UI chat general-purpose dari gallery.** Ganti dengan satu screen capture foto satu-tombol.
- **Embed system prompt kita.** Disematkan sebagai Kotlin `const` string di `ai.grg.EDGE_SYSTEM_PROMPT`.
- **Pakai schema kita.** Output di-decode ke Kotlin data class `EdgeTriageReport` via kotlinx.serialization.
- **Tambahkan routing decision.** Setelah menerima EdgeTriageReport, app menjalankan `decideRouting()` dan menampilkan badge fast-lane atau deep-lane.

Empat file Kotlin drop-in tinggal di `android/app/src/main/kotlin/ai/grg/` di repo Python: `Schemas.kt`, `EdgeTriagePrompt.kt`, `Routing.kt`, dan `JsonExtraction.kt`. Mereka platform-agnostic dan plugin kotlinx.serialization adalah satu-satunya perubahan Gradle yang dibutuhkan.

**Yang sengaja TIDAK kita bangun:** login, akun, fitur multi-user, map view di dalam app, push notifications, background sync, port iOS. Tidak ada dari ini yang berdampak ke demo dan semuanya akan curi waktu.

---

## 8. Notebook Kaggle, apa yang dia lakukan

`notebook/gemma_rescue_grid.ipynb` — dibangun dari `build_notebook.py`, terstruktur sebagai 31 sel. Juri yang klik "Run all" jalan lewat:

1. Install dependencies (Unsloth, transformers pinned 5.5.0, pydantic)
2. Clone repo gemma-disaster-grid
3. Load Gemma 4 via `FastModel.from_pretrained` Unsloth (satu variabel kontrol size — E4B buat Colab, 31B buat Kaggle final)
4. Load prompt dan validator kita dari package `grg`
5. Load 12 EdgeTriageReports Scenario A
6. Jalankan synthesis prompt; stream reasoning trace `<|channel>thought` model plus JSON final
7. Validasi terhadap schema Pydantic `CommandCenterSynthesis` (dengan autotrim defense dan truncation repair)
8. Render dashboard operational-picture di notebook
9. Inspect system prompt edge-tier dan satu EdgeTriageReport sampel
10. Jalankan fungsi intelligent routing di setiap laporan; print tabel yang nunjukkin keputusan fast-lane vs deep-lane
11. Switch ke Scenario B atau C dengan ubah satu variabel

Notebook ini adalah artefak "proof of work" — engineering yang sebenarnya bisa juri jalankan.

---

## 9. Peta repository

### `github.com/listyantidewi1/gemma-disaster-grid`

Repo Python / Android / writeup.

```
docs/                          Arsitektur, integration brief, rencana tim ini
prompts/                       System prompt Gemma 4 (edge + cloud)
grg/                           Package Python: schemas, routing, JSON repair
data/synthesis_scenarios/      Tiga skenario buatan tangan (A banjir, B gempa, C kompleks)
notebook/                      Notebook Kaggle/Colab (dibuat via build_notebook.py)
android/                       Scaffold domain Kotlin untuk app Android
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

Kita lagi jalan jauh lebih cepat dari jadwal manapun yang masuk akal — pekerjaan yang awalnya dianggarkan untuk Hari 1 dan Hari 2 sebagian besar sudah selesai dalam jam-jam pertama Hari 1. **Rencana hari per hari di bawah ini adalah anggaran, bukan batas bawah.** Banyak item yang tertulis untuk "hari ini" atau "besok" sudah selesai. Baca ulang checklist sesuai urutan untuk tahu apa yang sebenarnya tersisa.

Yang penting: paruh kedua timeline (syuting video, polishing writeup, deploy ke Vercel, bikin Android app benar-benar jalan di HP) lebih makan waktu dan lebih unpredictable daripada paruh pertama. **Jangan asumsikan sisa proyek akan kompres dengan cara yang sama.**

---

## 11. Rencana hari per hari

Setiap hari punya rationale singkat yang menjelaskan *kenapa* hari ini kita kerjakan apa, diikuti checklist tugas datar. Siapa pun yang punya kapasitas ambil tugas berikutnya yang sudah tidak ter-block dan kerjakan. Tidak ada kolom kepemilikan — koordinasi di chat.

### Hari 1 — 13 Mei ✅ SELESAI

*Hari pondasi. Bangun kontrak data, prompt, skenario, dan verifikasi tier synthesis jalan di model yang lebih kecil sebelum commit ke model lebih besar di Kaggle.*

- [x] Scaffold repo, schemas, prompt, tiga skenario, logika routing
- [x] Notebook Kaggle/Colab jalan end-to-end di Gemma 4 E4B
- [x] Synthesis Scenario A diverifikasi: 5 priority zones, recommended actions berperingkat, validity flags
- [x] Integrasi NusaSiaga: unified disaster-type picker, view wildfire + flood/earthquake/industrial-fire
- [x] Scaffold domain Kotlin untuk Android
- [x] Writeup v0.5 (1573 kata; akan dipangkas ke 1500 di Hari 6)
- [x] Rencana tim dwibahasa (dokumen ini)

### Hari 2 — 14 Mei (hari ini)

*Hari set-up-semua-yang-fisik. Android Studio lagi download SDK 5+ GB; deploy Vercel butuh env var; HP test butuh USB debugging diaktifkan. Tidak satupun dari ini sulit secara intelektual, tapi semuanya harus terjadi sebelum Hari 3-5.*

- [ ] Fork `google-ai-edge/gallery` ke akun GitHub pribadi
- [ ] Clone fork di Android Studio ke `D:\Projects\hackathon\gallery\Android\src`
- [ ] Gradle sync pertama (~15-30 menit — biarkan jalan, jangan cancel)
- [ ] Sambungkan HP test via USB; aktifkan USB debugging dari Developer Options
- [ ] Jalankan gallery (tanpa modifikasi) di HP; pastikan salah satu LLM tile bisa load model (model apa saja — kita cuma butuh tahu inference jalan)
- [ ] Paste isi `synthesis_cache_scenario_a.txt` (cache Colab) ke chat supaya kita bisa identifikasi scenario apa isinya dan integrasikan synthesis JSON itu ke dashboard
- [ ] `git pull` `nusasiaga` main untuk dapat semua pekerjaan unified-picker dan scenario
- [ ] Jalankan `npm install && npm run dev` lokal di dashboard untuk pastikan build sehat di hasil merge
- [ ] Deploy NusaSiaga ke Vercel untuk URL Live Demo (free tier cukup; sign up pakai akun GitHub yang punya repo dashboard)
- [ ] Catat URL Vercel di README supaya kita punya satu link Live Demo kanonik
- [ ] Set `NASA_FIRMS_MAP_KEY` di pengaturan project Vercel (Settings → Environment Variables) supaya data live wildfire view jalan

### Hari 3 — 15 Mei

*Hari customization Android plus polishing dashboard. File domain Kotlin sudah ditulis; kita tinggal drop, wire inference loop pakai system prompt kita, dan ganti chat free-form gallery dengan flow capture satu-tombol.*

- [ ] Drop empat file Kotlin `ai.grg.*` ke fork gallery di path package yang benar (mis. `app/src/main/kotlin/ai/grg/`)
- [ ] Tambahkan `kotlinx-serialization-json:1.6.x` ke dependencies dan plugin `org.jetbrains.kotlin.plugin.serialization` ke `app/build.gradle.kts`
- [ ] Ganti chat flow default gallery dengan single-button photo-capture → triage flow (ini perubahan UI besar; flow camera permission yang ada bisa digunakan ulang)
- [ ] Inject system prompt kita sebagai konten user-turn pertama saat panggil model
- [ ] Decode output model dengan `parseEdgeReport()` dan render `EdgeTriageReport` hasilnya sebagai result card dengan severity badge, hazards list, immediate action, dan routing badge
- [ ] Pastikan Gemma 4 E2B berhasil di-download dari model picker gallery dan jalan di dalam app yang sudah dimodifikasi
- [ ] Update teks Hazard Analyzer di dashboard view wildfire: "Local Gemma analysis" → "Local Gemma 4 analysis" (polishing kecil)
- [ ] Tangkap screenshot kedua view (Wildfire dan Flood) dari deployment Vercel untuk editor video
- [ ] Refine storyboard video di `writeup/video_script_v1.md` dengan visual unified-picker aktual yang sekarang sudah ada

### Hari 4 — 16 Mei (kuota mingguan Kaggle reset di awal hari ini)

*Hari synthesis production-quality. Kita pindah dari Colab E4B (development) ke Kaggle 31B (final submission). Scenario B dan C saat ini punya kartu "pending" di dashboard; hari ini kita ganti dengan synthesis JSON nyata dari model yang lebih besar.*

- [ ] Buka notebook di Kaggle (bukan Colab), jalankan di 2× T4 pakai `unsloth/gemma-4-31B-it`
- [ ] Jalankan synthesis untuk Scenario A (validasi output 31B paling tidak sama bagusnya dengan baseline E4B)
- [ ] Jalankan synthesis untuk Scenario B
- [ ] Jalankan synthesis untuk Scenario C
- [ ] Save setiap output sebagai modul TypeScript `synthesis-scenario-{a,b,c}.ts` masing-masing
- [ ] Drop ke `nusasiaga/src/lib/`, update `scenarios.ts` untuk import object baru, ubah B dan C dari `synthesisStatus: "pending"` ke `"generated"`
- [ ] Push ke `nusasiaga` main; Vercel auto-rebuild
- [ ] Ambil screenshot baru yang nunjukkin ketiga disaster type dengan dashboard operasional lengkap (tidak ada lagi kartu "pending")
- [ ] Mulai syuting footage HP kalau UI Android sudah siap — responden ambil foto, triage muncul di result card

### Hari 5 — 17 Mei

*Hari produksi video. Semua yang teknis seharusnya sudah beres malam ini. Dari sini tinggal editing, voicing, musik, dan polishing.*

- [ ] Syuting video 3 menit. Adegan yang direkomendasikan:
  1. B-roll bencana (footage gempa Cianjur atau banjir Jakarta; lisensi CC0 atau fair-use, max 5 detik each)
  2. HP di tangan, toggle mode pesawat terlihat, ambil foto
  3. Result card EdgeTriageReport memenuhi layar HP
  4. Dashboard di-scroll, nge-switch antara Wildfire / Flood / Earthquake / Industrial Fire
  5. Beat arsitektur (E2B → 31B → dashboard, dinarrasikan)
- [ ] Edit. Tambah voice-over (English; native atau near-native, tone tenang/serius). Tambah music bed (YouTube Audio Library atau track CC-attribution yang cocok untuk tone serius-tapi-hopeful)
- [ ] Upload ke YouTube sebagai unlisted. Verifikasi link bisa diakses tanpa login. Save link untuk writeup
- [ ] Opsional: Unsloth LoRA fine-tune E2B dengan gambar bencana yang dikurasi. Kalau fine-tune materialitas memperbaiki kalibrasi severity, dokumentasikan; kalau tidak, drop
- [ ] Opsional: tambah scenario user-report wildfire (kebakaran lahan gambut Riau, ~10 laporan buatan tangan). Akan bikin tab wildfire dashboard nampilkan baik data NASA FIRMS DAN synthesis user-report

### Hari 6 — 18 Mei · HARI SUBMISSION

*Polishing, dry run, submit. Jangan ship code di hari ini kecuali ada yang rusak.*

- [ ] Pangkas writeup dari 1573 jadi ≤1500 kata. Pangkas dari bagian "Technical Challenges" dulu; pertahankan bagian impact dan arsitektur
- [ ] Tambahkan URL Vercel, URL YouTube, URL GitHub (kedua repo), dan link file APK ke writeup
- [ ] Pilih cover image — foto bersih dashboard dengan salah satu scenario terbuka adalah image tunggal yang paling kuat
- [ ] Dry run: buka form Kaggle writeup di browser, paste semua, preview, tapi **jangan submit dulu**
- [ ] Double-check pemilihan track: **Impact Track → Global Resilience**
- [ ] Submit minimal 6 jam sebelum deadline. **Deadline: 11:59 PM UTC, Senin 18 Mei 2026.** Itu = **06:59 WIB, Selasa 19 Mei 2026.**

---

## 12. Deliverables submission (sesuai aturan Kaggle)

Kaggle Writeup adalah artefak payung. Yang lain attach ke sana. Kita harus include semua ini:

1. **Kaggle Writeup ≤ 1500 kata.** Penjelasan gaya paper- atau blog-style tentang proyek. Arsitektur, untuk apa kita pakai Gemma 4, technical challenges, kenapa pilihan kita yang tepat. Ini "proof of work" — juri baca untuk verifikasi video tidak di-fake. Submission lebih dari 1500 kata mungkin kena penalty.
2. **Video YouTube ≤ 3 menit.** Di-publish ke YouTube (unlisted oke), bisa dilihat publik tanpa login. Deliverable paling penting — 70% dari nilai.
3. **Public Code Repository.** Kedua GitHub repo kita (`gemma-disaster-grid` dan `nusasiaga`) terdaftar di bagian Project Links di writeup. Code harus bisa dibaca publik, tanpa login atau paywall.
4. **Live Demo URL.** Deployment Vercel. Bikin juri bisa rasakan proyek langsung tanpa jalanin apa pun. Harus bisa diakses publik tanpa login.
5. **Media Gallery termasuk cover image.** Cover image wajib untuk bisa submit writeup. Kita pilih Hari 6.
6. **(Opsional) Lampiran file APK.** App Android di-export sebagai APK yang bisa di-install, di-attach sebagai file ke writeup. Bikin juri bisa install di HP Android mereka sendiri kalau mau.

Kita submit di kategori **Impact Track / Global Resilience**. Kita eligible untuk Cactus Prize di Special Tech track secara bersamaan — aturannya membolehkan tumpuk Main + Special Tech, dan writeup kita harus secara eksplisit menyebutkan eligibility Cactus di bagian arsitektur.

---

## 13. Norma kerja

Proyek dua orang, satu produk. Makin sering kita sync, makin sedikit rework.

- **`git pull` sebelum mulai kerja.** Checkout yang ketinggalan menyebabkan konflik merge yang buang waktu.
- **Push commit kecil-kecil, push sering.** Satu commit untuk satu perubahan logis. Lebih mudah di-review, lebih mudah di-revert.
- **Kalau ubah file yang dipakai bersama (schemas, prompts, scenarios, rencana tim sendiri), kasih tahu di chat atau di pesan commit** supaya yang lain tahu harus pull sebelum mulai perubahan selanjutnya.
- **Jangan force-push ke main.** Kalau perlu re-write history, ngobrol dulu sama yang lain. Tidak ada skenario dalam timeline enam hari kita di mana force-push adalah jawaban yang benar.
- **Semua keputusan branding atau arsitektur major didokumentasikan di file ini.** Kalau bikin keputusan yang mempengaruhi cara kita present proyek, update dokumen ini dan push.
- **Satu orang pada satu waktu untuk refactor komponen besar.** Polishing kosmetik (CSS, edit copy, fix kecil) paralel oke.
- **Kalau tidak setuju dengan sesuatu di sini**, angkat di chat. Jangan push around. Tujuan single source of truth adalah supaya tetap jadi single source of truth.
- **Kalau ketemu merge conflict yang tidak tahu cara resolve**, jangan paksa resolution. Ping yang lain, lihat sama-sama. Lima menit percakapan lebih bagus dari satu jam merge yang buruk.

---

## 14. Risiko kritis dan mitigasi

| Risiko | Likelihood | Tindakan |
|---|---|---|
| **Download Gemma 4 E2B di Android gagal** karena gallery butuh HuggingFace OAuth dan kita belum set up developer app credentials | Medium | Pertama, coba model picker default gallery tanpa OAuth — banyak model yang public. Kalau cuma E2B yang butuh OAuth, set up HF developer app sesuai `DEVELOPMENT.md` gallery dan update `ProjectConfig.kt`. Worst case: pakai model yang lebih kecil yang sudah pre-bundled di demo, tulis di writeup framing-nya "arsitektur sudah terbukti; bundle model menyusul pasca-hackathon" |
| **Run Kaggle 31B di Hari 4 gagal** karena masalah memori, generasi lambat, atau error notebook | Low | Fallback ke output E4B dari Colab (kita sudah punya Scenario A dari Hari 1) dan secara eksplisit cantumkan di writeup bahwa demo pakai E4B karena keterbatasan compute. Cerita arsitektur sama saja regardless varian Gemma 4 mana yang jalan |
| **Deploy Vercel gagal karena API key FIRMS** | Low | Loader dashboard-hotspots view wildfire punya fallback chain 3-tier (FIRMS live → output notebook JSON → demo data). Bahkan tanpa API key di-set, page tetap render data hotspot demo. Kalau Vercel berhasil deploy sama sekali, view wildfire akan jalan |
| **Video tidak selesai di Hari 5** karena syuting + editing lebih lama dari yang diharapkan | Medium | Potong jadi versi 90-detik yang fokus ke satu beat sisi dashboard (panel synthesis) plus satu beat sisi HP (mode pesawat + ambil foto + result card). Pakai banyak B-roll dan voice-over minimal |
| **Writeup melampaui 1500 kata** | Low | Pangkas dari Section 5 (Technical Challenges) dulu — drop contoh-contoh spesifik dan pertahankan headline. Pertahankan bagian impact + arsitektur dengan biaya apapun |
| **HP tidak punya cukup RAM / storage untuk jalanin E2B** | Low | E2B butuh sekitar 2,5 GB RAM kosong. Kalau HP test struggle, dokumentasikan hardware yang direkomendasikan di writeup; rekam video demo di HP apapun yang JALAN; sebutkan user bisa menemukan list "Recommended Android device" di `android/README.md` kita |
| **Kedua anggota tim kelelahan di Hari 6** | High (selalu) | Dry run submission dimulai satu hari penuh lebih awal. Jangan tulis code baru di Hari 6 kecuali ada yang on fire. Hari 6 untuk polishing, bukan fitur |

---

## 15. Quick reference

- **URL Hackathon:** <https://www.kaggle.com/competitions/gemma-4-good-hackathon>
- **Code repo (Python/Android/writeup):** <https://github.com/listyantidewi1/gemma-disaster-grid>
- **Code repo (dashboard):** <https://github.com/NoesaaDecodes/nusasiaga>
- **URL Live Demo:** (ditambahkan Hari 2 setelah deploy Vercel)
- **URL Video:** (ditambahkan Hari 5 setelah upload)
- **Notebook starter Kaggle (referensi saja):** <https://www.kaggle.com/code/danielhanchen/gemma4-31b-unsloth>
- **AI Edge Gallery (app Android yang kita fork):** <https://github.com/google-ai-edge/gallery>
- **Bobot Gemma 4 E2B LiteRT di Hugging Face:** <https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm>
- **Bobot Gemma 4 31B Unsloth di Hugging Face:** <https://huggingface.co/unsloth/gemma-4-31B-it>

---

## 16. Kontributor

- listyantidewi@gmail.com
- noesaaerp@gmail.com

Yuk kita ship.
