// Admin panel functionality

let currentAdmin = null;
let roomTypes = [];
let roomUnits = [];
let bookings = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Tab switching
    const roomTypesTab = document.getElementById('room-types-tab');
    if (roomTypesTab) {
        roomTypesTab.addEventListener('click', 
            () => switchTab('room-types'));
    }

    const roomUnitsTab = document.getElementById('room-units-tab');
    if (roomUnitsTab) {
        roomUnitsTab.addEventListener('click', () => switchTab('room-units'));
    }

    // Room type management
    const addRoomTypeBtn = document.getElementById('add-room-type-btn');
    if (addRoomTypeBtn) {
        addRoomTypeBtn.addEventListener('click', showRoomTypeModal);
    }

    // Room unit management
    const addRoomUnitBtn = document.getElementById('add-room-unit-btn');
    if (addRoomUnitBtn) {
        addRoomUnitBtn.addEventListener('click', showRoomUnitModal);
    }

    // Room management (legacy)
    const addRoomBtn = document.getElementById('add-room-btn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', showAddRoomModal);
    }

    const roomForm = document.getElementById('room-form');
    if (roomForm) {
        roomForm.addEventListener('submit', handleRoomSubmit);
    }

    const closeRoomModal = document.getElementById('close-room-modal');
    if (closeRoomModal) {
        closeRoomModal.addEventListener('click', hideRoomModal);
    }

    const cancelRoom = document.getElementById('cancel-room');
    if (cancelRoom) {
        cancelRoom.addEventListener('click', hideRoomModal);
    }

    // Booking filter
    const bookingFilter = document.getElementById('booking-filter');
    if (bookingFilter) {
        bookingFilter.addEventListener('change', filterBookings);
    }
}

async function checkAdminAuth() {
    try {
        const adminInfo = await api.getAdminInfo();
        currentAdmin = adminInfo;
        showAdminDashboard();
        loadAdminData();
    } catch (error) {
        console.log('Not authenticated, showing login form');
        showLoginForm();
    }
}

function showLoginForm() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('admin-username').textContent = currentAdmin.username;
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        utils.showLoading();
        const response = await api.adminLogin(credentials);
        currentAdmin = response.admin;
        showAdminDashboard();
        loadAdminData();
    } catch (error) {
        console.error('Login failed:', error);
        utils.showError('Invalid username or password.');
    } finally {
        utils.hideLoading();
    }
}

async function handleLogout() {
    try {
        await api.adminLogout();
        currentAdmin = null;
        showLoginForm();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function loadAdminData() {
    try {
        utils.showLoading();
        await Promise.all([
            loadStats(),
            loadRooms(),
            loadBookings()
        ]);
    } catch (error) {
        console.error('Failed to load admin data:', error);
        utils.showError('Failed to load admin data.');
    } finally {
        utils.hideLoading();
    }
}

async function loadStats() {
    try {
        const stats = await api.getAdminStats();
        document.getElementById('total-rooms').textContent = stats.totalRooms || 0;
        document.getElementById('total-bookings').textContent = stats.totalBookings || 0;
        document.getElementById('monthly-revenue').textContent = utils.formatCurrency(stats.monthlyRevenue || 0);
        document.getElementById('occupancy-rate').textContent = `${(stats.occupancyRate || 0).toFixed(1)}%`;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('[id$="-tab"]').forEach(tab => {
        tab.classList.remove('border-blue-500', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-gray-500');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('border-blue-500', 'text-blue-600');
    document.getElementById(`${tabName}-tab`).classList.remove('border-transparent', 'text-gray-500');
    
    // Show/hide sections
    document.getElementById('room-types-section').classList.toggle('hidden', tabName !== 'room-types');
    document.getElementById('room-units-section').classList.toggle('hidden', tabName !== 'room-units');
    
    // Load data for the selected tab
    if (tabName === 'room-types') {
        loadRoomTypes();
    } else if (tabName === 'room-units') {
        loadRoomUnits();
    }
}

async function loadRoomTypes() {
    try {
        roomTypes = await api.getAdminRoomTypes();
        displayRoomTypes();
    } catch (error) {
        console.error('Failed to load room types:', error);
    }
}

async function loadRoomUnits() {
    try {
        roomUnits = await api.getAdminRoomUnits();
        displayRoomUnits();
    } catch (error) {
        console.error('Failed to load room units:', error);
    }
}

// Legacy support
async function loadRooms() {
    await loadRoomTypes();
}

function displayRoomTypes() {
    const roomTypesTable = document.getElementById('room-types-table');
    if (!roomTypesTable) return;

    if (roomTypes.length === 0) {
        roomTypesTable.innerHTML = '<p class="text-gray-500 text-center py-8">No room types found.</p>';
        return;
    }

    roomTypesTable.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${roomTypes.map(roomType => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <img class="h-10 w-10 rounded-lg object-cover" src="${roomType.images && roomType.images[0] || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=100&h=100'}" alt="${roomType.name}">
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${roomType.name}</div>
                                    <div class="text-sm text-gray-500">${roomType.type}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${utils.formatCurrency(roomType.price)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${roomType.maxGuests}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${roomType.availableUnits || 0}/${roomType.totalUnits || 0}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roomType.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${roomType.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onclick="editRoomType('${roomType._id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                            <button onclick="toggleRoomTypeStatus('${roomType._id}', ${roomType.isActive})" class="text-yellow-600 hover:text-yellow-900">
                                ${roomType.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayRoomUnits() {
    const roomUnitsTable = document.getElementById('room-units-table');
    if (!roomUnitsTable) return;

    if (roomUnits.length === 0) {
        roomUnitsTable.innerHTML = '<p class="text-gray-500 text-center py-8">No room units found.</p>';
        return;
    }

    roomUnitsTable.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${roomUnits.map(unit => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${unit.unitName || unit.unitNumber}</div>
                            <div class="text-sm text-gray-500">${unit.unitNumber}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${unit.roomTypeId?.name || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${unit.floor || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getUnitStatusColor(unit.status)}">
                                ${unit.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onclick="editRoomUnit('${unit._id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                            <button onclick="toggleUnitStatus('${unit._id}', '${unit.status}')" class="text-yellow-600 hover:text-yellow-900">
                                Toggle Status
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getUnitStatusColor(status) {
    const colors = {
        'available': 'bg-green-100 text-green-800',
        'occupied': 'bg-blue-100 text-blue-800',
        'maintenance': 'bg-yellow-100 text-yellow-800',
        'out-of-order': 'bg-red-100 text-red-800',
        'cleaning': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Legacy support
function displayRooms() {
    displayRoomTypes();
}

// Room type management functions
function showRoomTypeModal() {
    // Create a simple modal for room type creation
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">Add Room Type</h3>
            <form id="room-type-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" id="room-type-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <input type="text" id="room-type-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea id="room-type-description" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" required></textarea>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <input type="number" id="room-type-price" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" step="0.01" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Max Guests</label>
                    <input type="number" id="room-type-guests" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Total Units</label>
                    <input type="number" id="room-type-units" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" value="1" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Amenities (comma-separated)</label>
                    <input type="text" id="room-type-amenities" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="WiFi, TV, Air Conditioning">
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('room-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createRoomType();
    });
}

function showRoomUnitModal() {
    // Create a simple modal for room unit creation
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">Add Room Unit</h3>
            <form id="room-unit-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                    <select id="room-unit-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        <option value="">Select Room Type</option>
                        ${roomTypes.map(rt => `<option value="${rt._id}">${rt.name}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Unit Number</label>
                    <input type="text" id="room-unit-number" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input type="number" id="room-unit-floor" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="1">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Special Features (comma-separated)</label>
                    <input type="text" id="room-unit-features" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="accessible, smoking, mountain-view">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea id="room-unit-notes" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Create</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('room-unit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createRoomUnit();
    });
}

async function createRoomType() {
    try {
        const formData = {
            name: document.getElementById('room-type-name').value,
            type: document.getElementById('room-type-type').value,
            description: document.getElementById('room-type-description').value,
            price: document.getElementById('room-type-price').value,
            maxGuests: parseInt(document.getElementById('room-type-guests').value),
            totalUnits: parseInt(document.getElementById('room-type-units').value),
            amenities: document.getElementById('room-type-amenities').value.split(',').map(a => a.trim()).filter(a => a)
        };
        
        const response = await api.createRoomType(formData);
        console.log('Room type created:', response);
        closeModal();
        loadRoomTypes(); // Refresh the list
        utils.showSuccess('Room type created successfully!');
    } catch (error) {
        console.error('Failed to create room type:', error);
        utils.showError('Failed to create room type. Please try again.');
    }
}

async function createRoomUnit() {
    try {
        const roomTypeId = document.getElementById('room-unit-type').value;
        const formData = {
            unitNumber: document.getElementById('room-unit-number').value,
            floor: parseInt(document.getElementById('room-unit-floor').value) || undefined,
            specialFeatures: document.getElementById('room-unit-features').value.split(',').map(f => f.trim()).filter(f => f),
            notes: document.getElementById('room-unit-notes').value
        };
        
        const response = await api.createRoomUnit(roomTypeId, formData);
        console.log('Room unit created:', response);
        closeModal();
        loadRoomUnits(); // Refresh the list
        utils.showSuccess('Room unit created successfully!');
    } catch (error) {
        console.error('Failed to create room unit:', error);
        utils.showError('Failed to create room unit. Please try again.');
    }
}

function closeModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
}

function editRoomType(roomTypeId) {
    // Implementation for editing room type
    console.log('Edit room type:', roomTypeId);
    // TODO: Implement edit functionality
}

function toggleRoomTypeStatus(roomTypeId, currentStatus) {
    // Implementation for toggling room type status
    console.log('Toggle room type status:', roomTypeId, currentStatus);
    // TODO: Implement status toggle
}

function editRoomUnit(unitId) {
    // Implementation for editing room unit
    console.log('Edit room unit:', unitId);
    // TODO: Implement edit functionality
}

function toggleUnitStatus(unitId, currentStatus) {
    // Implementation for toggling unit status
    console.log('Toggle unit status:', unitId, currentStatus);
    // TODO: Implement status toggle
}

async function loadBookings() {
    try {
        bookings = await api.getAllBookings();
        displayBookings();
        displayRecentBookings();
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

function displayBookings() {
    const bookingsTable = document.getElementById('bookings-table');
    if (!bookingsTable) return;

    if (bookings.length === 0) {
        bookingsTable.innerHTML = '<p class="text-gray-500 text-center py-8">No bookings found.</p>';
        return;
    }

    bookingsTable.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${bookings.map(booking => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${booking.guestName}</div>
                            <div class="text-sm text-gray-500">${booking.guestEmail}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${booking.room?.name || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${utils.formatDate(booking.checkinDate)} - ${utils.formatDate(booking.checkoutDate)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${utils.formatCurrency(booking.totalAmount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}">
                                ${booking.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(booking.paymentStatus)}">
                                ${booking.paymentStatus}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onclick="updateBookingStatus('${booking._id}', 'confirmed')" class="text-green-600 hover:text-green-900">Confirm</button>
                            <button onclick="updateBookingStatus('${booking._id}', 'cancelled')" class="text-red-600 hover:text-red-900">Cancel</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayRecentBookings() {
    const recentBookings = document.getElementById('recent-bookings');
    if (!recentBookings) return;

    const recent = bookings.slice(0, 5);
    
    if (recent.length === 0) {
        recentBookings.innerHTML = '<p class="text-gray-500 text-center py-4">No recent bookings.</p>';
        return;
    }

    recentBookings.innerHTML = recent.map(booking => `
        <div class="border-l-4 border-blue-500 pl-4 py-2">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-sm font-medium text-gray-900">${booking.guestName}</p>
                    <p class="text-xs text-gray-500">${booking.room?.name || 'N/A'}</p>
                </div>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}">
                    ${booking.status}
                </span>
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'confirmed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'checked-in': 'bg-blue-100 text-blue-800',
        'checked-out': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPaymentStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'paid': 'bg-green-100 text-green-800',
        'failed': 'bg-red-100 text-red-800',
        'refunded': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function filterBookings() {
    const filter = document.getElementById('booking-filter').value;
    const filteredBookings = filter === 'all' ? bookings : bookings.filter(booking => booking.status === filter);
    
    // Update the display with filtered bookings
    const originalBookings = bookings;
    bookings = filteredBookings;
    displayBookings();
    bookings = originalBookings;
}

function showAddRoomModal() {
    document.getElementById('room-modal-title').textContent = 'Add New Room';
    document.getElementById('room-form').reset();
    document.getElementById('room-available').checked = true;
    document.getElementById('room-modal').classList.remove('hidden');
}

function editRoom(roomId) {
    const room = rooms.find(r => r._id === roomId);
    if (!room) return;

    document.getElementById('room-modal-title').textContent = 'Edit Room';
    document.getElementById('room-name').value = room.name;
    document.getElementById('room-type').value = room.type;
    document.getElementById('room-price').value = room.price;
    document.getElementById('room-max-guests').value = room.maxGuests;
    document.getElementById('room-description').value = room.description;
    document.getElementById('room-image-url').value = room.imageUrl || '';
    document.getElementById('room-amenities').value = room.amenities.join(', ');
    document.getElementById('room-available').checked = room.isAvailable;
    
    // Store room ID for update
    document.getElementById('room-form').dataset.roomId = roomId;
    
    document.getElementById('room-modal').classList.remove('hidden');
}

function hideRoomModal() {
    document.getElementById('room-modal').classList.add('hidden');
    document.getElementById('room-form').reset();
    delete document.getElementById('room-form').dataset.roomId;
}

async function handleRoomSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const roomData = {
        name: formData.get('room-name'),
        type: formData.get('room-type'),
        price: formData.get('room-price'),
        maxGuests: parseInt(formData.get('room-max-guests')),
        description: formData.get('room-description'),
        imageUrl: formData.get('room-image-url'),
        amenities: formData.get('room-amenities').split(',').map(a => a.trim()).filter(a => a),
        isAvailable: formData.get('room-available') === 'on'
    };

    try {
        utils.showLoading();
        
        const roomId = e.target.dataset.roomId;
        if (roomId) {
            await api.updateRoom(roomId, roomData);
        } else {
            await api.createRoom(roomData);
        }
        
        await loadRooms();
        hideRoomModal();
    } catch (error) {
        console.error('Room operation failed:', error);
        utils.showError('Failed to save room. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
        utils.showLoading();
        await api.deleteRoom(roomId);
        await loadRooms();
    } catch (error) {
        console.error('Delete room failed:', error);
        utils.showError('Failed to delete room. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

async function toggleRoomAvailability(roomId, currentStatus) {
    try {
        utils.showLoading();
        await api.updateRoomAvailability(roomId, !currentStatus);
        await loadRooms();
    } catch (error) {
        console.error('Toggle availability failed:', error);
        utils.showError('Failed to update room availability. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

async function updateBookingStatus(bookingId, status) {
    try {
        utils.showLoading();
        await api.updateBooking(bookingId, { status });
        await loadBookings();
    } catch (error) {
        console.error('Update booking status failed:', error);
        utils.showError('Failed to update booking status. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

