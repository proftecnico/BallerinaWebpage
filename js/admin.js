const SEATS_KEY = 'ballerina_seats_2026';
const ROWS = 20;
const ORDER = [23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

let seats = [];
let adminSelectedId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSeats();
    renderStats();
    renderGrid();

    // Listen for updates from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === SEATS_KEY) {
            loadSeats();
            renderStats();
            renderGrid();
            if (adminSelectedId) showSelectionDetails(adminSelectedId);
        }
    });
});

function loadSeats() {
    const saved = localStorage.getItem(SEATS_KEY);
    if (!saved) {
        // Initialize if empty (should match entradas.js logic roughly, but preferably we load what exists)
        // If nothing exists, maybe we shouldn't create it here, or we should using same logic.
        // Assuming user visits entrances.html first usually, but let's be safe.
        seats = [];
        for (let row = 1; row <= ROWS; row++) {
            ORDER.forEach(num => seats.push({ id: `${row}-${num}`, row, number: num, status: 'available', reservedBy: null, reservedAt: null }));
        }
    } else {
        seats = JSON.parse(saved);
    }
}

function saveSeats() {
    localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
    renderStats();
    renderGrid();
    if (adminSelectedId) showSelectionDetails(adminSelectedId);
}

function renderStats() {
    const total = seats.length;
    const available = seats.filter(s => s.status === 'available').length;
    // 'selected' in user app means "reserved/in cart". 'sold' is sold.
    const reserved = seats.filter(s => s.status === 'selected').length;
    const sold = seats.filter(s => s.status === 'sold').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-reserved').textContent = reserved;
    document.getElementById('stat-sold').textContent = sold;
}

function renderGrid() {
    const container = document.getElementById('seats-container');
    if (!container) return;

    let html = '';
    for (let row = 1; row <= ROWS; row++) {
        const rowSeats = seats.filter(s => s.row === row);

        // Ensure sorting by visual order if needed, but array filter usually keeps order. 
        // Logic in entradas.js: ORDER was used to push. So they are sorted by creation.

        html += `<div class="flex items-center justify-center gap-1 mb-1">
                    <div class="w-8 text-right font-bold text-gray-400 mr-2 text-xs">F${row}</div>
                    <div class="flex flex-nowrap gap-1">`;

        rowSeats.forEach(seat => {
            let colorClass = 'bg-green-200 text-green-800'; // Available

            if (seat.status === 'sold') {
                colorClass = 'bg-gray-600 text-white';
            } else if (seat.status === 'selected') {
                colorClass = 'bg-pink-200 text-pink-600 border border-pink-300';
            }

            let borderClass = '';
            if (seat.id === adminSelectedId) {
                borderClass = 'ring-2 ring-blue-500 ring-offset-1 z-10';
            }

            html += `<div onclick="selectSeat('${seat.id}')" 
                          class="w-8 h-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-all hover:scale-110 ${colorClass} ${borderClass}" 
                          title="Fila ${seat.row} - Asiento ${seat.number} (${seat.status})">
                          ${seat.number}
                     </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

window.selectSeat = (id) => {
    adminSelectedId = id;
    renderGrid(); // re-render to show selection ring
    showSelectionDetails(id);
};

function showSelectionDetails(id) {
    const seat = seats.find(s => s.id === id);
    if (!seat) return;

    document.getElementById('no-selection').classList.add('hidden');
    document.getElementById('selection-details').classList.remove('hidden');

    document.getElementById('sel-name').textContent = `Fila ${seat.row} - Asiento ${seat.number}`;

    const statusEl = document.getElementById('sel-status');
    statusEl.textContent = seat.status.toUpperCase();

    // Status colors
    statusEl.className = 'inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-4 ';
    if (seat.status === 'available') statusEl.classList.add('bg-green-100', 'text-green-700');
    else if (seat.status === 'sold') statusEl.classList.add('bg-gray-200', 'text-gray-700');
    else statusEl.classList.add('bg-pink-100', 'text-pink-700');
}

window.releaseSeat = () => {
    if (!adminSelectedId) return;
    const seat = seats.find(s => s.id === adminSelectedId);
    if (seat) {
        seat.status = 'available';
        seat.reservedBy = null;
        seat.reservedAt = null;
        saveSeats();
    }
};

window.markSold = () => {
    if (!adminSelectedId) return;
    const seat = seats.find(s => s.id === adminSelectedId);
    if (seat) {
        seat.status = 'sold';
        // Keep reservedBy if we want to track who bought it, but usually 'sold' is final state 
        // If it was 'available', reservedBy is null.
        saveSeats();
    }
};

window.resetAll = () => {
    if (!confirm('¿Estás SEGURO de que querés borrar TODAS las reservas y ventas? Esto volverá todos los asientos a DISPONIBLES.')) return;

    seats.forEach(s => {
        s.status = 'available';
        s.reservedBy = null;
        s.reservedAt = null;
    });
    saveSeats();
    alert('Se han reseteado todos los asientos.');
};
