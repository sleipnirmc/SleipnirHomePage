 // Admin functionality

// Image upload handling
let uploadedImages = [];
let editImages = [];

// Initialize drag and drop
function initializeDragDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const editDropZone = document.getElementById('editDropZone');
    const editFileInput = document.getElementById('editFileInput');

    // Setup drag and drop for add product
    setupDragDrop(dropZone, fileInput, 'add');
    setupDragDrop(editDropZone, editFileInput, 'edit');
}

// Setup drag and drop functionality
function setupDragDrop(dropZone, fileInput, mode) {
    if (!dropZone || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files, mode);
    }, false);

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files, mode);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file uploads
function handleFiles(files, mode) {
    ([...files]).forEach(file => uploadFile(file, mode));
}

// Upload file and create preview
function uploadFile(file, mode) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        const imageData = {
            dataUrl: reader.result,
            name: file.name,
            size: file.size
        };
        
        if (mode === 'add') {
            uploadedImages.push(imageData);
            displayPreviews(uploadedImages, 'previewContainer', 'add');
        } else {
            editImages.push(imageData);
            displayPreviews(editImages, 'editPreviewContainer', 'edit');
        }
    };
}

// Display image previews
function displayPreviews(images, containerId, mode) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    images.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${image.dataUrl}" alt="${image.name}">
            <button class="remove-btn" onclick="removeImage(${index}, '${mode}')">&times;</button>
        `;
        container.appendChild(preview);
    });
}

// Remove image from preview
function removeImage(index, mode) {
    if (mode === 'add') {
        uploadedImages.splice(index, 1);
        displayPreviews(uploadedImages, 'previewContainer', 'add');
    } else {
        editImages.splice(index, 1);
        displayPreviews(editImages, 'editPreviewContainer', 'edit');
    }
}

// Update sizes based on category
function updateSizes(category, containerId) {
    const container = document.getElementById(containerId);
    const sizes = getSizesForCategory(category);
    
    container.innerHTML = sizes.map(size => `
        <label class="size-checkbox">
            <input type="checkbox" value="${size}" checked>
            <span>${size}</span>
        </label>
    `).join('');
}

// Get sizes for category
function getSizesForCategory(category) {
    const sizeMap = {
        tshirt: ['S', 'M', 'L', 'XL', 'XXL'],
        hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
        jacket: ['S', 'M', 'L', 'XL', 'XXL'],
        jeans: ['28', '30', '32', '34', '36', '38'],
        other: ['One Size']
    };
    return sizeMap[category] || sizeMap.other;
}

// Category change handlers
document.getElementById('productCategory').addEventListener('change', (e) => {
    updateSizes(e.target.value, 'sizesContainer');
});

document.getElementById('editProductCategory').addEventListener('change', (e) => {
    updateSizes(e.target.value, 'editSizesContainer');
});

// Modal functions
function openEditModal(productId) {
    document.getElementById('editModal').style.display = 'block';
    loadProductForEdit(productId);
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editImages = [];
    document.getElementById('editPreviewContainer').innerHTML = '';
}

// Load product data for editing
async function loadProductForEdit(productId) {
    try {
        const doc = await firebase.firestore().collection('products').doc(productId).get();
        if (doc.exists) {
            const product = doc.data();
            document.getElementById('editProductId').value = productId;
            document.getElementById('editProductName').value = product.nameIs || '';
            document.getElementById('editProductNameEn').value = product.nameEn || '';
            document.getElementById('editProductDescription').value = product.description || '';
            document.getElementById('editProductCategory').value = product.category || '';
            document.getElementById('editProductPrice').value = product.price || '';
            document.getElementById('editMembersOnly').checked = product.membersOnly || false;
            
            // Update sizes
            updateSizes(product.category, 'editSizesContainer');
            
            // Load existing images
            if (product.images && product.images.length > 0) {
                editImages = product.images;
                displayPreviews(editImages, 'editPreviewContainer', 'edit');
            }
            
            // Check available sizes
            if (product.availableSizes) {
                const checkboxes = document.querySelectorAll('#editSizesContainer input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = product.availableSizes.includes(cb.value);
                });
            }
        }
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product data');
    }
}

// Make functions globally available
window.removeImage = removeImage;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;

// Add product form handler
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get selected sizes
    const selectedSizes = [];
    document.querySelectorAll('#sizesContainer input[type="checkbox"]:checked').forEach(cb => {
        selectedSizes.push(cb.value);
    });

    const productData = {
        nameIs: document.getElementById('productName').value,
        nameEn: document.getElementById('productNameEn').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        images: uploadedImages,
        availableSizes: selectedSizes,
        membersOnly: document.getElementById('membersOnly').checked,
        isNew: true,
        isPopular: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await firebase.firestore().collection('products').add(productData);
        alert('Product added successfully!');
        e.target.reset();
        uploadedImages = [];
        document.getElementById('previewContainer').innerHTML = '';
        loadProducts();
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error adding product. Please try again.');
    }
});

// Edit product form handler
document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('editProductId').value;
    
    // Get selected sizes
    const selectedSizes = [];
    document.querySelectorAll('#editSizesContainer input[type="checkbox"]:checked').forEach(cb => {
        selectedSizes.push(cb.value);
    });

    const productData = {
        nameIs: document.getElementById('editProductName').value,
        nameEn: document.getElementById('editProductNameEn').value,
        description: document.getElementById('editProductDescription').value,
        category: document.getElementById('editProductCategory').value,
        price: parseFloat(document.getElementById('editProductPrice').value),
        images: editImages,
        availableSizes: selectedSizes,
        membersOnly: document.getElementById('editMembersOnly').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await firebase.firestore().collection('products').doc(productId).update(productData);
        alert('Product updated successfully!');
        closeEditModal();
        loadProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Error updating product. Please try again.');
    }
});

// Load products for management
async function loadProducts() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '<p>Loading products...</p>';

    try {
        const snapshot = await firebase.firestore().collection('products').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            productsList.innerHTML = '<p>No products found.</p>';
            return;
        }

        productsList.innerHTML = snapshot.docs.map(doc => {
            const product = doc.data();
            const firstImage = product.images && product.images.length > 0 ? product.images[0].dataUrl : '';
            return `
                <div class="admin-card">
                    ${firstImage ? `<img src="${firstImage}" alt="${product.nameIs}">` : ''}
                    <h4>${product.nameIs} / ${product.nameEn}</h4>
                    <p>${product.description}</p>
                    <p><strong>Category:</strong> ${product.category}</p>
                    <p><strong>Price:</strong> ${product.price} ISK</p>
                    <p><strong>Sizes:</strong> ${product.availableSizes ? product.availableSizes.join(', ') : 'N/A'}</p>
                    <p><strong>Members Only:</strong> ${product.membersOnly ? 'Yes' : 'No'}</p>
                    <div style="margin-top: 15px;">
                        <button class="admin-btn edit" onclick="openEditModal('${doc.id}')">
                            Edit
                        </button>
                        <button class="admin-btn secondary" onclick="togglePopular('${doc.id}', ${!product.isPopular})">
                            ${product.isPopular ? 'Remove Popular' : 'Mark Popular'}
                        </button>
                        <button class="admin-btn secondary" onclick="toggleNew('${doc.id}', ${!product.isNew})">
                            ${product.isNew ? 'Remove New' : 'Mark New'}
                        </button>
                        <button class="admin-btn" style="background: #990000;" onclick="deleteProduct('${doc.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<p>Error loading products.</p>';
    }
}

// Toggle product popular status
async function togglePopular(productId, isPopular) {
    try {
        await firebase.firestore().collection('products').doc(productId).update({
            isPopular: isPopular
        });
        loadProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Error updating product.');
    }
}

// Toggle product new status
async function toggleNew(productId, isNew) {
    try {
        await firebase.firestore().collection('products').doc(productId).update({
            isNew: isNew
        });
        loadProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Error updating product.');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        await firebase.firestore().collection('products').doc(productId).delete();
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product.');
    }
}

// Event Management Functions

// Add event form handler
document.getElementById('addEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventData = {
        nameIs: document.getElementById('eventName').value,
        nameEn: document.getElementById('eventNameEn').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value,
        category: document.getElementById('eventCategory').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await firebase.firestore().collection('events').add(eventData);
        alert('Event added successfully!');
        e.target.reset();
        loadEvents();
    } catch (error) {
        console.error('Error adding event:', error);
        alert('Error adding event. Please try again.');
    }
});

// Load events for management
async function loadEvents() {
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '<p>Loading events...</p>';

    try {
        const snapshot = await firebase.firestore().collection('events').orderBy('date', 'desc').get();

        if (snapshot.empty) {
            eventsList.innerHTML = '<p>No events found.</p>';
            return;
        }

        eventsList.innerHTML = snapshot.docs.map(doc => {
            const event = doc.data();
            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'No date';
            return `
                <div class="admin-card">
                    <h4>${event.nameIs} / ${event.nameEn}</h4>
                    <p>${event.description}</p>
                    <p><strong>Date:</strong> ${eventDate}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p><strong>Category:</strong> ${event.category}</p>
                    <div style="margin-top: 15px;">
                        <button class="admin-btn edit" onclick="editEvent('${doc.id}')">
                            Edit
                        </button>
                        <button class="admin-btn" style="background: #990000;" onclick="deleteEvent('${doc.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        eventsList.innerHTML = '<p>Error loading events.</p>';
    }
}

// Edit event (placeholder for future implementation)
function editEvent(eventId) {
    alert('Edit event functionality will be implemented in a future update.');
    console.log('Edit event:', eventId);
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        await firebase.firestore().collection('events').doc(eventId).delete();
        loadEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event.');
    }
}

// Load orders
async function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '<p>Loading orders...</p>';
    
    try {
        const snapshot = await firebase.firestore()
            .collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        if (snapshot.empty) {
            ordersList.innerHTML = '<p>No orders yet.</p>';
            return;
        }
        
        let hasNewOrders = false;
        
        ordersList.innerHTML = snapshot.docs.map(doc => {
            const order = doc.data();
            const orderId = doc.id;
            const orderDate = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'Unknown';
            const isNew = !order.adminNotified;
            
            if (isNew) hasNewOrders = true;
            
            return `
                <div class="order-card ${isNew ? 'new-order' : ''}" id="order-${orderId}">
                    <div class="order-header">
                        <div>
                            <div class="order-number">Order #${orderId.substr(-8).toUpperCase()}</div>
                            <div style="color: var(--gray); font-size: 14px;">${orderDate}</div>
                        </div>
                        <div class="order-status ${order.status}">${order.status}</div>
                    </div>
                    
                    <div class="order-customer">
                        <strong>${order.userName}</strong><br>
                        ${order.userEmail}<br>
                        ${order.userAddress ? `${order.userAddress}, ${order.userCity} ${order.userPostalCode}` : 'No address provided'}
                    </div>
                    
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.productName} (${item.size}) x${item.quantity}</span>
                                <span>${formatPrice(item.subtotal)} ISK</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-total">
                        Total: ${formatPrice(order.totalAmount)} ISK
                    </div>
                    
                    <div class="order-actions">
                        ${isNew ? `<button class="admin-btn" onclick="markOrderAsRead('${orderId}')">Mark as Read</button>` : ''}
                        <button class="admin-btn ${order.status === 'pending' ? '' : 'secondary'}" 
                                onclick="updateOrderStatus('${orderId}', 'processing')"
                                ${order.status === 'completed' ? 'disabled' : ''}>
                            Processing
                        </button>
                        <button class="admin-btn ${order.status === 'completed' ? '' : 'secondary'}" 
                                onclick="updateOrderStatus('${orderId}', 'completed')">
                            Completed
                        </button>
                        <button class="admin-btn" style="background: var(--crimson);" 
                                onclick="sendOrderEmail('${orderId}')">
                            Send Email Summary
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Show/hide new order badge
        const badge = document.getElementById('newOrderBadge');
        if (badge) {
            badge.style.display = hasNewOrders ? 'inline' : 'none';
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = '<p>Error loading orders.</p>';
    }
}

// Mark order as read by admin
async function markOrderAsRead(orderId) {
    try {
        await firebase.firestore().collection('orders').doc(orderId).update({
            adminNotified: true
        });
        loadOrders();
    } catch (error) {
        console.error('Error marking order as read:', error);
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await firebase.firestore().collection('orders').doc(orderId).update({
            status: newStatus,
            [`${newStatus}At`]: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    }
}

// Send order email summary (placeholder)
async function sendOrderEmail(orderId) {
    try {
        const orderDoc = await firebase.firestore().collection('orders').doc(orderId).get();
        const order = orderDoc.data();
        
        // Create email content
        const emailContent = `
            New Order Received!
            
            Order ID: ${orderId.substr(-8).toUpperCase()}
            Customer: ${order.userName}
            Email: ${order.userEmail}
            Address: ${order.userAddress}, ${order.userCity} ${order.userPostalCode}
            
            Items:
            ${order.items.map(item => 
                `- ${item.productName} (Size: ${item.size}) x${item.quantity} = ${formatPrice(item.subtotal)} ISK`
            ).join('\n')}
            
            Total: ${formatPrice(order.totalAmount)} ISK
            
            Status: ${order.status}
        `;
        
        // In a real implementation, this would send an actual email
        console.log('Email would be sent to admin email:', emailContent);
        
        // For now, show the content in an alert
        alert(`Email summary would be sent to admin email\n\n${emailContent}`);
        
    } catch (error) {
        console.error('Error sending order email:', error);
        alert('Error sending email summary');
    }
}

// Format price helper
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Make functions globally available
window.markOrderAsRead = markOrderAsRead;
window.updateOrderStatus = updateOrderStatus;
window.sendOrderEmail = sendOrderEmail;

// Check for new orders periodically
function checkForNewOrders() {
    firebase.firestore()
        .collection('orders')
        .where('adminNotified', '==', false)
        .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const badge = document.getElementById('newOrderBadge');
                if (badge) {
                    badge.style.display = 'inline';
                }
                // Reload orders to show the new ones
                loadOrders();
            }
        });
}

// Make event functions globally available
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDragDrop();
    loadProducts();
    loadEvents();
    loadOrders();
    checkForNewOrders();
    
    // Initialize category with default sizes
    updateSizes('tshirt', 'sizesContainer');
});