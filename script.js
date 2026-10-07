// Import fungsi Firebase dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// === 1. CONFIG FIREBASE ===
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
let rawData = [];
let targetDeleteId = null;
let targetEditId = null;

// Helper: Format Rupiah
const formatRp = (angka) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(angka);
};

// Helper: Format Tanggal Ringkas
const formatDate = (dateObj) => {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short'
    }).format(dateObj);
};

// 2. AMBIL DATA REALTIME
function listenData() {
    const q = query(collection(db, "transaksi"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        rawData = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateVal = data.timestamp ? data.timestamp.toDate() : new Date();
            if (data.tanggal) {
                const parts = data.tanggal.split('-');
                if(parts.length === 3) {
                    dateVal = new Date(parts[0], parts[1] - 1, parts[2]);
                }
            }
            rawData.push({
                id: docSnap.id,
                ...data,
                dateObj: dateVal
            });
        });
        renderFilteredData();
        renderAdminDataList();
    });
}

// 3. RENDER DATA UNTUK USER BIASA (Murni Laporan Laporan Publik)
function renderFilteredData() {
    const listPemasukan = document.getElementById('list-pemasukan');
    const listPengeluaran = document.getElementById('list-pengeluaran');
    if(!listPemasukan || !listPengeluaran) return;

    const rangeFilter = document.getElementById('filter-range')?.value || 'semua';
    const sortFilter = document.getElementById('filter-sort')?.value || 'terbaru';

    const now = new Date();
    
    let filtered = rawData.filter(item => {
        if (rangeFilter === 'minggu_ini') {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay() || 7; 
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - day + 1);
            return item.dateObj >= startOfWeek;
        } else if (rangeFilter === 'bulan_ini') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return item.dateObj >= startOfMonth;
        }

        return true;
    });

    filtered.sort((a, b) => {
        return sortFilter === 'terlama' ? a.dateObj - b.dateObj : b.dateObj - a.dateObj;
    });

    listPemasukan.innerHTML = '';
    listPengeluaran.innerHTML = '';

    let totalMasuk = 0;
    let totalKeluar = 0;

    filtered.forEach(item => {
        const dateStr = formatDate(item.dateObj);

        if (item.jenis === 'masuk') {
            totalMasuk += item.nominal;
            listPemasukan.innerHTML += `
                <li class="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div class="flex flex-col">
                        <span class="text-gray-700 font-medium">${item.ket}</span>
                        <span class="text-[11px] text-gray-400">${dateStr}</span>
                    </div>
                    <span class="font-semibold text-green-700">${formatRp(item.nominal)}</span>
                </li>`;
        } else {
            totalKeluar += item.nominal;
            listPengeluaran.innerHTML += `
                <li class="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div class="flex flex-col">
                        <span class="text-gray-700 font-medium">${item.ket}</span>
                        <span class="text-[11px] text-gray-400">${dateStr}</span>
                    </div>
                    <span class="font-semibold text-red-600">${formatRp(item.nominal)}</span>
                </li>`;
        }
    });

    if (listPemasukan.children.length === 0) {
        listPemasukan.innerHTML = `<li class="text-gray-400 text-xs text-center py-2">Tidak ada data</li>`;
    }
    if (listPengeluaran.children.length === 0) {
        listPengeluaran.innerHTML = `<li class="text-gray-400 text-xs text-center py-2">Tidak ada data</li>`;
    }

    document.getElementById('total-pemasukan').innerText = formatRp(totalMasuk);
    document.getElementById('total-pengeluaran').innerText = formatRp(totalKeluar);
    document.getElementById('total-saldo').innerText = formatRp(totalMasuk - totalKeluar);
}

// 4. RENDER DAFTAR KELOLA DATA (KHUSUS MODE ADMIN)
function renderAdminDataList() {
    const adminList = document.getElementById('admin-list-transaksi');
    if (!adminList) return;

    adminList.innerHTML = '';

    if (rawData.length === 0) {
        adminList.innerHTML = `<li class="text-gray-400 text-xs text-center py-4">Belum ada transaksi</li>`;
        return;
    }

    rawData.forEach(item => {
        const dateStr = formatDate(item.dateObj);
        const isMasuk = item.jenis === 'masuk';
        const nominalClass = isMasuk ? 'text-green-700' : 'text-red-600';
        const jenisTag = isMasuk ? '<span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Masuk</span>' : '<span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">Keluar</span>';

        adminList.innerHTML += `
            <li class="py-2.5 flex justify-between items-center">
                <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                        ${jenisTag}
                        <span class="font-medium text-gray-800">${item.ket}</span>
                    </div>
                    <span class="text-[11px] text-gray-400 mt-0.5">${dateStr} • <span class="${nominalClass} font-semibold">${formatRp(item.nominal)}</span></span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="promptEdit('${item.id}')" class="p-1.5 text-gray-500 hover:text-soft-green transition rounded-lg hover:bg-gray-100" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="promptDelete('${item.id}')" class="p-1.5 text-gray-500 hover:text-red-500 transition rounded-lg hover:bg-gray-100" title="Hapus">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </li>`;
    });
}

// 5. SIMPAN TRANSAKSI BARU
window.tambahTransaksi = async function() {
    const jenis = document.getElementById('input-jenis').value;
    const ket = document.getElementById('input-ket').value;
    const nominal = parseInt(document.getElementById('input-nominal').value);
    const tanggalVal = document.getElementById('input-tanggal').value;
    const btn = document.getElementById('btn-tambah');
    const err = document.getElementById('input-error');

    if(!ket || !nominal || isNaN(nominal) || !tanggalVal) {
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
            tanggal: tanggalVal,
            timestamp: new Date()
        });

        document.getElementById('input-ket').value = '';
        document.getElementById('input-nominal').value = '';
        btn.innerText = 'Simpan Transaksi';
    } catch (e) {
        console.error("Error menambah dokumen: ", e);
        btn.innerText = 'Gagal menyimpan!';
        setTimeout(() => { btn.innerText = 'Simpan Transaksi'; }, 2000);
    }
}

// 6. FITUR EDIT TRANSAKSI
window.promptEdit = function(id) {
    const item = rawData.find(d => d.id === id);
    if (!item) return;

    targetEditId = id;
    document.getElementById('edit-jenis').value = item.jenis || 'masuk';
    document.getElementById('edit-ket').value = item.ket || '';
    document.getElementById('edit-nominal').value = item.nominal || '';
    
    let dateStr = item.tanggal;
    if (!dateStr && item.dateObj) {
        dateStr = item.dateObj.toISOString().split('T')[0];
    }
    document.getElementById('edit-tanggal').value = dateStr || new Date().toISOString().split('T')[0];

    document.getElementById('edit-error').classList.add('hidden');
    document.getElementById('modal-edit').classList.remove('hidden');
}

async function saveEdit() {
    if (!targetEditId) return;

    const jenis = document.getElementById('edit-jenis').value;
    const ket = document.getElementById('edit-ket').value;
    const nominal = parseInt(document.getElementById('edit-nominal').value);
    const tanggalVal = document.getElementById('edit-tanggal').value;
    const btn = document.getElementById('btn-save-edit');
    const err = document.getElementById('edit-error');

    if(!ket || !nominal || isNaN(nominal) || !tanggalVal) {
        err.classList.remove('hidden');
        return;
    }

    err.classList.add('hidden');
    btn.innerText = 'Updating...';

    try {
        const docRef = doc(db, "transaksi", targetEditId);
        await updateDoc(docRef, {
            jenis: jenis,
            ket: ket,
            nominal: nominal,
            tanggal: tanggalVal
        });

        targetEditId = null;
        btn.innerText = 'Update';
        document.getElementById('modal-edit').classList.add('hidden');
    } catch (e) {
        console.error("Gagal mengupdate dokumen: ", e);
        btn.innerText = 'Gagal!';
        setTimeout(() => { btn.innerText = 'Update'; }, 2000);
    }
}

// 7. FITUR HAPUS TRANSAKSI
window.promptDelete = function(id) {
    targetDeleteId = id;
    document.getElementById('modal-delete').classList.remove('hidden');
}

async function confirmDelete() {
    if(!targetDeleteId) return;
    try {
        await deleteDoc(doc(db, "transaksi", targetDeleteId));
        targetDeleteId = null;
        document.getElementById('modal-delete').classList.add('hidden');
    } catch (e) {
        console.error("Gagal menghapus transaksi: ", e);
    }
}

// 8. LOGIC UI & NAVIGASI
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
    document.getElementById('btn-nav-add').classList.add('hidden');
    document.getElementById('badge-admin').classList.add('hidden');
    
    const secretCock = document.getElementById('secret-cock-trigger');

    if (view === 'public') {
        document.getElementById('view-public').classList.remove('hidden');
        if (isAdminMode) {
            document.getElementById('btn-nav-logout').classList.remove('hidden');
            document.getElementById('btn-nav-add').classList.remove('hidden');
            document.getElementById('badge-admin').classList.remove('hidden');
            if (secretCock) secretCock.classList.add('hidden');
        } else {
            if (secretCock) secretCock.classList.remove('hidden');
        }
        renderFilteredData();
    } else if (view === 'login') {
        document.getElementById('view-login').classList.remove('hidden');
        if (secretCock) secretCock.classList.add('hidden');
    } else if (view === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        document.getElementById('btn-nav-logout').classList.remove('hidden');
        document.getElementById('badge-admin').classList.remove('hidden');
        if (secretCock) secretCock.classList.add('hidden');
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('input-tanggal').value = today;
        renderAdminDataList();
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
        if(u === 'admin' && p === 'superdeny') { 
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

// 9. TRIPLE CLICK RAHASIA
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

// 10. INITIALIZATION & EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-nav-logout').addEventListener('click', () => { 
        isAdminMode = false;
        window.switchView('public'); 
    });

    document.getElementById('btn-nav-add').addEventListener('click', () => { 
        window.switchView('admin'); 
    });

    // Event listeners untuk filter
    document.getElementById('filter-range')?.addEventListener('change', renderFilteredData);
    document.getElementById('filter-sort')?.addEventListener('change', renderFilteredData);

    // Event listeners Modal Edit
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
        document.getElementById('modal-edit').classList.add('hidden');
        targetEditId = null;
    });
    document.getElementById('btn-save-edit')?.addEventListener('click', saveEdit);

    // Event listeners Modal Hapus
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
        document.getElementById('modal-delete').classList.add('hidden');
        targetDeleteId = null;
    });
    document.getElementById('btn-confirm-delete')?.addEventListener('click', confirmDelete);
    
    setupSecretCockLogin();
    listenData();
});