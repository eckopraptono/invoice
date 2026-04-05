/* ============================================
   INVOICO PRO — Script
   ============================================ */

// --- State ---
let items = [
    { id: Date.now(), desc: '', qty: 1, price: 0 },
];
let isPPN = false;
let currentStatus = 'waiting';

// --- Formatters ---
const rupiahFmt = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
});

function formatRp(val) {
    return rupiahFmt.format(val).replace('Rp', 'Rp\u00A0');
}

// --- Auto Resize Textarea ---
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// --- Render Table ---
function render() {
    const body = document.getElementById('items-body');
    body.innerHTML = '';

    let subtotal = 0;

    items.forEach((item, idx) => {
        const rowTotal = item.qty * item.price;
        subtotal += rowTotal;

        const tr = document.createElement('tr');
        tr.className = 'item-row';
        tr.innerHTML = `
            <td class="td-no">${idx + 1}</td>
            <td>
                <textarea
                    class="tbl-input"
                    rows="1"
                    placeholder="Deskripsi layanan..."
                    spellcheck="false"
                    oninput="updateDesc(${idx}, this.value); autoResize(this)"
                >${item.desc}</textarea>
            </td>
            <td>
                <input
                    type="number"
                    class="tbl-input"
                    style="text-align:center;"
                    value="${item.qty}"
                    min="1"
                    oninput="updateItem(${idx}, 'qty', this.value)"
                >
            </td>
            <td>
                <input
                    type="number"
                    class="tbl-input"
                    style="text-align:right;"
                    value="${item.price}"
                    min="0"
                    oninput="updateItem(${idx}, 'price', this.value)"
                >
            </td>
            <td class="td-total">${formatRp(rowTotal)}</td>
            <td class="col-action" data-html2canvas-ignore>
                <button class="tbl-delete" onclick="removeItem(${idx})" title="Hapus baris">
                    <i class="ph ph-x"></i>
                </button>
            </td>
        `;
        body.appendChild(tr);

        // Auto resize textarea after DOM paint
        setTimeout(() => autoResize(tr.querySelector('textarea')), 0);
    });

    updateTotals(subtotal);
}

function updateDesc(idx, val) {
    items[idx].desc = val;
    calcTotals();
}

function updateItem(idx, key, val) {
    items[idx][key] = parseFloat(val) || 0;
    render();
}

function calcTotals() {
    let subtotal = 0;
    items.forEach(it => subtotal += it.qty * it.price);
    updateTotals(subtotal);
}

function updateTotals(subtotal) {
    const ppn   = isPPN ? subtotal * 0.11 : 0;
    const total = subtotal + ppn;

    setText('subtotal-val',  formatRp(subtotal));
    setText('ppn-val',       formatRp(ppn));
    setText('total-val',     formatRp(total));
    setText('header-total',  formatRp(total));
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// --- Add / Remove Item ---
function addItem() {
    items.push({ id: Date.now(), desc: '', qty: 1, price: 0 });
    render();
    // Focus last textarea
    const areas = document.querySelectorAll('#items-body textarea.tbl-input');
    if (areas.length) areas[areas.length - 1].focus();
}

function removeItem(idx) {
    if (items.length <= 1) {
        alert('Minimal harus ada 1 item.');
        return;
    }
    items.splice(idx, 1);
    render();
}

// --- PPN Toggle ---
function togglePPN() {
    isPPN = document.getElementById('ppn-checkbox').checked;
    const ppnRow = document.getElementById('ppn-display');
    ppnRow.style.display = isPPN ? 'flex' : 'none';
    calcTotals();
}

// --- Status Cycle ---
const statusConfig = {
    waiting:   { label: 'Menunggu',   cls: 'iv-status-badge iv-status-waiting',   next: 'paid'      },
    paid:      { label: 'Lunas',      cls: 'iv-status-badge iv-status-paid',      next: 'cancelled' },
    cancelled: { label: 'Dibatalkan', cls: 'iv-status-badge iv-status-cancelled', next: 'waiting'   },
};

function cycleStatus() {
    const next        = statusConfig[currentStatus].next;
    currentStatus     = next;
    const badge       = document.getElementById('status-toggle');
    const text        = document.getElementById('status-text');
    badge.className   = statusConfig[next].cls;
    text.textContent  = statusConfig[next].label;

    // Auto toggle stamp based on status
    const stamp = document.getElementById('digital-stamp');
    if (stamp) {
        stamp.style.display = (next === 'paid') ? 'block' : 'none';
    }
}

// --- Stamp Toggle (Manual override if needed) ---
function toggleStamp() {
    const stamp = document.getElementById('digital-stamp');
    if (stamp) {
        stamp.style.display = stamp.style.display === 'none' ? 'block' : 'none';
    }
}

// --- Reset ---
function resetInvoice() {
    if (!confirm('Reset semua data invoice? Tindakan ini tidak dapat dibatalkan.')) return;

    items = [{ id: Date.now(), desc: '', qty: 1, price: 0 }];

    ['c-name', 'c-phone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const addr = document.getElementById('c-addr');
    if (addr) { addr.value = ''; autoResize(addr); }

    // Reset PPN
    const ppnCB = document.getElementById('ppn-checkbox');
    if (ppnCB && ppnCB.checked) {
        ppnCB.checked = false;
        togglePPN();
    }

    // Reset invoice number
    const invNo = document.getElementById('invoice-no-val');
    if (invNo) invNo.textContent = 'INV-2026-001';

    render();
}

// ============================================
//   EXPORT PDF — A4 Format (Fixed & Reliable)
//   Menggunakan html2pdf langsung pada elemen asli
//   dengan class exporting untuk sembunyikan UI chrome.
// ============================================
function exportPDF() {
    const invNo   = (document.getElementById('invoice-no-val')?.textContent || 'INV-001').trim();
    const client  = (document.getElementById('c-name')?.value || 'Customer').trim();
    
    // Set document title temporarily (this becomes the default filename in many browsers)
    const originalTitle = document.title;
    const sanitize = s => s.replace(/[\/\\:*?"<>|]/g, '_').trim();
    document.title = `Invoice-${sanitize(invNo)}-${sanitize(client)}`;

    // Trigger native print dialog
    window.print();

    // Restore original title after a short delay to ensure print dialog captures it
    setTimeout(() => {
        document.title = originalTitle;
    }, 1000);
}

// ============================================
//   INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as issue date
    const today = new Date().toISOString().split('T')[0];
    const issueEl = document.getElementById('issue-date');
    if (issueEl) issueEl.value = today;

    // Due date = +7 days
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const dueEl = document.getElementById('due-date');
    if (dueEl) dueEl.value = due.toISOString().split('T')[0];

    // Auto-resize all textareas
    document.querySelectorAll('textarea').forEach(el => autoResize(el));

    render();
});
