
// Home page functionality

document.addEventListener('DOMContentLoaded', function() {
    loadRoomsPreview();
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


