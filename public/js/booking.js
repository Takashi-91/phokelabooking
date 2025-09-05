
// Booking page functionality

let selectedRoom = null;
let bookingData = {};

document.addEventListener('DOMContentLoaded', function() {
    loadRooms();
    setupEventListeners();
    setMinDates();
    handlePaymentResult();
});

function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkin-date').setAttribute('min', today);
    document.getElementById('checkout-date').setAttribute('min', today);
}

function setupEventListeners() {
    // Step navigation
    document.getElementById('next-step-1').addEventListener('click', nextStep);
    document.getElementById('back-step-1').addEventListener('click', prevStep);
    document.getElementById('back-step-2').addEventListener('click', prevStep);
    document.getElementById('back-step-3').addEventListener('click', prevStep);
    
    // Check availability
    document.getElementById('check-availability').addEventListener('click', checkAvailability);
    
    // Proceed to payment
    document.getElementById('proceed-to-payment').addEventListener('click', proceedToPayment);
    
    // Process payment
    document.getElementById('process-payment').addEventListener('click', processPayment);
    
    // Date change handlers
    document.getElementById('checkin-date').addEventListener('change', updateCheckoutMinDate);
    document.getElementById('checkout-date').addEventListener('change', updateBookingSummary);
    
    // Guest info change handlers
    document.getElementById('number-of-guests').addEventListener('change', updateBookingSummary);
}

async function loadRooms() {
    try {
        utils.showLoading();
        const rooms = await api.getRooms();
        displayRooms(rooms);
    } catch (error) {
        console.error('Failed to load rooms:', error);
        utils.showError('Failed to load rooms. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

function displayRooms(rooms) {
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';

    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'border border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition duration-300';
        roomCard.dataset.roomId = room._id;
        
        roomCard.innerHTML = `
            <div class="flex space-x-4">
                <img src="${room.imageUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=200&h=150'}" 
                     alt="${room.name}" 
                     class="w-32 h-24 object-cover rounded-lg">
                <div class="flex-1">
                    <h3 class="text-xl font-semibold text-gray-900">${room.name}</h3>
                    <p class="text-gray-600 mt-2">${room.description}</p>
                    <div class="flex items-center mt-2">
                        <i class="fas fa-users text-gray-500 mr-2"></i>
                        <span class="text-sm text-gray-600">Max ${room.maxGuests} guests</span>
                    </div>
                    <div class="flex items-center mt-2">
                        <i class="fas fa-tag text-gray-500 mr-2"></i>
                        <span class="text-lg font-bold text-blue-600">${utils.formatCurrency(room.price)}/night</span>
                    </div>
                    <div class="mt-3">
                        <div class="flex flex-wrap gap-2">
                            ${room.amenities.map(amenity => 
                                `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${amenity}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        roomCard.addEventListener('click', function() {
            selectRoom(room);
        });

        roomsList.appendChild(roomCard);
    });
}

function selectRoom(room) {
    // Remove previous selection
    document.querySelectorAll('[data-room-id]').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-gray-300');
    });

    // Add selection to clicked room
    const selectedCard = document.querySelector(`[data-room-id="${room._id}"]`);
    selectedCard.classList.add('border-blue-500', 'bg-blue-50');
    selectedCard.classList.remove('border-gray-300');

    selectedRoom = room;
    document.getElementById('next-step-1').disabled = false;
    updateBookingSidebar();
}

function updateBookingSidebar() {
    const sidebar = document.getElementById('booking-sidebar');
    if (selectedRoom) {
        sidebar.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold text-gray-900">${selectedRoom.name}</h4>
                    <p class="text-sm text-gray-600">${selectedRoom.type}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Max Guests: ${selectedRoom.maxGuests}</p>
                    <p class="text-sm text-gray-600">Price: ${utils.formatCurrency(selectedRoom.price)}/night</p>
                </div>
                <div>
                    <h5 class="font-medium text-gray-900 mb-2">Amenities:</h5>
                    <div class="flex flex-wrap gap-1">
                        ${selectedRoom.amenities.map(amenity => 
                            `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${amenity}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

function nextStep() {
    const currentStep = document.querySelector('.booking-step:not(.hidden)');
    const nextStep = currentStep.nextElementSibling;
    
    if (nextStep) {
        currentStep.classList.add('hidden');
        nextStep.classList.remove('hidden');
    }
}

function prevStep() {
    const currentStep = document.querySelector('.booking-step:not(.hidden)');
    const prevStep = currentStep.previousElementSibling;
    
    if (prevStep) {
        currentStep.classList.add('hidden');
        prevStep.classList.remove('hidden');
    }
}

async function checkAvailability() {
    const checkinDate = document.getElementById('checkin-date').value;
    const checkoutDate = document.getElementById('checkout-date').value;

    if (!checkinDate || !checkoutDate) {
        utils.showError('Please select both check-in and check-out dates.');
        return;
    }

    if (new Date(checkoutDate) <= new Date(checkinDate)) {
        utils.showError('Check-out date must be after check-in date.');
        return;
    }

    try {
        utils.showLoading();
        const availability = await api.checkAvailability(selectedRoom._id, checkinDate, checkoutDate);
        
        if (availability.available) {
            bookingData.roomId = selectedRoom._id;
            bookingData.checkinDate = checkinDate;
            bookingData.checkoutDate = checkoutDate;
            updateBookingSummary();
            nextStep();
        } else {
            utils.showError('This room is not available for the selected dates. Please choose different dates.');
        }
    } catch (error) {
        console.error('Availability check failed:', error);
        utils.showError('Failed to check availability. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

function updateCheckoutMinDate() {
    const checkinDate = document.getElementById('checkin-date').value;
    if (checkinDate) {
        const nextDay = new Date(checkinDate);
        nextDay.setDate(nextDay.getDate() + 1);
        document.getElementById('checkout-date').setAttribute('min', nextDay.toISOString().split('T')[0]);
    }
}

function updateBookingSummary() {
    if (!selectedRoom || !bookingData.checkinDate || !bookingData.checkoutDate) return;

    const nights = utils.calculateNights(bookingData.checkinDate, bookingData.checkoutDate);
    const totalAmount = (parseFloat(selectedRoom.price) * nights).toFixed(2);

    const summary = document.getElementById('booking-summary');
    summary.innerHTML = `
        <div class="space-y-2">
            <div class="flex justify-between">
                <span>Room:</span>
                <span>${selectedRoom.name}</span>
            </div>
            <div class="flex justify-between">
                <span>Check-in:</span>
                <span>${utils.formatDate(bookingData.checkinDate)}</span>
            </div>
            <div class="flex justify-between">
                <span>Check-out:</span>
                <span>${utils.formatDate(bookingData.checkoutDate)}</span>
            </div>
            <div class="flex justify-between">
                <span>Nights:</span>
                <span>${nights}</span>
            </div>
            <div class="flex justify-between">
                <span>Price per night:</span>
                <span>${utils.formatCurrency(selectedRoom.price)}</span>
            </div>
            <div class="border-t pt-2">
                <div class="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${utils.formatCurrency(totalAmount)}</span>
                </div>
            </div>
        </div>
    `;

    bookingData.totalAmount = totalAmount;
    bookingData.nights = nights;
}

function proceedToPayment() {
    // Validate guest information
    const guestName = document.getElementById('guest-name').value.trim();
    const guestEmail = document.getElementById('guest-email').value.trim();
    const guestPhone = document.getElementById('guest-phone').value.trim();
    const numberOfGuests = document.getElementById('number-of-guests').value;

    if (!guestName || !guestEmail || !guestPhone || !numberOfGuests) {
        utils.showError('Please fill in all required fields.');
        return;
    }

    if (!utils.validateEmail(guestEmail)) {
        utils.showError('Please enter a valid email address.');
        return;
    }

    if (!utils.validatePhone(guestPhone)) {
        utils.showError('Please enter a valid phone number.');
        return;
    }

    if (parseInt(numberOfGuests) > selectedRoom.maxGuests) {
        utils.showError(`This room can only accommodate ${selectedRoom.maxGuests} guests.`);
        return;
    }

    // Store guest information
    bookingData.guestName = guestName;
    bookingData.guestEmail = guestEmail;
    bookingData.guestPhone = guestPhone;
    bookingData.numberOfGuests = parseInt(numberOfGuests);
    bookingData.specialRequests = document.getElementById('special-requests').value.trim();

    nextStep();
}

async function processPayment() {
    try {
        utils.showLoading();
        
        const response = await api.createBooking(bookingData);
        
        if (response.payment && response.payment.redirectUrl) {
            // Redirect to payment page
            window.location.href = response.payment.redirectUrl;
        } else {
            utils.showError('Payment processing failed. Please try again.');
        }
    } catch (error) {
        console.error('Payment processing failed:', error);
        utils.showError(error.message || 'Payment processing failed. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

function handlePaymentResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderId = urlParams.get('orderId');
    
    if (paymentStatus === 'success') {
        utils.showSuccess('Payment successful! Your booking has been confirmed. You will receive a confirmation email shortly.');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failed') {
        utils.showError('Payment failed. Please try again or contact support.');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
        utils.showError('Payment was cancelled. You can try again anytime.');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}
