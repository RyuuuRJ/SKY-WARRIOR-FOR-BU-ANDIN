# SKY WARRIOR

Game pesawat tempur 2D browser untuk hadiah Special Teacher's Day 2026 untuk Bu Andin.

## Jalankan

1. Buka folder proyek di Visual Studio Code.
2. Instal ekstensi Live Server bila belum tersedia.
3. Klik kanan `index.html`, lalu pilih **Open with Live Server**.
4. Atau jalankan server lokal:

```powershell
py -m http.server 5500
```

Lalu buka `http://localhost:5500`.

## Kontrol

- **PC:** WASD atau tombol panah untuk bergerak.
- **Tembak:** tombol Spasi atau tembakan otomatis.
- **Mouse:** tekan dan seret untuk menggerakkan pesawat.
- **HP:** sentuh layar atau seret jari untuk menggerakkan pesawat. Tembakan aktif otomatis.

## Publikasi

### GitHub Pages

Workflow `.github/workflows/pages.yml` menerbitkan situs secara otomatis setiap kali ada perubahan ke branch `main` atau `master`.

1. Buat repository GitHub baru, sebaiknya **Public**, lalu unggah seluruh isi folder proyek termasuk folder tersembunyi `.github`.
2. Pada repository, buka **Settings > Pages** dan pilih **GitHub Actions** sebagai sumber deployment bila belum terpilih.
3. Buka tab **Actions** dan tunggu workflow **Deploy SKY WARRIOR to GitHub Pages** selesai.
4. URL permanen situs akan tampil pada **Settings > Pages** atau hasil workflow; formatnya `https://<nama-akun>.github.io/<nama-repository>/`.

Setelah terbit, URL GitHub Pages tidak memerlukan laptop/server ini untuk tetap menyala. Ketersediaan tetap mengikuti layanan dan kebijakan GitHub.

### Netlify

1. Buka Netlify dan pilih **Add new project > Deploy manually**.
2. Upload folder proyek atau hubungkan repository GitHub.
3. Publish directory ditetapkan ke folder root proyek.

Tidak diperlukan backend, package manager, atau proses build. Semua grafik dan suara asli dibuat langsung dengan Canvas dan Web Audio.
