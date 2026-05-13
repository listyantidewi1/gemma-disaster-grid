# NusaSiaga · Gemma Rescue Grid — Rencana Tim (Bahasa Indonesia)

> *Versi Inggris: [`TEAM_PLAN.en.md`](TEAM_PLAN.en.md)*

Satu sumber acuan utama bagi tim selama kita mengerjakan submission untuk Kaggle Gemma 4 Good Hackathon. **Baca dokumen ini sebelum melakukan `push` ke salah satu repo.**

## 1. Apa yang sedang kita bangun

**NusaSiaga · Gemma Rescue Grid** adalah platform intelijen bencana *offline-first* yang ditenagai oleh Gemma 4. Sistem ini terdiri dari tiga tier yang berbagi satu kontrak JSON dari ujung ke ujung:

```
┌─────────────────────────────┐    ┌─────────────────────────────┐    ┌─────────────────────────────┐
│  HP (offline, LiteRT)       │ →  │  PUSAT KOMANDO (Kaggle)     │ →  │  DASHBOARD (Vercel)         │
│  Gemma 4 E2B · ~1.5GB Q4    │    │  Gemma 4 31B · Unsloth 4-bit│    │  Next.js · React Leaflet   │
│  Foto + suara/teks → JSON   │    │  Sintesis lintas-laporan    │    │  Gambaran operasional      │
│  EdgeTriageReport           │    │  CommandCenterSynthesis     │    │  Data sama, URL publik     │
└─────────────────────────────┘    └─────────────────────────────┘    └─────────────────────────────┘
        Responden lapangan              Reasoning lintas laporan          Koordinator ops / juri
```

Keluarga Gemma 4 yang sama di setiap tingkat. Open weights Apache 2.0 dari atas ke bawah.

## 2. Target hackathon

- **Kompetisi:** [The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) di Kaggle
- **Deadline submission final:** Senin, 18 Mei 2026 · 11:59 PM UTC (= Selasa, 19 Mei 2026 · 06:59 WIB)
- **Track utama:** Impact / Global Resilience ($10.000)
- **Track tambahan (dapat ditumpuk):** Special Tech / Cactus Prize ($10.000) — "aplikasi mobile/wearable lokal-first terbaik yang secara cerdas merutekan tugas antar model"
- **Ambisi tertinggi:** Main Track Prize ($10.000 – $50.000)

Bobot penilaian: 40 poin Impact & Vision · 30 poin Video Pitch & Storytelling · 30 poin Technical Depth. **Video memegang sekitar 70% dari total nilai.**

## 3. Peran & tanggung jawab

| Orang | Tanggung jawab | Repo yang dia push |
|---|---|---|
| **Listyantidewi (lead)** | App Android · Notebook Kaggle · Python schemas · Kotlin domain · Writeup · Koordinasi video | `gemma-disaster-grid` · `nusasiaga` (hanya bersifat tambahan) |
| **Noesaa Decodes** | Dashboard NusaSiaga (track wildfire / NASA FIRMS) · Deployment Vercel · Polishing tampilan tab Flood | `nusasiaga` (pemilik utama) |
| **Keputusan bersama** | Branding · skrip video · arah writeup · isi submission | Diskusi dulu sebelum push |

## 4. Peta repository

### `github.com/listyantidewi1/gemma-disaster-grid`

Repo Python / Android / writeup. Pemilik: Listyantidewi.

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

Repo dashboard Next.js. Dimiliki bersama. Noesaa pemilik utama; Listyantidewi push pekerjaan tambahan terkait flood/scenario.

```
src/app/                       Next.js App Router (page.tsx, api/firms, api/analyze)
src/components/shared/         AppHeader, Metric
src/features/dashboard/        UnifiedDashboard + DashboardViewPicker
src/features/wildfire/         WildfireView (composing komponen NASA FIRMS)
src/features/flood/            Tab Flood/Earthquake/Industrial Fire + komponen-komponennya
src/features/maps/             Map NASA FIRMS (view wildfire)
src/features/incidents/        Incident feed wildfire (dari MVP awal, dipertahankan)
src/features/environment/      Statistik environment wildfire (dari MVP awal, dipertahankan)
src/features/hazard-analysis/  AI Hazard Analyzer wildfire (dari MVP awal, dipertahankan)
src/lib/                       Skenario, tipe, output synthesis, loader FIRMS
notebooks/                     Notebook pipeline data FIRMS punya Noesaa
outputs/                       Output data FIRMS
```

## 5. Rencana hari per hari

Tanggal mengasumsikan *kickoff* tanggal 2026-05-13. Sesuaikan kalau pekerjaan jadi lebih cepat (dan memang lebih cepat).

### Hari 1 — 13 Mei ✅ SELESAI

- Scaffold repo, schemas, prompt, tiga skenario, logika routing
- Notebook Kaggle/Colab jalan end-to-end di Gemma 4 E4B
- Synthesis Scenario A diverifikasi: 5 priority zones, recommended actions berperingkat, validity flags
- Integrasi NusaSiaga: dashboard dual-track, scenario picker
- Scaffold domain Kotlin untuk Android
- Writeup v0.5 (1573 kata; akan dipangkas ke 1500 di Hari 6)

### Hari 2 — 14 Mei (hari ini)

**Listyantidewi:**
- Install Android Studio (selesai) ✅
- Fork `google-ai-edge/gallery` ke `listyantidewi1/gallery`
- Clone di Android Studio ke `D:\Projects\hackathon\gallery\Android\src`
- Tunggu Gradle sync pertama (~15-30 menit)
- Sambungkan HP test via USB, aktifkan USB debugging
- Jalankan gallery (tanpa modifikasi) di HP; pastikan salah satu LLM tile bisa load model
- Paste isi `synthesis_cache_scenario_a.txt` (cache Colab) ke chat supaya kita bisa identifikasi scenario mana isinya dan integrasikan ke dashboard

**Noesaa:**
- `git pull` `nusasiaga` main untuk dapat semua pekerjaan dual-track dan scenario flood
- Jalankan `npm install && npm run dev` lokal untuk pastikan build sehat di hasil merge
- Deploy NusaSiaga ke Vercel untuk URL Live Demo (free tier cukup)
- Tulis URL Vercel di README supaya kita punya satu link Live Demo kanonik
- Pastikan env var NASA FIRMS (`NASA_FIRMS_MAP_KEY`) sudah diset di pengaturan project Vercel

### Hari 3 — 15 Mei

**Listyantidewi:**
- Drop empat file Kotlin `ai.grg.*` ke fork gallery di path package yang benar
- Tambahkan `kotlinx-serialization-json` + plugin Gradle serialization ke `app/build.gradle.kts`
- Ganti chat flow default gallery dengan single-button photo-capture → triage flow
- Render `EdgeTriageReport` hasilnya sebagai result card
- Pastikan Gemma 4 E2B berhasil di-download dan jalan di dalam app yang sudah dimodifikasi

**Noesaa:**
- Poles tampilan dashboard (tab wildfire masih ada teks "Gemma 3n" di Hazard Analyzer — update ke Gemma 4)
- Tangkap screenshot kedua view dari Vercel deployment untuk editor video
- Bantu nyusun storyboard video (`writeup/video_script_v1.md` di `gemma-disaster-grid`)

### Hari 4 — 16 Mei (kuota Kaggle reset di hari ini)

**Listyantidewi:**
- Buka notebook di Kaggle (bukan Colab), jalankan di 2× T4 pakai `unsloth/gemma-4-31B-it`
- Generate synthesis baru untuk Scenario A, B, C
- Save setiap output sebagai file `synthesis-scenario-{a,b,c}.ts` masing-masing
- Drop ke `nusasiaga/src/lib/`, update `scenarios.ts` untuk ubah B dan C dari "pending" ke "generated"
- Push ke `nusasiaga` main; Vercel auto-rebuild

**Noesaa:**
- Setelah push Hari 4 masuk, ambil screenshot baru yang nunjukkin ketiga disaster type dengan dashboard operasional lengkap
- Bantu syuting footage HP — responden ambil foto, triage muncul, dashboard ter-update

### Hari 5 — 17 Mei

- Syuting video 3 menit. Adegan:
  1. B-roll bencana (footage gempa Cianjur atau banjir Jakarta, lisensi CC0 atau fair use)
  2. HP di tangan, toggle mode pesawat, ambil foto
  3. Result card EdgeTriageReport muncul di HP
  4. Dashboard nge-switch antara Wildfire / Flood / Earthquake / Industrial Fire
  5. Beat arsitektur
- Edit, voice-over, musik. Upload ke YouTube unlisted; share link di writeup.
- Opsional: Unsloth LoRA fine-tune E2B dengan gambar bencana yang dikurasi (Listyantidewi)
- Opsional: tambah scenario user-report wildfire (Listyantidewi atau Noesaa)

### Hari 6 — 18 Mei (HARI SUBMISSION)

- Pangkas writeup dari 1573 jadi ≤1500 kata
- Tambahkan URL Vercel, URL YouTube, URL GitHub, link file APK
- Cover image: foto bersih dashboard dengan salah satu scenario terbuka
- Dry run: buka form Kaggle writeup, paste semua, preview, lalu submit
- **Deadline: 11:59 PM UTC, Senin 18 Mei 2026** = 06:59 WIB, Selasa 19 Mei 2026.
- **Jangan submit di menit-menit terakhir.** Targetkan 6 jam sebelum deadline.

## 6. Deliverables submission (sesuai aturan Kaggle)

Kita harus attach semua ini ke Writeup:

1. **Kaggle Writeup** ≤ 1500 kata — `writeup/kaggle_writeup_v0.5.md` (dipangkas Hari 6)
2. **Video YouTube** ≤ 3 menit — disyuting Hari 5
3. **Public Code Repository** — kedua repo dicantumkan: `gemma-disaster-grid` dan `nusasiaga`
4. **Live Demo URL** — NusaSiaga di Vercel
5. **Media Gallery** termasuk cover image — dipilih Hari 6
6. **Opsional: file APK** sebagai attachment — di-build Hari 5 setelah UI Android jalan

Pilih kategori **Impact Track / Global Resilience** saat bikin Writeup.

## 7. Norma komunikasi

- **`git pull` sebelum mulai kerja.** Checkout yang ketinggalan menyebabkan merge bermasalah.
- **Push commit kecil-kecil, push sering.** Satu commit untuk satu perubahan logis.
- **Kalau ubah file yang dipakai bersama (schemas, prompts, scenarios), kasih tahu di chat atau commit message** supaya yang lain tahu harus pull.
- **Jangan force-push ke main.** Kalau perlu re-write history, ngobrol dulu sama yang lain.
- **Semua keputusan branding/arsitektur major dicatat di dokumen ini.** Update file ini setiap ada perubahan keputusan.
- **Satu orang di dashboard pada satu waktu** untuk refactor komponen besar. Polishing paralel masih oke.

## 8. Risiko kritis dan apa yang kita lakukan

| Risiko | Tindakan |
|---|---|
| Download Gemma 4 E2B di Android gagal (terbentur HuggingFace OAuth) | Pakai model yang lebih kecil yang sudah pre-downloaded di gallery untuk demo flow; di writeup framing-nya "arsitektur sudah terbukti, bundle model menyusul" |
| Run Kaggle 31B di Hari 4 gagal | Fallback ke output E4B dari Colab (kita sudah punya Scenario A) dan cantumkan di writeup |
| Deploy Vercel gagal karena API key FIRMS | Set env var-nya; kalau masih bermasalah, set view wildfire ke fallback notebook-JSON (sudah diimplementasi) |
| Video tidak selesai di Hari 5 | Potong jadi versi 90-detik yang fokus ke Flood tab synthesis + shot HP airplane-mode |
| Writeup melampaui 1500 kata | Pangkas contoh-contoh di Section 5 (Technical Challenges); pertahankan impact + arsitektur |

## 9. Quick reference

- **URL Hackathon:** <https://www.kaggle.com/competitions/gemma-4-good-hackathon>
- **Code repo (Python/Android/writeup):** <https://github.com/listyantidewi1/gemma-disaster-grid>
- **Code repo (dashboard):** <https://github.com/NoesaaDecodes/nusasiaga>
- **URL Live Demo:** (ditambahkan Hari 2 setelah Noesaa deploy ke Vercel)
- **URL Video:** (ditambahkan Hari 5 setelah upload)

## 10. Pendiri

- **Listyantidewi** — listyantidewi@gmail.com — lead, mobile + on-device ML
- **Noesaa Decodes** — noesaaerp@gmail.com — dashboard, pipeline data NASA FIRMS

Yuk kita ship.
