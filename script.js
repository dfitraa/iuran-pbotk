// Import fungsi Firebase dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// === 1. PASTE CONFIG FIREBASE ANTUM DI SINI ===
const firebaseConfig = {
  apiKey: "AIzaSyATBrs-t6abDvlNMuo4EyhacO6U8p7tuXw",
  authDomain: "kas-pbotk.firebaseapp.com",
  projectId: "kas-pbotk",
  storageBucket: "kas-pbotk.firebasestorage.app",
  messagingSenderId: "294578979327",
  appId: "1:294578979327:web:ee1a7c2b86a484b98467ca"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ==============================================

let isAdminMode = false;

// Helper: Format Rupiah
const formatRp = (angka) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(angka);
};

// 2. AMBIL DATA DARI FIREBASE SECARA REALTIME
function listenData() {
    const q = query(collection(db, "transaksi"), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const listPemasukan = document.getElementById('list-pemasukan');
        const listPengeluaran = document.getElementById('list-pengeluaran');
        
        if(!listPemasukan || !listPengeluaran) return;

        listPemasukan.innerHTML = '';
        listPengeluaran.innerHTML = '';
        
        let totalMasuk = 0;
        let totalKeluar = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            if (data.jenis === 'masuk') {
                totalMasuk += data.nominal;
                listPemasukan.innerHTML += `
                    <li class="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <span class="text-gray-600">${data.ket}</span>
                        <span class="font-medium text-green-700">${formatRp(data.nominal)}</span>
                    </li>`;
            } else {
                totalKeluar += data.nominal;
                listPengeluaran.innerHTML += `
                    <li class="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <span class="text-gray-600">${data.ket}</span>
                        <span class="font-medium text-red-600">${formatRp(data.nominal)}</span>
                    </li>`;
            }
        });

        // Update Total di Layar
        document.getElementById('total-pemasukan').innerText = formatRp(totalMasuk);
        document.getElementById('total-pengeluaran').innerText = formatRp(totalKeluar);
        document.getElementById('total-saldo').innerText = formatRp(totalMasuk - totalKeluar);
    });
}

// 3. FUNGSI SIMPAN KE FIREBASE
window.tambahTransaksi = async function() {
    const jenis = document.getElementById('input-jenis').value;
    const ket = document.getElementById('input-ket').value;
    const nominal = parseInt(document.getElementById('input-nominal').value);
    const btn = document.getElementById('btn-tambah');
    const err = document.getElementById('input-error');

    if(!ket || !nominal || isNaN(nominal)) {
        err.classList.remove('hidden');
        return;
    }

    err.classList.add('hidden');
    btn.innerText = 'Menyimpan...';

    try {
        await addDoc(collection(db, "transaksi"), {
            jenis: jenis,
            ket: ket,
            nominal: nominal,
            timestamp: new Date()
        });

        document.getElementById('input-ket').value = '';
        document.getElementById('input-nominal').value = '';
        btn.innerText = 'Simpan Transaksi';
        window.switchView('public'); 
    } catch (e) {
        console.error("Error menambah dokumen: ", e);
        btn.innerText = 'Gagal menyimpan!';
        setTimeout(() => { btn.innerText = 'Simpan Transaksi'; }, 2000);
    }
}

// 4. LOGIC UI & NAVIGASI
window.toggleAccordion = function(id, iconId) {
    const content = document.getElementById(id);
    const icon = document.getElementById(iconId);
    content.classList.toggle('open');
    if (content.classList.contains('open')) {
        icon.classList.add('rotate-180');
    } else {
        icon.classList.remove('rotate-180');
    }
}

window.switchView = function(view) {
    document.getElementById('view-public').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('btn-nav-logout').classList.add('hidden');
    
    // Tampilkan Icon Shuttlecock
    const secretCock = document.getElementById('secret-cock-trigger');

    if (view === 'public') {
        document.getElementById('view-public').classList.remove('hidden');
        if (isAdminMode) {
            document.getElementById('btn-nav-logout').classList.remove('hidden');
            if (secretCock) secretCock.classList.add('hidden');
        } else {
            if (secretCock) secretCock.classList.remove('hidden');
        }
    } else if (view === 'login') {
        document.getElementById('view-login').classList.remove('hidden');
        if (secretCock) secretCock.classList.add('hidden');
    } else if (view === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        document.getElementById('btn-nav-logout').classList.remove('hidden');
        if (secretCock) secretCock.classList.add('hidden');
    }
}

window.handleLogin = function() {
    const u = document.getElementById('input-user').value;
    const p = document.getElementById('input-pass').value;
    const btn = document.getElementById('btn-login-submit');
    const err = document.getElementById('login-error');
    
    err.classList.add('hidden');
    btn.innerText = 'Memproses...';
    
    setTimeout(() => {
        if(u === 'admin' && p === 'admin123') { 
            isAdminMode = true;
            document.getElementById('input-user').value = '';
            document.getElementById('input-pass').value = '';
            window.switchView('admin');
        } else {
            err.classList.remove('hidden');
        }
        btn.innerText = 'Masuk';
    }, 500);
}

// 5. TRIPLE CLICK RAHASIA SHUTTLECOCK
let cockClickCount = 0;
let cockClickTimer = null;

function setupSecretCockLogin() {
    const cockBtn = document.getElementById('secret-cock-trigger');
    if (cockBtn) {
        cockBtn.addEventListener('click', () => {
            cockClickCount++;
            if (cockClickCount === 1) {
                cockClickTimer = setTimeout(() => {
                    cockClickCount = 0;
                }, 1000);
            } else if (cockClickCount >= 3) {
                clearTimeout(cockClickTimer);
                cockClickCount = 0;
                window.switchView('login');
            }
        });
    }
}

// 6. INISIALISASI SAAT HALAMAN DIMUAT
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-nav-logout').addEventListener('click', () => { 
        isAdminMode = false;
        window.switchView('public'); 
    });
    
    setupSecretCockLogin();
    listenData();
});