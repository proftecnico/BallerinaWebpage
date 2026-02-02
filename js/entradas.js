const PRICE = 4500;
const ROWS = 20;
const ORDER = [23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const QUEUE_KEY = 'ballerina_queue_2026';
const SEATS_KEY = 'ballerina_seats_2026';
const MY_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

let myPosition = null;
let seats = [];
let selected = [];
let timerInterval = null;
let queueInterval = null;
let timeLeft = 300;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize if on appropriate screen
    const joinBtn = document.getElementById('join-queue-btn');
    if (joinBtn) joinBtn.addEventListener('click', joinQueue);

    window.addEventListener('beforeunload', () => {
        if (myPosition && selected.length === 0) {
            let queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
            queue = queue.filter(id => id !== MY_ID);
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        }
    });

    // Auto cleanup
    setInterval(cleanupReservations, 30000);

    // Listen for updates from Admin Panel or other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === SEATS_KEY) {
            loadSeats();
            renderSeats();
            // We don't update cart automatically to avoid removing user selection if there's a conflict,
            // but loadSeats() will update status. If user selected a seat that is now sold, 
            // renderSeats() will show it as sold (visually).
            // Optional: Check if my selected seats are still valid.
            checkMySelectionValidity();
        }
    });
});

function checkMySelectionValidity() {
    let changed = false;
    selected = selected.filter(sel => {
        const current = seats.find(s => s.id === sel.id);
        if (current && (current.status === 'sold' || (current.status === 'selected' && current.reservedBy !== MY_ID))) {
            alert(`El asiento ${sel.row}-${sel.number} ya no está disponible.`);
            changed = true;
            return false;
        }
        return true;
    });
    if (changed) {
        updateCart();
        renderSeats();
    }
}

function loadSeats() {
    const saved = localStorage.getItem(SEATS_KEY);
    if (!saved || saved === 'undefined' || saved === 'null') {
        seats = [];
        for (let row = 1; row <= ROWS; row++) {
            ORDER.forEach(num => seats.push({ id: `${row}-${num}`, row, number: num, status: 'available', reservedBy: null, reservedAt: null }));
        }
        localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
    } else {
        seats = JSON.parse(saved);
    }
    cleanupReservations();
}

function saveSeats() { localStorage.setItem(SEATS_KEY, JSON.stringify(seats)); }

function cleanupReservations() {
    const now = Date.now();
    let changed = false;
    seats.forEach(seat => {
        if (seat.reservedBy && seat.reservedAt && (now - seat.reservedAt > 180000)) {
            seat.status = 'available'; seat.reservedBy = null; seat.reservedAt = null; changed = true;
        }
    });
    if (changed) saveSeats();
}

function renderSeats() {
    const container = document.getElementById('seats-container');
    if (!container) return;
    let html = '';
    for (let row = 1; row <= ROWS; row++) {
        const rowSeats = seats.filter(s => s.row === row);
        html += `<div class="flex items-center justify-center gap-2 mb-2">
                    <div class="w-12 text-right font-bold text-pink-700 mr-2">Fila ${row}</div>
                    <div class="flex flex-nowrap gap-1">`;
        rowSeats.forEach(seat => {
            let colorClass = 'bg-green-200 text-green-800 hover:bg-green-300';
            let cursor = 'cursor-pointer';

            if (seat.status === 'sold') {
                colorClass = 'bg-gray-400 text-gray-200';
                cursor = 'cursor-not-allowed';
            } else if (seat.status === 'selected') {
                if (seat.reservedBy === MY_ID) {
                    colorClass = 'bg-pink-600 text-white shadow-lg transform scale-110';
                } else {
                    // Someone else selected it
                    colorClass = 'bg-pink-200 text-pink-400 cursor-not-allowed';
                    cursor = 'cursor-not-allowed';
                }
            }

            html += `<div onclick="toggleSeat('${seat.id}')" 
                          class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-200 ${colorClass} ${cursor}" 
                          title="Fila ${seat.row} - Butaca ${seat.number}">
                          ${seat.number}
                     </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

window.toggleSeat = (id) => {
    if (myPosition !== 1) return;
    const seat = seats.find(s => s.id === id);
    if (!seat || seat.status === 'sold') return;
    if (seat.status === 'selected' && seat.reservedBy !== MY_ID) return; // Taken by someone else

    if (seat.status === 'selected' && seat.reservedBy === MY_ID) {
        seat.status = 'available'; seat.reservedBy = null; seat.reservedAt = null;
        selected = selected.filter(s => s.id !== id);
    } else if (seat.status === 'available') {
        seat.status = 'selected'; seat.reservedBy = MY_ID; seat.reservedAt = Date.now();
        selected.push(seat);
    }
    saveSeats(); renderSeats(); updateCart();
};

function updateCart() {
    const items = document.getElementById('cart-items');
    const total = document.getElementById('cart-total');
    if (!items || !total) return;

    if (selected.length === 0) {
        items.innerHTML = '<p class="text-center text-gray-400 py-4">Seleccioná tus butacas</p>';
        total.textContent = '$0';
        return;
    }

    items.innerHTML = selected.map(s => `
        <div class="flex justify-between items-center py-2 border-b border-pink-100 last:border-0">
            <span class="font-medium text-gray-700">Fila ${s.row} - Asiento ${s.number}</span>
            <span class="font-bold text-pink-600">$${PRICE.toLocaleString()}</span>
        </div>
    `).join('');

    total.textContent = '$' + (selected.length * PRICE).toLocaleString();
}

function startTimer() {
    timeLeft = 300;
    const el = document.getElementById('countdown');
    if (el) el.textContent = '5:00';

    timerInterval = setInterval(() => {
        timeLeft--;
        const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
        const s = String(timeLeft % 60).padStart(2, '0');
        if (el) el.textContent = `${m}:${s}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("¡Tiempo agotado! Volviste al final de la cola.");
            let queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
            queue = queue.filter(id => id !== MY_ID);
            queue.push(MY_ID);
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            location.reload();
        }
    }, 1000);
}

function joinQueue() {
    loadSeats();
    let queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!queue.includes(MY_ID)) queue.push(MY_ID);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    document.getElementById('view-welcome').classList.add('hidden');
    document.getElementById('view-queue').classList.remove('hidden');

    if (queueInterval) clearInterval(queueInterval);

    const checkQueue = () => {
        queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        myPosition = queue.indexOf(MY_ID) + 1;

        if (myPosition <= 0) { clearInterval(queueInterval); location.reload(); return; }

        document.getElementById('queue-pos').textContent = myPosition;
        document.getElementById('people-ahead').textContent = myPosition - 1;
        document.getElementById('est-time').textContent = `~${(myPosition - 1) * 2} min`;

        if (myPosition === 1) {
            clearInterval(queueInterval);
            document.getElementById('view-queue').classList.add('hidden');
            document.getElementById('view-purchase').classList.remove('hidden');
            loadSeats();
            renderSeats();
            updateCart();
            startTimer();
        }
    };

    checkQueue();
    queueInterval = setInterval(checkQueue, 3000);
};

window.buy = () => {
    if (selected.length === 0) return alert("Seleccioná al menos una butaca");
    clearInterval(timerInterval);
    seats.forEach(s => { if (selected.find(sel => sel.id === s.id)) s.status = 'sold'; });
    saveSeats();

    let queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue = queue.filter(id => id !== MY_ID);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    const msg = encodeURIComponent(`¡Hola Ballerina! Compro ${selected.length} entrada/s para la Muestra 2026:\n` + selected.map(s => `• Fila ${s.row} - Butaca ${s.number}`).join('\n') + `\nTotal: $${(selected.length * PRICE).toLocaleString()}`);
    window.open(`https://wa.me/5491168680838?text=${msg}`, '_blank');
    alert("¡Compra enviada! Te confirmamos por WhatsApp");
    setTimeout(() => location.reload(), 3000);
};
