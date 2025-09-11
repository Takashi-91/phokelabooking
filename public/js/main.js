// Main JavaScript file for common functionality

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
});

// API base URL
const API_BASE_URL = '/api';

// Utility functions
const utils = {
    // Show loading state
    showLoading: function() {
        const loadingModal = document.getElementById('loading-modal');
        if (loadingModal) {
            loadingModal.classList.remove('hidden');
        }
    },

    // Hide loading state
    hideLoading: function() {
        const loadingModal = document.getElementById('loading-modal');
        if (loadingModal) {
            loadingModal.classList.add('hidden');
        }
    },

    // Show error message
    showError: function(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.classList.remove('hidden');
        }
    },

    // Hide error message
    hideError: function() {
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.classList.add('hidden');
        }
    },

    // Show success message
    showSuccess: function(message) {
        const successModal = document.getElementById('success-modal');
        if (successModal) {
            successModal.classList.remove('hidden');
        }
    },

    // Hide success message
    hideSuccess: function() {
        const successModal = document.getElementById('success-modal');
        if (successModal) {
            successModal.classList.add('hidden');
        }
    },

    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
        }).format(amount);
    },

    // Format date
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Calculate nights between dates
    calculateNights: function(checkinDate, checkoutDate) {
        const checkin = new Date(checkinDate);
        const checkout = new Date(checkoutDate);
        const diffTime = Math.abs(checkout - checkin);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    // Validate email
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone
    validatePhone: function(phone) {
        const re = /^[\+]?[1-9][\d]{0,15}$/;
        return re.test(phone.replace(/\s/g, ''));
    }
};

// API functions
const api = {
    // Make API request
    request: async function(url, options = {}) {
        try {
            const response = await fetch(API_BASE_URL + url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include', // 🔥 ensures cookies/session are used
                ...options
            });
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    

    // Get room types (replaces getRooms)
    getRoomTypes: function() {
        return this.request('/room-types');
    },

    // Get room type by ID
    getRoomType: function(id) {
        return this.request(`/room-types/${id}`);
    },

    // Check room type availability
    checkRoomTypeAvailability: function(roomTypeId, checkinDate, checkoutDate, numberOfGuests = 1) {
        return this.request(`/room-types/${roomTypeId}/check-availability`, {
            method: 'POST',
            body: JSON.stringify({ checkinDate, checkoutDate, numberOfGuests })
        });
    },

    // Get available room units for a room type
    getAvailableUnits: function(roomTypeId, checkinDate, checkoutDate) {
        return this.request(`/room-types/${roomTypeId}/available-units`, {
            method: 'POST',
            body: JSON.stringify({ checkinDate, checkoutDate })
        });
    },

    // Legacy support - redirect to room types
    getRooms: function() {
        return this.getRoomTypes();
    },

    getRoom: function(id) {
        return this.getRoomType(id);
    },

    checkAvailability: function(roomId, checkinDate, checkoutDate) {
        return this.checkRoomTypeAvailability(roomId, checkinDate, checkoutDate);
    },

    // Create booking
    createBooking: function(bookingData) {
        return this.request('/bookings/with-payment', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },

    // Verify payment
    verifyPayment: function(paymentData) {
        return this.request('/payments/verify', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },

    // Get payment config
    getPaymentConfig: function() {
        return this.request('/payments/config');
    },

    // Get bookings
    getBookings: function() {
        return this.request('/bookings');
    },

    // Admin login
    adminLogin: function(credentials) {
        return this.request('/admin/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    // Get admin info
    getAdminInfo: function() {
        return this.request('/admin/me');
    },

    // Admin logout
    adminLogout: function() {
        return this.request('/admin/logout', {
            method: 'POST'
        });
    },

    // Room type management
    getRoomTypes: function() {
        return this.request('/room-types');
    },

    getAdminRoomTypes: function() {
        return this.request('/admin/room-types');
    },

    createRoomType: function(roomTypeData) {
        return this.request('/admin/room-types', {
            method: 'POST',
            body: JSON.stringify(roomTypeData)
        });
    },

    updateRoomType: function(id, roomTypeData) {
        return this.request(`/admin/room-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(roomTypeData)
        });
    },

    // Room unit management
    getRoomUnits: function() {
        return this.request('/admin/room-units');
    },

    getAdminRoomUnits: function() {
        return this.request('/admin/room-units');
    },

    createRoomUnit: function(roomTypeId, unitData) {
        return this.request(`/admin/room-types/${roomTypeId}/units`, {
            method: 'POST',
            body: JSON.stringify(unitData)
        });
    },

    updateRoomUnit: function(id, unitData) {
        return this.request(`/admin/room-units/${id}`, {
            method: 'PUT',
            body: JSON.stringify(unitData)
        });
    },

    // Get admin stats
    getAdminStats: function() {
        return this.request('/admin/stats');
    },

    // Get all bookings (admin)
    getAllBookings: function() {
        return this.request('/admin/bookings');
    },

    // Update booking (admin)
    updateBooking: function(id, data) {
        return this.request(`/admin/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // Create room (admin)
    createRoom: function(roomData) {
        return this.request('/admin/rooms', {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
    },

    // Update room (admin)
    updateRoom: function(id, roomData) {
        return this.request(`/admin/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(roomData)
        });
    },

    // Delete room (admin)
    deleteRoom: function(id) {
        return this.request(`/admin/rooms/${id}`, {
            method: 'DELETE'
        });
    },

    // Update room availability (admin)
    updateRoomAvailability: function(id, isAvailable) {
        return this.request(`/admin/rooms/${id}/availability`, {
            method: 'PATCH',
            body: JSON.stringify({ isAvailable })
        });
    }
};

// Navigation highlighting system
const navigation = {
    // Initialize navigation highlighting
    init: function() {
        this.highlightCurrentPage();
        this.highlightCurrentSection();
    },

    // Highlight current page in navigation
    highlightCurrentPage: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a[href]');
        
        // Remove active classes from all nav links
        navLinks.forEach(link => {
            link.classList.remove('text-orange-500', 'font-medium');
            link.classList.add('text-gray-700', 'hover:text-orange-500');
        });

        // Find and highlight the current page link
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Handle exact page matches
            if (href === currentPath) {
                link.classList.remove('text-gray-700', 'hover:text-orange-500');
                link.classList.add('text-orange-500', 'font-medium');
            }
            // Handle home page (/) matches
            else if (currentPath === '/' && (href === '/' || href === '/index.html')) {
                link.classList.remove('text-gray-700', 'hover:text-orange-500');
                link.classList.add('text-orange-500', 'font-medium');
            }
            // Handle about page with section links
            else if (currentPath === '/about' && href === '#our-story') {
                // Don't highlight about section link if we're on a different page
            }
        });
    },

    // Highlight current section (for single-page navigation)
    highlightCurrentSection: function() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll("nav a[href^='#']");
        
        if (sections.length === 0 || navLinks.length === 0) return;
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
                        // Only update if we're on the same page as the section
                        const currentPath = window.location.pathname;
                        const isHomePage = currentPath === '/' || currentPath === '/index.html';
                        
                        if (isHomePage) {
                            // Remove active from all section links
                            navLinks.forEach((link) => {
                                if (link.getAttribute('href').startsWith('#')) {
                                    link.classList.remove("text-orange-500", "font-medium");
                                    link.classList.add("text-gray-700", "hover:text-orange-500");
                                }
                            });
  
            // Highlight the matching nav link
            const activeLink = document.querySelector(`nav a[href="#${entry.target.id}"]`);
            if (activeLink) {
                                activeLink.classList.remove("text-gray-700", "hover:text-orange-500");
                                activeLink.classList.add("text-orange-500", "font-medium");
                            }
            }
          }
        });
      },
      { threshold: 0.6 }
    );
  
    sections.forEach((section) => observer.observe(section));
    }
};

// Initialize navigation when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    navigation.init();
  });
  
// Close modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close error modal
    const closeErrorModal = document.getElementById('close-error-modal');
    if (closeErrorModal) {
        closeErrorModal.addEventListener('click', function() {
            utils.hideError();
        });
    }

    // Close success modal
    const closeSuccessModal = document.getElementById('close-success-modal');
    if (closeSuccessModal) {
        closeSuccessModal.addEventListener('click', function() {
            utils.hideSuccess();
        });
    }
});
