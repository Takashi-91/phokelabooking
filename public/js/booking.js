
// Booking page functionality

let selectedRoomType = null;
let selectedRoomUnit = null;
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
        const roomTypes = await api.getRoomTypes();
        displayRoomTypes(roomTypes);
    } catch (error) {
        console.error('Failed to load room types:', error);
        utils.showError('Failed to load room types. Please try again.');
    } finally {
        utils.hideLoading();
    }
}

function displayRoomTypes(roomTypes) {
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';

    roomTypes.forEach(roomType => {
        const roomCard = document.createElement('div');
        roomCard.className = 'border border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition duration-300';
        roomCard.dataset.roomTypeId = roomType._id;
        
        // Get first image or default
        const imageUrl = roomType.images && roomType.images.length > 0 
            ? roomType.images[0] 
            : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=200&h=150';
        
        roomCard.innerHTML = `
            <div class="flex space-x-4">
                <img src="${imageUrl}" 
                     alt="${roomType.name}" 
                     class="w-32 h-24 object-cover rounded-lg">
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-semibold text-gray-900">${roomType.name}</h3>
                        <div class="text-right">
                            <div class="text-sm text-gray-500">${roomType.availableUnits || 0} available</div>
                            <div class="text-xs text-gray-400">${roomType.totalUnits || 0} total units</div>
                        </div>
                    </div>
                    <p class="text-gray-600 mt-2">${roomType.description}</p>
                    <div class="flex items-center mt-2">
                        <i class="fas fa-users text-gray-500 mr-2"></i>
                        <span class="text-sm text-gray-600">Max ${roomType.maxGuests} guests</span>
                    </div>
                    <div class="flex items-center mt-2">
                        <i class="fas fa-tag text-gray-500 mr-2"></i>
                        <span class="text-lg font-bold text-blue-600">${utils.formatCurrency(roomType.price)}/night</span>
                    </div>
                    <div class="mt-3">
                        <div class="flex flex-wrap gap-2">
                            ${roomType.amenities.map(amenity => 
                                `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${amenity}</span>`
                            ).join('')}
                        </div>
                    </div>
                    ${roomType.availableUnits === 0 ? 
                        '<div class="mt-2 text-sm text-red-600 font-medium">Currently unavailable</div>' : 
                        ''
                    }
                </div>
            </div>
        `;

        // Disable selection if no units available
        if (roomType.availableUnits === 0) {
            roomCard.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            roomCard.addEventListener('click', function() {
                selectRoomType(roomType);
            });
        }

        roomsList.appendChild(roomCard);
    });
}

function selectRoomType(roomType) {
    // Remove previous selection
    document.querySelectorAll('[data-room-type-id]').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-gray-300');
    });

    // Add selection to clicked room type
    const selectedCard = document.querySelector(`[data-room-type-id="${roomType._id}"]`);
    selectedCard.classList.add('border-blue-500', 'bg-blue-50');
    selectedCard.classList.remove('border-gray-300');

    selectedRoomType = roomType;
    selectedRoomUnit = null; // Will be assigned later
    document.getElementById('next-step-1').disabled = false;
    updateBookingSidebar();
}

function updateBookingSidebar() {
    const sidebar = document.getElementById('booking-sidebar');
    if (selectedRoomType) {
        sidebar.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold text-gray-900">${selectedRoomType.name}</h4>
                    <p class="text-sm text-gray-600">${selectedRoomType.type}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Max Guests: ${selectedRoomType.maxGuests}</p>
                    <p class="text-sm text-gray-600">Price: ${utils.formatCurrency(selectedRoomType.price)}/night</p>
                    <p class="text-sm text-gray-600">Available Units: ${selectedRoomType.availableUnits || 0}</p>
                </div>
                <div>
                    <h5 class="font-medium text-gray-900 mb-2">Amenities:</h5>
                    <div class="flex flex-wrap gap-1">
                        ${selectedRoomType.amenities.map(amenity => 
                            `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${amenity}</span>`
                        ).join('')}
                    </div>
                </div>
                ${selectedRoomUnit ? `
                    <div>
                        <h5 class="font-medium text-gray-900 mb-2">Assigned Unit:</h5>
                        <p class="text-sm text-gray-600">${selectedRoomUnit.unitName}</p>
                    </div>
                ` : ''}
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
    const numberOfGuests = parseInt(document.getElementById('number-of-guests').value) || 1;

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
        const availability = await api.checkRoomTypeAvailability(selectedRoomType._id, checkinDate, checkoutDate, numberOfGuests);
        
        if (availability.available) {
            // Get available units for this room type
            const availableUnits = await api.getAvailableUnits(selectedRoomType._id, checkinDate, checkoutDate);
            
            // Select a room unit (could be enhanced to let user choose)
            selectedRoomUnit = availableUnits[0] || null;
            
            bookingData.roomTypeId = selectedRoomType._id;
            bookingData.roomUnitId = selectedRoomUnit ? selectedRoomUnit._id : null;
            bookingData.checkinDate = checkinDate;
            bookingData.checkoutDate = checkoutDate;
            bookingData.numberOfGuests = numberOfGuests;
            
            updateBookingSummary();
            updateBookingSidebar(); // Update sidebar to show assigned unit
            nextStep();
        } else {
            const reason = availability.reason || 'This room type is not available for the selected dates.';
            utils.showError(reason + ' Please choose different dates.');
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
    if (!selectedRoomType || !bookingData.checkinDate || !bookingData.checkoutDate) return;

    const nights = utils.calculateNights(bookingData.checkinDate, bookingData.checkoutDate);
    const totalAmount = (parseFloat(selectedRoomType.price) * nights).toFixed(2);

    const summary = document.getElementById('booking-summary');
    summary.innerHTML = `
        <div class="space-y-2">
            <div class="flex justify-between">
                <span>Room Type:</span>
                <span>${selectedRoomType.name}</span>
            </div>
            ${selectedRoomUnit ? `
                <div class="flex justify-between">
                    <span>Assigned Unit:</span>
                    <span>${selectedRoomUnit.unitName}</span>
                </div>
            ` : ''}
            <div class="flex justify-between">
                <span>Check-in:</span>
                <span>${utils.formatDate(bookingData.checkinDate)}</span>
            </div>
            <div class="flex justify-between">
                <span>Check-out:</span>
                <span>${utils.formatDate(bookingData.checkoutDate)}</span>
            </div>
            <div class="flex justify-between">
                <span>Guests:</span>
                <span>${bookingData.numberOfGuests || 1}</span>
            </div>
            <div class="flex justify-between">
                <span>Nights:</span>
                <span>${nights}</span>
            </div>
            <div class="flex justify-between">
                <span>Price per night:</span>
                <span>${utils.formatCurrency(selectedRoomType.price)}</span>
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

    if (parseInt(numberOfGuests) > selectedRoomType.maxGuests) {
        utils.showError(`This room type can only accommodate ${selectedRoomType.maxGuests} guests.`);
        return;
    }

    // Collect guest preferences
    const guestPreferences = {
        smoking: document.getElementById('smoking-preference')?.checked || false,
        accessibility: document.getElementById('accessibility-preference')?.checked || false,
        floor: document.getElementById('floor-preference')?.value || '',
        view: document.getElementById('view-preference')?.value || ''
    };

    // Store guest information
    bookingData.guestName = guestName;
    bookingData.guestEmail = guestEmail;
    bookingData.guestPhone = guestPhone;
    bookingData.numberOfGuests = parseInt(numberOfGuests);
    bookingData.specialRequests = document.getElementById('special-requests').value.trim();
    bookingData.guestPreferences = guestPreferences;

    nextStep();
}

async function processPayment() {
    try {
        utils.showLoading();
        
        const response = await api.createBooking(bookingData);
        
        if (response.payment && response.payment.authorizationUrl) {
            // Redirect to Paystack payment page
            window.location.href = response.payment.authorizationUrl;
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
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');
    
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
    } else if (paymentStatus === 'callback' && (reference || trxref)) {
        // Handle Paystack callback - verify payment
        verifyPayment(reference || trxref);
    } else if (trxref) {
        // Handle direct Paystack return with trxref parameter
        verifyPayment(trxref);
    }
}

async function verifyPayment(reference) {
    try {
        utils.showLoading();
        const response = await api.verifyPayment({ reference });
        
        if (response.paid) {
            utils.showSuccess('Payment successful! Your booking has been confirmed. You will receive a confirmation email shortly.');
            // Clear the URL parameters and reset form
            window.history.replaceState({}, document.title, window.location.pathname);
            resetBookingForm();
        } else {
            utils.showError('Payment verification failed. Please contact support.');
        }
    } catch (error) {
        console.error('Payment verification failed:', error);
        utils.showError('Payment verification failed. Please contact support.');
    } finally {
        utils.hideLoading();
    }
}

function resetBookingForm() {
    // Reset all form data
    selectedRoomType = null;
    selectedRoomUnit = null;
    bookingData = {};
    
    // Reset UI
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector('.step-1').classList.add('active');
    
    // Reset form fields
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type === 'checkbox') {
            field.checked = false;
        } else {
            field.value = '';
        }
    });
    
    // Reset room selection
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset booking summary
    updateBookingSidebar();
}
