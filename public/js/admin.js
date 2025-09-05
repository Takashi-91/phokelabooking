// Admin panel functionality

let currentAdmin = null;
let rooms = [];
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

    // Room management
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

async function loadRooms() {
    try {
        rooms = await api.getRooms();
        displayRooms();
    } catch (error) {
        console.error('Failed to load rooms:', error);
    }
}

function displayRooms() {
    const roomsTable = document.getElementById('rooms-table');
    if (!roomsTable) return;

    if (rooms.length === 0) {
        roomsTable.innerHTML = '<p class="text-gray-500 text-center py-8">No rooms found.</p>';
        return;
    }

    roomsTable.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${rooms.map(room => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <img class="h-10 w-10 rounded-lg object-cover" src="${room.imageUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=100&h=100'}" alt="${room.name}">
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${room.name}</div>
                                    <div class="text-sm text-gray-500">${room.description.substring(0, 50)}...</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${room.type}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${utils.formatCurrency(room.price)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${room.maxGuests}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${room.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onclick="editRoom('${room._id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                            <button onclick="toggleRoomAvailability('${room._id}', ${room.isAvailable})" class="text-yellow-600 hover:text-yellow-900">
                                ${room.isAvailable ? 'Disable' : 'Enable'}
                            </button>
                            <button onclick="deleteRoom('${room._id}')" class="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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
