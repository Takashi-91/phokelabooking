// Home page functionality

document.addEventListener('DOMContentLoaded', function() {
    loadRoomsPreview();
    initializeContactForm();
    initializeAnimations();
});

async function loadRoomsPreview() {
    try {
        const rooms = await api.getRooms();
        displayRoomsPreview(rooms.slice(0, 4)); // Show first 4 rooms
    } catch (error) {
        console.error('Failed to load rooms:', error);
        // Show fallback content
        document.getElementById('rooms-preview').innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">Unable to load rooms at the moment. Please try again later.</p>
            </div>
        `;
    }
}

function displayRoomsPreview(rooms) {
    const roomsPreview = document.getElementById('rooms-preview');
    if (!roomsPreview) return;

    if (rooms.length === 0) {
        roomsPreview.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">No rooms available at the moment.</p>
            </div>
        `;
        return;
    }

    roomsPreview.innerHTML = rooms.map(room => `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div class="relative">
                <img src="${room.imageUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&h=300'}" 
                     alt="${room.name}" 
                     class="w-full h-48 object-cover">
                <div class="absolute top-4 right-4">
                    <span class="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">Featured</span>
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">${room.name}</h3>
                <p class="text-gray-600 text-sm mb-4 leading-relaxed">${room.description.substring(0, 100)}...</p>
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center text-gray-500 text-sm">
                        <i class="fas fa-users mr-2"></i>
                        <span>${room.maxGuests} Guest${room.maxGuests > 1 ? 's' : ''}</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-900">
                        ${utils.formatCurrency(room.price)}<span class="text-sm font-normal text-gray-500">/night</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${room.amenities.slice(0, 3).map(amenity => 
                        `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${amenity}</span>`
                    ).join('')}
                    ${room.amenities.length > 3 ? `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">+${room.amenities.length - 3} more</span>` : ''}
                </div>
                <a href="/booking.html" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 text-center block">
                    Book Now
                </a>
            </div>
        </div>
    `).join('');
}

// Contact form functionality
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', handleContactFormSubmit);
}

async function handleContactFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');
    
    // Get form data
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value
    };

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
        showContactError('Please fill in all required fields.');
        return;
    }

    // Validate email format
    if (!utils.validateEmail(formData.email)) {
        showContactError('Please enter a valid email address.');
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    submitLoading.classList.remove('hidden');

    try {
        // Send contact message
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to send message');
        }

        // Success
        showContactSuccess('Thank you for your message! We\'ll get back to you soon.');
        document.getElementById('contact-form').reset();
        
    } catch (error) {
        console.error('Contact form error:', error);
        showContactError('Failed to send message. Please try again.');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
    }
}

function showContactError(message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.contact-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create error alert
    const alert = document.createElement('div');
    alert.className = 'contact-alert bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
    alert.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insert before form
    const form = document.getElementById('contact-form');
    form.parentNode.insertBefore(alert, form);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function showContactSuccess(message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.contact-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create success alert
    const alert = document.createElement('div');
    alert.className = 'contact-alert bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4';
    alert.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insert before form
    const form = document.getElementById('contact-form');
    form.parentNode.insertBefore(alert, form);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Framer Motion-style animation system
function initializeAnimations() {
    // Create intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Add stagger delay for stagger-children
                if (entry.target.classList.contains('stagger-children')) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        setTimeout(() => {
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll(`
        .fade-in,
        .fade-in-left,
        .fade-in-right,
        .scale-in,
        .slide-up,
        .stagger-children,
        .card-entrance
    `);

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Add hover effects to interactive elements
    addHoverEffects();
    
    // Add loading animations
    addLoadingAnimations();
}

function addHoverEffects() {
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('.btn-animate');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add hover effects to cards
    const cards = document.querySelectorAll('.hover-lift');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '';
        });
    });

    // Add hover effects to scale elements
    const scaleElements = document.querySelectorAll('.hover-scale');
    scaleElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

function addLoadingAnimations() {
    // Add loading animation to form submit button
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        
        submitBtn.addEventListener('click', function() {
            if (this.disabled) return;
            
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
            this.disabled = true;
            
            // Reset after 3 seconds if no response
            setTimeout(() => {
                if (this.disabled) {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            }, 3000);
        });
    }
}

// Utility function to trigger animations programmatically
function triggerAnimation(element, animationClass) {
    element.classList.remove(animationClass);
    // Force reflow
    element.offsetHeight;
    element.classList.add(animationClass);
}

// Utility function to stagger animations
function staggerAnimation(elements, delay = 100) {
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('visible');
        }, index * delay);
    });
}