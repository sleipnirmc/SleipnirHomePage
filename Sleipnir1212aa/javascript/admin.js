// Admin functionality - Comprehensive management system with authentication

// Image upload handling
let uploadedImages = [];
let editImages = [];
let currentProductImages = [];
let editUploadedImages = [];

// Wait for Firebase auth state to be established
let authInitialized = false;

// Listen for auth state changes
window.addEventListener('authStateChanged', async (event) => {
    if (authInitialized) return; // Only run once
    authInitialized = true;
    
    console.log('Admin panel: Auth state changed', event.detail);
    
    try {
        // Protect admin page - redirects to login if not authenticated or not admin
        const isAuthorized = await protectAdminPage();
        console.log('Admin panel: Authorization result:', isAuthorized);
        
        if (isAuthorized) {
            // Initialize admin panel after authentication
            initializeAdminPanel();
        }
    } catch (error) {
        console.error('Admin authentication error:', error);
        window.location.href = 'login.html?redirect=admin';
    }
});

// Fallback in case auth state takes too long
setTimeout(() => {
    if (!authInitialized) {
        console.log('Admin panel: Auth state timeout, redirecting to login');
        window.location.href = 'login.html?redirect=admin';
    }
}, 5000); // 5 second timeout

// Initialize admin panel
async function initializeAdminPanel() {
    // Show the page content after successful authentication
    document.body.style.display = 'block';
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // Load dashboard stats
    await loadDashboardStats();
    
    // Initialize other admin functions
    initializeDragDrop();
    loadProducts();
    loadOrders();
    loadEvents();
    
    // Set up periodic refresh for dashboard stats
    setInterval(loadDashboardStats, 60000); // Refresh every minute
}

// Dashboard Stats Loading
async function loadDashboardStats() {
    console.log('Loading dashboard stats...');
    
    try {
        // Check if DOM elements exist
        const elementsExist = document.getElementById('totalUsers') && 
                            document.getElementById('totalMembers') &&
                            document.getElementById('totalOrders') &&
                            document.getElementById('pendingOrders') &&
                            document.getElementById('totalProducts') &&
                            document.getElementById('totalEvents');
                            
        if (!elementsExist) {
            console.error('Dashboard stat elements not found in DOM');
            return;
        }
        
        // Get users and members count
        console.log('Fetching users collection...');
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const totalUsers = usersSnapshot.size;
        
        // Count members - check for various possible formats
        let totalMembers = 0;
        let membersFromUsers = 0;
        
        // First check users collection for members field
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            // Check for boolean true, string 'true', or truthy value
            if (userData.members === true || userData.members === 'true' || userData.members) {
                membersFromUsers++;
            }
            // Debug first few users
            if (doc.id && membersFromUsers < 3) {
                console.log(`User ${doc.id} members field:`, userData.members, 'Type:', typeof userData.members);
            }
        });
        
        // Also check displayMembers collection (actual member profiles)
        try {
            console.log('Fetching displayMembers collection...');
            const displayMembersSnapshot = await firebase.firestore().collection('displayMembers').get();
            const displayMembersCount = displayMembersSnapshot.size;
            
            console.log('Member counts:', {
                fromUsersCollection: membersFromUsers,
                fromDisplayMembersCollection: displayMembersCount
            });
            
            // Use the displayMembers count as the primary source if it exists
            // Otherwise fall back to counting from users collection
            totalMembers = displayMembersCount > 0 ? displayMembersCount : membersFromUsers;
            
        } catch (error) {
            console.log('Could not fetch displayMembers collection, using users collection count:', error.message);
            totalMembers = membersFromUsers;
        }
        
        // Update DOM elements with null checks
        const totalUsersEl = document.getElementById('totalUsers');
        const totalMembersEl = document.getElementById('totalMembers');
        
        if (totalUsersEl) totalUsersEl.textContent = totalUsers;
        if (totalMembersEl) totalMembersEl.textContent = totalMembers;
        
        // Get orders count
        console.log('Fetching orders collection...');
        const ordersSnapshot = await firebase.firestore().collection('orders').get();
        const pendingOrders = ordersSnapshot.docs.filter(doc => {
            const status = doc.data().status;
            return status !== 'completed';
        }).length;
        
        const totalOrdersEl = document.getElementById('totalOrders');
        const pendingOrdersEl = document.getElementById('pendingOrders');
        
        if (totalOrdersEl) totalOrdersEl.textContent = ordersSnapshot.size;
        if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
        
        // Get products count
        console.log('Fetching products collection...');
        const productsSnapshot = await firebase.firestore().collection('products').get();
        const totalProductsEl = document.getElementById('totalProducts');
        if (totalProductsEl) totalProductsEl.textContent = productsSnapshot.size;
        
        // Get events count
        console.log('Fetching events collection...');
        const eventsSnapshot = await firebase.firestore().collection('events').get();
        const totalEventsEl = document.getElementById('totalEvents');
        if (totalEventsEl) totalEventsEl.textContent = eventsSnapshot.size;
        
        console.log('Dashboard stats loaded successfully:', {
            users: totalUsers,
            members: totalMembers,
            orders: ordersSnapshot.size,
            pendingOrders: pendingOrders,
            products: productsSnapshot.size,
            events: eventsSnapshot.size
        });
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        // Handle specific errors
        if (error.code === 'permission-denied') {
            console.error('Permission denied loading stats. Ensure admin privileges are properly set.');
            // Try to update UI to show error
            const elements = ['totalUsers', 'totalMembers', 'totalOrders', 'pendingOrders', 'totalProducts', 'totalEvents'];
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '!';
            });
        }
    }
}

// Initialize drag and drop
function initializeDragDrop() {
    // Product image drop zones
    const productDropZone = document.getElementById('productDropZone');
    const productImages = document.getElementById('productImages');
    
    // Setup drag and drop for products
    if (productDropZone && productImages) {
        setupDragDrop(productDropZone, productImages, 'product');
        
        // Click to upload
        productDropZone.addEventListener('click', () => productImages.click());
    }
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
    if (mode === 'edit') {
        // For edit product modal, use separate handler
        handleEditFiles(files);
    } else {
        // For products, handle multiple files
        ([...files]).forEach(file => uploadFile(file, mode));
    }
}

// Upload file and create preview
function uploadFile(file, mode) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload image files only');
        return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        const imageData = {
            dataUrl: reader.result,
            name: file.name,
            size: file.size,
            file: file // Keep reference to actual file for Firebase Storage
        };
        
        if (mode === 'product') {
            uploadedImages.push(imageData);
            displayProductPreviews();
        }
    };
}

// Display product image previews
function displayProductPreviews() {
    const container = document.getElementById('imagePreview');
    container.innerHTML = '';
    
    uploadedImages.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.style = 'position: relative; width: 100px; height: 100px; display: inline-block; margin: 5px;';
        preview.innerHTML = `
            <img src="${image.dataUrl}" alt="${image.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            <button class="remove-btn" onclick="removeProductImage(${index})" style="position: absolute; top: -5px; right: -5px; background: var(--mc-red); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
        `;
        container.appendChild(preview);
    });
}

// Remove product image
function removeProductImage(index) {
    // Prevent removing if it's the last image
    if (uploadedImages.length <= 1) {
        alert('Cannot remove the last image. Each product must have at least one image.');
        return;
    }
    
    uploadedImages.splice(index, 1);
    displayProductPreviews();
}

// Update sizes based on category
function updateSizes(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
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
document.addEventListener('DOMContentLoaded', () => {
    const productCategorySelect = document.getElementById('productCategory');
    if (productCategorySelect) {
        productCategorySelect.addEventListener('change', (e) => {
            updateSizes(e.target.value, 'sizesContainer');
        });
    }
    
    const editProductCategorySelect = document.getElementById('editProductCategory');
    if (editProductCategorySelect) {
        editProductCategorySelect.addEventListener('change', (e) => {
            updateSizes(e.target.value, 'editSizesContainer');
        });
    }
});

// Add product form handler
document.addEventListener('DOMContentLoaded', () => {
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get selected sizes
            const selectedSizes = [];
            document.querySelectorAll('#sizesContainer input[type="checkbox"]:checked').forEach(cb => {
                selectedSizes.push(cb.value);
            });

            if (uploadedImages.length === 0) {
                alert('Please upload at least one product image');
                return;
            }

            const productData = {
                nameIs: document.getElementById('productNameIs').value,
                nameEn: document.getElementById('productNameEn').value,
                description: document.getElementById('productDescription').value,
                category: document.getElementById('productCategory').value,
                price: parseFloat(document.getElementById('productPrice').value),
                images: uploadedImages.map(img => ({ dataUrl: img.dataUrl, name: img.name })),
                availableSizes: selectedSizes,
                membersOnly: document.getElementById('productMembersOnly').value === 'true',
                isNew: true,
                isPopular: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await firebase.firestore().collection('products').add(productData);
                alert('Product added successfully!');
                e.target.reset();
                uploadedImages = [];
                document.getElementById('imagePreview').innerHTML = '';
                loadProducts();
            } catch (error) {
                console.error('Error adding product:', error);
                alert('Error adding product. Please try again.');
            }
        });
    }
});

// Load products for management
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '<p>Loading products...</p>';

    try {
        const snapshot = await firebase.firestore().collection('products').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<p>No products found.</p>';
            return;
        }

        productsGrid.innerHTML = snapshot.docs.map(doc => {
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
                        <button class="admin-btn edit" onclick="editProduct('${doc.id}')">
                            Edit
                        </button>
                        <button class="admin-btn secondary" onclick="togglePopular('${doc.id}', ${!product.isPopular})">
                            ${product.isPopular ? 'Remove Popular' : 'Mark Popular'}
                        </button>
                        <button class="admin-btn delete" onclick="deleteProduct('${doc.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p>Error loading products.</p>';
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

// Edit product
async function editProduct(productId) {
    try {
        // Get product data
        const doc = await firebase.firestore().collection('products').doc(productId).get();
        if (!doc.exists) {
            alert('Product not found');
            return;
        }

        const product = doc.data();
        
        // Populate form fields
        document.getElementById('editProductId').value = productId;
        document.getElementById('editProductNameIs').value = product.nameIs || '';
        document.getElementById('editProductNameEn').value = product.nameEn || '';
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductCategory').value = product.category || '';
        document.getElementById('editProductPrice').value = product.price || '';
        document.getElementById('editProductMembersOnly').value = product.membersOnly ? 'true' : 'false';
        
        // Update sizes for the category
        updateSizes(product.category || 'other', 'editSizesContainer');
        
        // Check the available sizes
        setTimeout(() => {
            if (product.availableSizes) {
                product.availableSizes.forEach(size => {
                    const checkbox = document.querySelector(`#editSizesContainer input[value="${size}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }, 100);
        
        // Display current images
        currentProductImages = product.images || [];
        displayCurrentImages();
        
        // Clear any new uploaded images
        editUploadedImages = [];
        document.getElementById('editImagePreview').innerHTML = '';
        
        // Show modal
        document.getElementById('editProductModal').style.display = 'block';
        
        // Initialize drag and drop for edit modal
        initializeEditDragDrop();
        
    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Error loading product details.');
    }
}

// Display current product images
function displayCurrentImages() {
    const container = document.getElementById('editCurrentImages');
    container.innerHTML = '';
    
    if (currentProductImages.length === 0) {
        container.innerHTML = '<p style="color: var(--gray);">No current images</p>';
        return;
    }
    
    currentProductImages.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.style = 'position: relative; width: 100px; height: 100px; display: inline-block; margin: 5px;';
        preview.innerHTML = `
            <img src="${image.dataUrl}" alt="Product image" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            <button class="remove-btn" onclick="removeCurrentImage(${index})" style="position: absolute; top: -5px; right: -5px; background: var(--mc-red); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
        `;
        container.appendChild(preview);
    });
}

// Remove current image
function removeCurrentImage(index) {
    // Calculate total images (current + new uploads)
    const totalImages = currentProductImages.length + editUploadedImages.length;
    
    // Prevent removing if it's the last image
    if (totalImages <= 1) {
        alert('Cannot remove the last image. Each product must have at least one image.');
        return;
    }
    
    currentProductImages.splice(index, 1);
    displayCurrentImages();
}

// Initialize drag and drop for edit modal
function initializeEditDragDrop() {
    const editDropZone = document.getElementById('editProductDropZone');
    const editProductImages = document.getElementById('editProductImages');
    
    if (editDropZone && editProductImages) {
        // Remove any existing listeners
        const newDropZone = editDropZone.cloneNode(true);
        editDropZone.parentNode.replaceChild(newDropZone, editDropZone);
        
        setupDragDrop(newDropZone, editProductImages, 'edit');
        
        // Click to upload
        newDropZone.addEventListener('click', () => editProductImages.click());
        
        // Handle file input change
        editProductImages.addEventListener('change', (e) => {
            const files = e.target.files;
            handleEditFiles(files);
        });
    }
}

// Handle files for edit modal
function handleEditFiles(files) {
    ([...files]).forEach(file => uploadEditFile(file));
}

// Upload file for edit modal
function uploadEditFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload image files only');
        return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        const imageData = {
            dataUrl: reader.result,
            name: file.name,
            size: file.size,
            file: file
        };
        
        editUploadedImages.push(imageData);
        displayEditPreviews();
    };
}

// Display edit image previews
function displayEditPreviews() {
    const container = document.getElementById('editImagePreview');
    container.innerHTML = '';
    
    editUploadedImages.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.style = 'position: relative; width: 100px; height: 100px; display: inline-block; margin: 5px;';
        preview.innerHTML = `
            <img src="${image.dataUrl}" alt="${image.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
            <button class="remove-btn" onclick="removeEditImage(${index})" style="position: absolute; top: -5px; right: -5px; background: var(--mc-red); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
        `;
        container.appendChild(preview);
    });
}

// Remove edit image
function removeEditImage(index) {
    // Calculate total images (current + new uploads)
    const totalImages = currentProductImages.length + editUploadedImages.length;
    
    // Prevent removing if it's the last image
    if (totalImages <= 1) {
        alert('Cannot remove the last image. Each product must have at least one image.');
        return;
    }
    
    editUploadedImages.splice(index, 1);
    displayEditPreviews();
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
    currentProductImages = [];
    editUploadedImages = [];
}

// Handle edit product form submission
document.addEventListener('DOMContentLoaded', () => {
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = document.getElementById('editProductId').value;
            
            // Get selected sizes
            const selectedSizes = [];
            document.querySelectorAll('#editSizesContainer input[type="checkbox"]:checked').forEach(cb => {
                selectedSizes.push(cb.value);
            });
            
            // Combine current images with new uploads
            const allImages = [...currentProductImages, ...editUploadedImages.map(img => ({ dataUrl: img.dataUrl, name: img.name }))];
            
            if (allImages.length === 0) {
                alert('Please keep at least one product image');
                return;
            }
            
            const updatedData = {
                nameIs: document.getElementById('editProductNameIs').value,
                nameEn: document.getElementById('editProductNameEn').value,
                description: document.getElementById('editProductDescription').value,
                category: document.getElementById('editProductCategory').value,
                price: parseFloat(document.getElementById('editProductPrice').value),
                images: allImages,
                availableSizes: selectedSizes,
                membersOnly: document.getElementById('editProductMembersOnly').value === 'true',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                await firebase.firestore().collection('products').doc(productId).update(updatedData);
                alert('Product updated successfully!');
                closeEditModal();
                loadProducts();
            } catch (error) {
                console.error('Error updating product:', error);
                alert('Error updating product. Please try again.');
            }
        });
    }
});

// Event Management Functions

// Add event form handler
document.addEventListener('DOMContentLoaded', () => {
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const eventData = {
                nameIs: document.getElementById('eventNameIs').value,
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
    }
});

// Load events for management
async function loadEvents() {
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;
    
    eventsGrid.innerHTML = '<p>Loading events...</p>';

    try {
        const snapshot = await firebase.firestore().collection('events').orderBy('date', 'desc').get();

        if (snapshot.empty) {
            eventsGrid.innerHTML = '<p>No events found.</p>';
            return;
        }

        eventsGrid.innerHTML = snapshot.docs.map(doc => {
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
                        <button class="admin-btn delete" onclick="deleteEvent('${doc.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        eventsGrid.innerHTML = '<p>Error loading events.</p>';
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

// Load orders for admin panel
async function loadOrders() {
    // Load pending orders
    const pendingOrdersBody = document.getElementById('pendingOrdersBody');
    // Load completed orders
    const completedOrdersBody = document.getElementById('completedOrdersBody');
    
    try {
        const ordersSnapshot = await firebase.firestore()
            .collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        
        const pendingOrders = [];
        const completedOrders = [];
        
        ordersSnapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            if (order.status === 'completed') {
                completedOrders.push(order);
            } else {
                pendingOrders.push(order);
            }
        });
        
        // Display pending orders
        if (pendingOrdersBody) {
            displayOrdersInTable(pendingOrders, pendingOrdersBody, true);
        }
        
        // Display completed orders
        if (completedOrdersBody) {
            displayOrdersInTable(completedOrders, completedOrdersBody, false);
        }
        
        // Update stats
        const pendingOrdersCount = document.getElementById('pendingOrders');
        if (pendingOrdersCount) {
            pendingOrdersCount.textContent = pendingOrders.length;
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Display orders in table format
function displayOrdersInTable(orders, tbody, showActions) {
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        const orderDate = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString('is-IS') : 'Unknown';
        const items = order.items.map(item => `${item.productName} (${item.size}) x${item.quantity}`).join('<br>');
        
        return `
            <tr>
                <td>#${order.id.substr(-8).toUpperCase()}</td>
                <td>${order.userName || 'Unknown'}</td>
                <td>${items}</td>
                <td>${formatPrice(order.totalAmount)} ISK</td>
                <td>${orderDate}</td>
                <td><span class="order-status ${order.status}">${order.status}</span></td>
                ${showActions ? `
                    <td>
                        <button class="admin-btn" onclick="completeOrder('${order.id}')">Complete</button>
                    </td>
                ` : `<td>${order.completedAt ? new Date(order.completedAt.toDate()).toLocaleDateString('is-IS') : '-'}</td>`}
            </tr>
        `;
    }).join('');
}

// Complete order
async function completeOrder(orderId) {
    if (!confirm('Mark this order as completed?')) return;
    
    try {
        await firebase.firestore().collection('orders').doc(orderId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Order marked as completed!');
        loadOrders();
        loadDashboardStats();
    } catch (error) {
        console.error('Error completing order:', error);
        alert('Error completing order.');
    }
}

// Export orders to CSV
async function exportOrders(type) {
    try {
        let query = firebase.firestore().collection('orders');
        
        // Apply filters based on type
        if (type === 'pending') {
            query = query.where('status', 'in', ['pending', 'processing']);
        } else if (type === 'completed') {
            query = query.where('status', '==', 'completed');
        }
        
        // Apply date filters if provided
        const startDate = document.getElementById('exportStartDate')?.value;
        const endDate = document.getElementById('exportEndDate')?.value;
        
        if (startDate) {
            query = query.where('createdAt', '>=', new Date(startDate));
        }
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.where('createdAt', '<=', endDateTime);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            alert('No orders found for the selected criteria.');
            return;
        }
        
        // Create CSV content
        const headers = ['Order ID', 'Date', 'Customer Name', 'Email', 'Address', 'City', 'Postal Code', 'Items', 'Total (ISK)', 'Status'];
        const rows = [headers];
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString('is-IS') : '';
            const items = order.items.map(item => `${item.productName} (${item.size}) x${item.quantity}`).join('; ');
            
            rows.push([
                doc.id.substr(-8).toUpperCase(),
                orderDate,
                order.userName || '',
                order.userEmail || '',
                order.userAddress || '',
                order.userCity || '',
                order.userPostalCode || '',
                items,
                order.totalAmount || 0,
                order.status || 'pending'
            ]);
        });
        
        // Convert to CSV string
        const csvContent = rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Error exporting orders:', error);
        alert('Error exporting orders. Please try again.');
    }
}

// Format price helper
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.removeProductImage = removeProductImage;
window.togglePopular = togglePopular;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
window.removeCurrentImage = removeCurrentImage;
window.removeEditImage = removeEditImage;
window.loadProducts = loadProducts;
window.loadEvents = loadEvents;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.loadOrders = loadOrders;
window.completeOrder = completeOrder;
window.exportOrders = exportOrders;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDragDrop();
    
    // Only load if we're on the admin page
    if (window.location.pathname.includes('admin.html')) {
        // The loadDashboardStats is called from admin.html after auth check
        // Initialize tabs with default sizes if elements exist
        updateSizes('tshirt', 'sizesContainer');
    }
});