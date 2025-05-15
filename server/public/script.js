const form = document.getElementById("form");

// Fungsi untuk format kapitalisasi
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Fungsi untuk menampilkan sapaan
function tampilkanSapaan() {
  const params = new URLSearchParams(window.location.search);
  const namaParam = params.get("to");

  if (namaParam) {
    const namaFormatted = capitalizeWords(namaParam.replace(/_/g, ' '));
    
    document.getElementById("sapaan").innerHTML = `<h3 style="color: white;">Yth. Bapak/Ibu ${namaFormatted}</h3>`;
    
    const inputNama = document.getElementById("nama");
    if (inputNama) {
      inputNama.value = namaFormatted;
    }
  }
}

// Fungsi untuk menonaktifkan form jika waktu sudah lewat
function cekWaktu() {
  const sekarang = new Date();
  // Tentukan waktu batas (24 Mei 2025 jam 17:00)
  const batasWaktu = new Date('2025-05-24T17:00:00');

  if (sekarang > batasWaktu) {
    // Jika sudah lewat, nonaktifkan form
    form.querySelectorAll('input, select, button, textarea').forEach(element => {
      element.disabled = true;
    });
    document.getElementById("hasil").innerText = "Form sudah tertutup.";
  }
}

// Fungsi untuk membuat ID unik jika tidak tersedia dari server
function generateUniqueId() {
  return 'ID' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Konfigurasi countdown
document.addEventListener('DOMContentLoaded', function() {
  // Kode yang sudah ada di DOMContentLoaded
  cekWaktu();
  tampilkanSapaan();
  
  // Konfigurasi countdown
  simplyCountdown('.simply-countdown', {
    year: 2025, // required
    month: 5, // required
    day: 24, // required
    hours: 8, // Default is 0 [0-23] integer
    words: { //words displayed into the countdown
      days: { singular: 'hari', plural: 'hari' },
      hours: { singular: 'jam', plural: 'jam' },
      minutes: { singular: 'menit', plural: 'menit' },
      seconds: { singular: 'detik', plural: 'detik' }
    },
  });
  
  // Konfigurasi offcanvas
  const stickyTop = document.querySelector('.sticky-top');
  const offcanvas = document.querySelector('.offcanvas');

  offcanvas.addEventListener('show.bs.offcanvas', function () {
    stickyTop.style.overflow = 'visible';
  });

  offcanvas.addEventListener('hidden.bs.offcanvas', function () {
    stickyTop.style.overflow = 'hidden';
  });
  
  // Konfigurasi audio
  const rootElement = document.querySelector(":root");
  const audioIconWrapper = document.querySelector('.audio-icon-wrapper');
  const audioIcon = document.querySelector('.audio-icon-wrapper i');
  const song = document.querySelector('#song');
  let isPlaying = false;

  function disableScroll() {
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    window.onscroll = function () {
      window.scrollTo(scrollTop, scrollLeft);
    }

    rootElement.style.scrollBehavior = 'auto';
  }

  function enableScroll() {
    window.onscroll = function () { }
    rootElement.style.scrollBehavior = 'smooth';
    // localStorage.setItem('opened', 'true');
    playAudio();
  }

  function playAudio() {
    song.volume = 0.1;
    audioIconWrapper.style.display = 'flex';
    song.play();
    isPlaying = true;
  }

  audioIconWrapper.onclick = function () {
    if (isPlaying) {
      song.pause();
      audioIcon.classList.remove('bi-disc');
      audioIcon.classList.add('bi-pause-circle');
    } else {
      song.play();
      audioIcon.classList.add('bi-disc');
      audioIcon.classList.remove('bi-pause-circle');
    }

    isPlaying = !isPlaying;
  }

  // Panggil disableScroll saat halaman dimuat
  disableScroll();
  
  // Tambahkan event listener untuk tombol "Lihat Undangan"
  document.querySelector('.hero a.btn').addEventListener('click', enableScroll);
  
  // Konfigurasi URL parameter untuk nama tamu
  const urlParams = new URLSearchParams(window.location.search);
  const nama = urlParams.get('n') || '';
  const pronoun = urlParams.get('p') || 'Bapak/Ibu/Saudara/i';
  const namaContainer = document.querySelector('.hero h4 span');
  if (namaContainer) {
    namaContainer.innerText = `${pronoun} ${nama},`.replace(/ ,$/, ',');
  }

  const namaInput = document.querySelector('#nama');
  if (namaInput && nama) {
    namaInput.value = nama;
  }
  
  // Event listener untuk form dengan ID my-form (yang ada di script terakhir)
  const myForm = document.getElementById('my-form');
  if (myForm) {
    myForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = new FormData(myForm);
      const action = e.target.action;
      fetch(action, {
        method: 'POST',
        body: data,
      })
        .then(() => {
          alert("Konfirmasi kehadiran berhasil terkirim!");
        })
    });
  }
  
  // Kode yang sudah ada untuk form RSVP
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama = document.getElementById("nama").value;
    const pesan = document.getElementById("pesan").value;
    const kehadiran = document.getElementById("kehadiran").value;

    if (!nama || !pesan || !kehadiran) {
      alert("Harap lengkapi semua field.");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerText = "Mengirim...";

    try {
      const response = await fetch("/submit-rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          nama, 
          pesan, 
          kehadiran,
          timestamp: new Date().toISOString()
        })
      });

      let idTamu, docId;
      
      // Handle kasus ketika response tidak berhasil
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Tangani respons dengan JSON yang valid
      try {
        const result = await response.json();
        console.log("Server response:", result);
        
        // Pastikan ID ada dalam respons
        idTamu = result.idTamu || generateUniqueId();
        docId = result.docId || generateUniqueId();
        
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        
        // Jika respons tidak berisi JSON valid, gunakan ID buatan lokal
        idTamu = generateUniqueId();
        docId = generateUniqueId();
      }

      // Tampilkan hasil konfirmasi
      document.getElementById("hasil").innerHTML = `
        <p>Terima kasih atas konfirmasinya, ${nama}!</p>
        <p>ID: <span id="idTamuText">${idTamu}</span></p>
      `;

      if (kehadiran === "Hadir") {
        const qrText = `${idTamu}`;
        QRCode.toDataURL(qrText, function (err, url) {        
          if (err) {
            console.error("QR Code generation error:", err);
            return;
          }

          document.getElementById("qrcode").innerHTML = `
            <div id="qrcodeContainer" style="border: 1px solid #ddd; padding: 15px; display: inline-block; background: white;">
              <p class="qrcode-label" style="font-weight: bold; margin-bottom: 10px; text-align: center; color: black;">ID Tamu: ${idTamu}</p>
              <img src="${url}" alt="QR Code ID Tamu" />
            </div>
          `;

          document.getElementById("downloadLink").innerHTML = `
            <p>Silahkan unduh QR Code dibawah untuk datang ke acara resepsi</p>
            <a href="#" id="downloadQRButton"><button>Unduh QR Code</button></a>
          `;

          document.getElementById("downloadQRButton").addEventListener("click", () => {
            html2canvas(document.getElementById("qrcodeContainer"), {
              backgroundColor: "white",
              logging: true,
              useCORS: true,
              scale: 2 // Meningkatkan kualitas gambar
            }).then(function(canvas) {
              const dataUrl = canvas.toDataURL("image/png");
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = `qrcode_with_id_${idTamu}.png`;
              link.click();
            });
          });
        });
      } else {
        document.getElementById("qrcode").innerHTML = "<p>Tidak perlu QR Code karena Anda memilih Tidak Hadir.</p>";
        document.getElementById("downloadLink").innerHTML = "";
      }

      // Reset form
      form.reset();

    } catch (error) {
      console.error("Error kirim data:", error);
      document.getElementById("hasil").innerHTML = `
        <p class="error">Terjadi kesalahan: ${error.message}</p>
        <p>Data Anda tetap sudah tersimpan secara lokal.</p>
      `;
      
      // Generate ID lokal jika server error
      const localIdTamu = generateUniqueId();
      
      if (kehadiran === "Hadir") {
        QRCode.toDataURL(localIdTamu, function (err, url) {        
          if (err) return console.error(err);
          
          document.getElementById("qrcode").innerHTML = `
            <div id="qrcodeContainer" style="border: 1px solid #ddd; padding: 15px; display: inline-block; background: white;">
              <p class="qrcode-label" style="font-weight: bold; margin-bottom: 10px; text-align: center; color: black;">ID Tamu (Lokal): ${localIdTamu}</p>
              <img src="${url}" alt="QR Code ID Tamu" />
            </div>
          `;
          
          document.getElementById("downloadLink").innerHTML = `
            <p>Silahkan unduh QR Code dibawah untuk datang ke acara resepsi</p>
            <a href="#" id="downloadQRButton"><button>Unduh QR Code</button></a>
          `;
          
          document.getElementById("downloadQRButton").addEventListener("click", () => {
            html2canvas(document.getElementById("qrcodeContainer")).then(function(canvas) {
              const dataUrl = canvas.toDataURL("image/png");
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = `qrcode_with_id_${localIdTamu}.png`;
              link.click();
            });
          });
        });
      }
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.innerText = "Kirim";
    }
  });
});