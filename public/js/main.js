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
    

    // Get rooms
    getRooms: function() {
        return this.request('/rooms');
    },

    // Get room by ID
    getRoom: function(id) {
        return this.request(`/rooms/${id}`);
    },

    // Check room availability
    checkAvailability: function(roomId, checkinDate, checkoutDate) {
        return this.request(`/rooms/${roomId}/check-availability`, {
            method: 'POST',
            body: JSON.stringify({ checkinDate, checkoutDate })
        });
    },

    // Create booking
    createBooking: function(bookingData) {
        return this.request('/bookings/with-payment', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
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

document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll("nav a[href^='#']");
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Remove "active" from all links
            navLinks.forEach((link) => link.classList.remove("text-orange-500"));
  
            // Highlight the matching nav link
            const activeLink = document.querySelector(`nav a[href="#${entry.target.id}"]`);
            if (activeLink) {
              activeLink.classList.add("text-orange-500");
            }
          }
        });
      },
      { threshold: 0.6 }
    );
  
    sections.forEach((section) => observer.observe(section));
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
