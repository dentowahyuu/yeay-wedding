import { checkAuthStatus, logout, refreshToken, initializeFirebase } from './login.js';

let lastHighlightedId = null;

async function initializeAdmin() {
  if (!initializeFirebase()) {
    console.error('Firebase initialization failed');
    redirectToLogin();
    return;
  }

  try {
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting...');
      redirectToLogin();
      return;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToLogin();
    return;
  }

  setupUI();
  await ambilData();
  initializeScanner();
}

function redirectToLogin() {
  window.location.href = '/login.html';
}

async function ambilData() {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      await logout();
      return;
    }

    const res = await fetch('/admin/data', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });

    if (res.status === 401) {
      const newToken = await refreshToken();
      if (newToken) return ambilData();
      await logout();
      return;
    }

    const data = await res.json();
    renderTabelData(data);
    hideHighlightBanner();
  } catch (error) {
    console.error('Fetch error:', error);
    tampilkanAlert('Gagal mengambil data tamu', 'danger');
  }
}

function hideHighlightBanner() {
  const highlightBanner = document.getElementById('highlightBanner');
  if (highlightBanner) {
    highlightBanner.style.display = 'none';
  }
}

function renderTabelData(data) {
  const tbody = document.querySelector("#tabelData tbody");
  if (!tbody) {
    console.error('Table body element not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (!data || data.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="6" class="text-center">Tidak ada data tamu</td>';
    tbody.appendChild(emptyRow);
    return;
  }
  
  data.forEach(item => {
    const row = document.createElement('tr');
    row.dataset.id = item.id_tamu; // Tambahkan data-id untuk mempermudah pencarian
    row.innerHTML = ` 
      <td>${item.nama}</td>
      <td>${item.kehadiran}</td>
      <td>${item.pesan}</td>
      <td>${formatTimestamp(item.timestamp)}</td>
      <td>${item.id_tamu}</td>
      <td>${item.scanned ? `Sudah Dipindai (${formatTimestamp(item.timestamp_scan)})` : 'Belum Dipindai'}</td>
    `;

    // Tambahkan warna jika sudah dipindai
    if (item.scanned) {
      row.classList.add('table-success');
    }

    // Highlight row if it matches the lastHighlightedId
    if (lastHighlightedId && item.id_tamu === lastHighlightedId) {
      row.classList.add('highlight-search');
    }

    tbody.appendChild(row);
  });
}

// Format timestamp dengan lebih baik
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  // Handle Firebase timestamp
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Handle standard Date object
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return 'Format waktu tidak valid';
}

// Fungsi untuk cari tamu berdasarkan input/QR
function cariTamu() {
  const input = document.getElementById("scanInput");
  if (!input) {
    console.error('Scan input element not found');
    return;
  }
  
  const inputValue = input.value.trim();
  const rows = document.querySelectorAll("#tabelData tbody tr");
  let ditemukan = false;
  let dataTamu = null;

  lastHighlightedId = null;

  // Reset semua highlight dalam tabel
  rows.forEach(row => row.classList.remove('highlight-search'));
  
  // Cari data tamu
  rows.forEach(row => {
    if (row.dataset.id === inputValue) {
      lastHighlightedId = inputValue;
      ditemukan = true;
      row.classList.add('highlight-search');
      
      // Dapatkan data tamu untuk highlight banner
      dataTamu = {
        nama: row.cells[0].innerText,
        kehadiran: row.cells[1].innerText,
        pesan: row.cells[2].innerText,
        timestamp: row.cells[3].innerText,
        id: row.cells[4].innerText,
        status: row.cells[5].innerText
      };
      
      // Scroll ke baris yang ditemukan
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  const highlightBanner = document.getElementById('highlightBanner');
  const hasilScan = document.getElementById("hasilScan");

  if (ditemukan && highlightBanner) {
    // Tampilkan highlight banner dengan data yang ditemukan
    highlightBanner.style.display = 'block';
    highlightBanner.innerHTML = `
      <div class="row align-items-center">
        <div class="col-md-2 text-center">
          <i class="bi bi-person-check-fill fs-1 text-success"></i>
        </div>
        <div class="col-md-10">
          <h4>${dataTamu.nama}</h4>
          <div class="row mt-2">
            <div class="col-md-6">
              <p><strong>ID:</strong> ${dataTamu.id}</p>
              <p><strong>Kehadiran:</strong> ${dataTamu.kehadiran}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Status:</strong> ${dataTamu.status}</p>
              <p><strong>Waktu Daftar:</strong> ${dataTamu.timestamp}</p>
            </div>
          </div>
          <p class="text-truncate"><strong>Pesan:</strong> ${dataTamu.pesan}</p>
        </div>
      </div>
    `;
    
    if (hasilScan) {
      hasilScan.innerHTML = "";
    }
  } else {
    // Sembunyikan highlight banner jika tidak ditemukan
    if (highlightBanner) {
      highlightBanner.style.display = 'none';
    }
    
    if (hasilScan) {
      hasilScan.innerHTML = `
        <div class="alert alert-danger">
          <p>ID tidak ditemukan!</p>
        </div>
      `;
    } else {
      tampilkanAlert('ID tidak ditemukan!', 'danger');
    }
  }
}

// Fungsi untuk inisialisasi QR scanner
function initializeScanner() {
  const readerElement = document.getElementById('reader');
  if (!readerElement) {
    console.log('QR scanner element not found');
    return;
  }

  if (typeof Html5QrcodeScanner === 'function') {
    const html5QrcodeScanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: 250
    });
    html5QrcodeScanner.render(onScanSuccess);
  } else {
    console.error('Html5QrcodeScanner not found. Make sure to include the library.');
    tampilkanAlert('QR Scanner tidak tersedia. Pastikan semua library dimuat dengan benar.', 'warning');
  }
}

// Fungsi ketika QR Code berhasil dipindai
function onScanSuccess(decodedText, decodedResult) {
  const input = document.getElementById("scanInput");
  if (!input) {
    console.error('Scan input element not found');
    return;
  }
  
  input.value = decodedText;

  const rows = document.querySelectorAll("#tabelData tbody tr");
  let ditemukan = false;
  let dataTamu = null;
  
  lastHighlightedId = null;

  // Reset semua highlight dalam tabel
  rows.forEach(row => row.classList.remove('highlight-search'));

  rows.forEach(row => {
    if (row.dataset.id === decodedText) {
      ditemukan = true;
      lastHighlightedId = decodedText;
      row.classList.add('highlight-search');
      
      // Dapatkan data tamu untuk highlight banner
      dataTamu = {
        nama: row.cells[0].innerText,
        kehadiran: row.cells[1].innerText,
        pesan: row.cells[2].innerText,
        timestamp: row.cells[3].innerText,
        id: row.cells[4].innerText,
        status: row.cells[5].innerText
      };
      
      // Scroll ke baris yang ditemukan
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const sudahDipindai = row.cells[5].innerText.includes('Sudah Dipindai');

      if (sudahDipindai) {
        tampilkanAlert('Tamu ini <strong>sudah dipindai sebelumnya</strong>.', 'warning');
      } else {
        tampilkanAlert('Tamu ditemukan: <strong>' + dataTamu.nama + '</strong>. Memperbarui status kehadiran...', 'info');
        updateScan(decodedText);
      }
    }
  });

  const highlightBanner = document.getElementById('highlightBanner');

  if (ditemukan && highlightBanner) {
    // Tampilkan highlight banner dengan data yang ditemukan
    highlightBanner.style.display = 'block';
    highlightBanner.innerHTML = `
      <div class="row align-items-center">
        <div class="col-md-2 text-center">
          <i class="bi bi-person-check-fill fs-1 text-success"></i>
        </div>
        <div class="col-md-10">
          <h4>${dataTamu.nama}</h4>
          <div class="row mt-2">
            <div class="col-md-6">
              <p><strong>ID:</strong> ${dataTamu.id}</p>
              <p><strong>Kehadiran:</strong> ${dataTamu.kehadiran}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Status:</strong> ${dataTamu.status}</p>
              <p><strong>Waktu Daftar:</strong> ${dataTamu.timestamp}</p>
            </div>
          </div>
          <p class="text-truncate"><strong>Pesan:</strong> ${dataTamu.pesan}</p>
        </div>
      </div>
    `;
  } else {
    // Sembunyikan highlight banner jika tidak ditemukan
    if (highlightBanner) {
      highlightBanner.style.display = 'none';
    }
    tampilkanAlert('ID tamu tidak ditemukan.', 'danger');
  }
}

// Fungsi untuk mengupdate status kehadiran tamu
async function updateScan(idTamu) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    tampilkanAlert('Sesi login tidak valid. Silakan login kembali.', 'danger');
    logout();
    return;
  }
  
  try {
    const response = await fetch('/admin/updateScan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      credentials: 'include',
      body: JSON.stringify({ idTamu })
    });
    
    if (response.status === 401) {
      // Coba refresh token
      const newToken = await refreshToken();
      if (!newToken) {
        logout();
        return;
      }
      
      // Coba lagi dengan token baru
      return updateScan(idTamu);
    }
    
    const data = await response.json();
    
    if (response.ok) {
      // Tampilkan notifikasi sukses
      tampilkanAlert(`<strong>Sukses!</strong> ${data.message}`, 'success');
      
      // Perbarui data tamu dan sembunyikan highlight banner setelah scan
      ambilData();
    } else {
      tampilkanAlert(data.message || 'Gagal memperbarui status kehadiran', 'danger');
    }
  } catch (error) {
    console.error("Error updating scan:", error);
    tampilkanAlert("Gagal memperbarui status kehadiran", "danger");
  }
}

// Fungsi untuk menampilkan alert
function tampilkanAlert(message, type = 'info') {
  const notif = document.createElement('div');
  notif.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notif.style.top = '20px';
  notif.style.right = '20px';
  notif.style.zIndex = '9999';
  notif.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 4000);
}

// Setup UI dan event listeners
function setupUI() {
  // Buat elemen highlightBanner jika belum ada
  if (!document.getElementById('highlightBanner')) {
    const tabelContainer = document.querySelector('#tabelData');
    
    if (tabelContainer) {
      const containerElement = tabelContainer.closest('.card') || tabelContainer.parentElement;
      
      const highlightBanner = document.createElement('div');
      highlightBanner.id = 'highlightBanner';
      highlightBanner.className = 'card mb-4 border-success';
      highlightBanner.style.display = 'none';
      highlightBanner.style.padding = '15px';
      highlightBanner.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.5)';
      
      // Masukkan banner sebelum tabel
      containerElement.parentNode.insertBefore(highlightBanner, containerElement);
    }
  }
  
  // Event listener untuk tombol cari
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', cariTamu);
  }
  
  // Event listener untuk input
  const scanInput = document.getElementById('scanInput');
  if (scanInput) {
    scanInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        cariTamu();
      }
    });
  }
  
  // Event listener untuk tombol logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  // Tambahkan CSS untuk animasi highlight
  const style = document.createElement('style');
  style.textContent = `
    #highlightBanner {
      transition: all 0.3s ease-in-out;
      animation: highlightPulse 2s infinite;
    }
    
    @keyframes highlightPulse {
      0% { box-shadow: 0 0 10px rgba(40, 167, 69, 0.5); }
      50% { box-shadow: 0 0 20px rgba(40, 167, 69, 0.8); }
      100% { box-shadow: 0 0 10px rgba(40, 167, 69, 0.5); }
    }
    
    .highlight-search {
      background-color: rgba(255, 243, 205, 0.8) !important;
      transition: background-color 0.5s ease;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', initializeAdmin);