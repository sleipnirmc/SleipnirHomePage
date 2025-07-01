// Admin functionality - Comprehensive management system

// Image upload handling
let uploadedImages = [];
let editImages = [];
let memberPhotoFile = null;

// Dashboard Stats Loading
async function loadDashboardStats() {
    try {
        // Get orders count
        const ordersSnapshot = await firebase.firestore().collection('orders').get();
        const pendingOrders = ordersSnapshot.docs.filter(doc => doc.data().status !== 'completed').length;
        
        document.getElementById('totalOrders').textContent = ordersSnapshot.size;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        
        // Get products count
        const productsSnapshot = await firebase.firestore().collection('products').get();
        document.getElementById('totalProducts').textContent = productsSnapshot.size;
        
        // Get members count
        const membersSnapshot = await firebase.firestore().collection('displayMembers').where('isActive', '==', true).get();
        document.getElementById('totalMembers').textContent = membersSnapshot.size;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Initialize drag and drop
function initializeDragDrop() {
    // Product image drop zones
    const productDropZone = document.getElementById('productDropZone');
    const productImages = document.getElementById('productImages');
    
    // Member photo drop zone
    const memberDropZone = document.getElementById('memberDropZone');
    const memberPhoto = document.getElementById('memberPhoto');
    
    // Setup drag and drop for products
    if (productDropZone && productImages) {
        setupDragDrop(productDropZone, productImages, 'product');
        
        // Click to upload
        productDropZone.addEventListener('click', () => productImages.click());
    }
    
    // Setup drag and drop for members
    if (memberDropZone && memberPhoto) {
        setupDragDrop(memberDropZone, memberPhoto, 'member');
        
        // Click to upload
        memberDropZone.addEventListener('click', () => memberPhoto.click());
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
    if (mode === 'member') {
        // For member photos, only handle one file
        if (files.length > 0) {
            handleMemberPhoto(files[0]);
        }
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

// Handle member photo upload
function handleMemberPhoto(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    memberPhotoFile = file;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        const preview = document.getElementById('memberPhotoPreview');
        preview.innerHTML = `
            <div class="image-preview" style="max-width: 200px;">
                <img src="${reader.result}" alt="Member photo" style="width: 100%; height: auto; border-radius: 8px;">
                <button class="remove-btn" onclick="removeMemberPhoto()" style="position: absolute; top: -5px; right: -5px; background: var(--mc-red); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
            </div>
        `;
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
    uploadedImages.splice(index, 1);
    displayProductPreviews();
}

// Remove member photo
function removeMemberPhoto() {
    memberPhotoFile = null;
    document.getElementById('memberPhotoPreview').innerHTML = '';
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
                        <button class="admin-btn edit" onclick="alert('Edit functionality coming soon!')">
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

// Load member requests (users who requested membership)
async function loadMemberRequests() {
    const memberRequests = document.getElementById('memberRequests');
    if (!memberRequests) return;
    
    memberRequests.innerHTML = '<p>Loading member requests...</p>';

    try {
        const snapshot = await firebase.firestore().collection('users')
            .where('memberRequestPending', '==', true)
            .get();

        if (snapshot.empty) {
            memberRequests.innerHTML = '<p>No pending member requests.</p>';
            return;
        }

        memberRequests.innerHTML = snapshot.docs.map(doc => {
            const user = doc.data();
            return `
                <div class="admin-card">
                    <h4>${user.fullName}</h4>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Address:</strong> ${user.address}, ${user.city} ${user.postalCode}</p>
                    <p><strong>Joined:</strong> ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                    <div style="margin-top: 15px;">
                        <button class="admin-btn" onclick="approveMember('${doc.id}')">
                            Approve
                        </button>
                        <button class="admin-btn secondary" onclick="rejectMember('${doc.id}')">
                            Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading member requests:', error);
        memberRequests.innerHTML = '<p>Error loading member requests.</p>';
    }
}

// Load current members (users with membership)
async function loadCurrentMembers() {
    const currentMembers = document.getElementById('currentMembers');
    if (!currentMembers) return;
    
    currentMembers.innerHTML = '<p>Loading members...</p>';

    try {
        const snapshot = await firebase.firestore().collection('users')
            .where('isMember', '==', true)
            .orderBy('memberApprovedAt', 'desc')
            .get();

        if (snapshot.empty) {
            currentMembers.innerHTML = '<p>No members found.</p>';
            return;
        }

        currentMembers.innerHTML = snapshot.docs.map(doc => {
            const member = doc.data();
            return `
                <div class="admin-card">
                    <h4>${member.fullName}</h4>
                    <p><strong>Email:</strong> ${member.email}</p>
                    <p><strong>Role:</strong> ${member.role || 'Member'}</p>
                    <p><strong>Member Since:</strong> ${member.memberApprovedAt ? new Date(member.memberApprovedAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                    ${member.role !== 'admin' ? `
                        <div style="margin-top: 15px;">
                            <button class="admin-btn secondary" onclick="removeMembership('${doc.id}')">
                                Remove Membership
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading members:', error);
        currentMembers.innerHTML = '<p>Error loading members.</p>';
    }
}

// Load display members (for About page)
async function loadDisplayMembers() {
    const displayMembersList = document.getElementById('displayMembersList');
    if (!displayMembersList) return;
    
    displayMembersList.innerHTML = '<p>Loading display members...</p>';
    
    try {
        const snapshot = await firebase.firestore()
            .collection('displayMembers')
            .where('isActive', '==', true)
            .orderBy('displayOrder', 'asc')
            .get();
        
        if (snapshot.empty) {
            displayMembersList.innerHTML = '<p>No display members found. Add members to show on the About page!</p>';
            return;
        }
        
        displayMembersList.innerHTML = '';
        snapshot.forEach(doc => {
            const member = doc.data();
            const memberCard = document.createElement('div');
            memberCard.className = 'member-card';
            memberCard.innerHTML = `
                <img src="${member.photoUrl || 'Images/placeholder-member.jpg'}" alt="${member.name}" class="member-photo-small">
                <div class="member-info">
                    <h4>${member.name}</h4>
                    ${member.role ? `<p style="color: var(--mc-red);">${member.role}</p>` : ''}
                    <p>Member since ${new Date(member.joinDate.seconds * 1000).getFullYear()}</p>
                    <p>Display Order: ${member.displayOrder}</p>
                </div>
                <div class="member-actions">
                    <button class="admin-btn edit" onclick="editDisplayMember('${doc.id}')">Edit</button>
                    <button class="admin-btn delete" onclick="deleteDisplayMember('${doc.id}')">Delete</button>
                </div>
            `;
            displayMembersList.appendChild(memberCard);
        });
    } catch (error) {
        console.error('Error loading display members:', error);
        displayMembersList.innerHTML = '<p>Error loading display members.</p>';
    }
}

// Approve member request
async function approveMember(userId) {
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            isMember: true,
            memberRequestPending: false,
            memberApprovedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Member approved successfully!');
        loadMemberRequests();
        loadCurrentMembers();
    } catch (error) {
        console.error('Error approving member:', error);
        alert('Error approving member.');
    }
}

// Reject member request
async function rejectMember(userId) {
    if (!confirm('Are you sure you want to reject this member request?')) return;

    try {
        await firebase.firestore().collection('users').doc(userId).update({
            memberRequestPending: false,
            memberRejectedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Member request rejected.');
        loadMemberRequests();
    } catch (error) {
        console.error('Error rejecting member:', error);
        alert('Error rejecting member request.');
    }
}

// Remove membership status
async function removeMembership(userId) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
        await firebase.firestore().collection('users').doc(userId).update({
            isMember: false,
            memberRemovedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Member removed successfully.');
        loadCurrentMembers();
    } catch (error) {
        console.error('Error removing member:', error);
        alert('Error removing member.');
    }
}

// Add display member form handler
document.addEventListener('DOMContentLoaded', () => {
    const addDisplayMemberForm = document.getElementById('addDisplayMemberForm');
    if (addDisplayMemberForm) {
        addDisplayMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const memberData = {
                name: document.getElementById('displayMemberName').value,
                role: document.getElementById('displayMemberRole').value || '',
                joinDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('displayMemberJoinDate').value)),
                isActive: true,
                displayOrder: Date.now(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                // Add member to displayMembers collection
                const docRef = await firebase.firestore().collection('displayMembers').add(memberData);
                
                // Upload photo if provided
                if (memberPhotoFile) {
                    const storage = firebase.storage();
                    const storageRef = storage.ref(`displayMembers/${docRef.id}/${memberPhotoFile.name}`);
                    
                    const uploadTask = await storageRef.put(memberPhotoFile);
                    const photoUrl = await uploadTask.ref.getDownloadURL();
                    
                    // Update member with photo URL
                    await firebase.firestore().collection('displayMembers').doc(docRef.id).update({
                        photoUrl: photoUrl
                    });
                }
                
                alert('Display member added successfully!');
                e.target.reset();
                removeMemberPhoto();
                loadDisplayMembers();
                
            } catch (error) {
                console.error('Error adding display member:', error);
                alert('Error adding display member. Please try again.');
            }
        });
    }
});

// Delete display member
async function deleteDisplayMember(memberId) {
    if (!confirm('Are you sure you want to delete this display member?')) return;
    
    try {
        // Soft delete - just mark as inactive
        await firebase.firestore().collection('displayMembers').doc(memberId).update({
            isActive: false,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Display member removed successfully.');
        loadDisplayMembers();
    } catch (error) {
        console.error('Error deleting display member:', error);
        alert('Error deleting display member.');
    }
}

// Edit display member (placeholder for now)
function editDisplayMember(memberId) {
    alert('Edit functionality coming soon!');
    // TODO: Implement edit modal
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

// Switch tabs
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#productsSection .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#productsSection .tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
}

function switchMemberTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#membersSection .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#membersSection .tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    
    // Load appropriate data
    if (tab === 'approveMembers') {
        loadMemberRequests();
        loadCurrentMembers();
    } else if (tab === 'displayMembers') {
        loadDisplayMembers();
    }
}

function switchOrderTab(status) {
    // Update tab buttons
    document.querySelectorAll('#ordersSection .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#ordersSection .tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(status + 'OrdersTab').classList.add('active');
}

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.removeProductImage = removeProductImage;
window.removeMemberPhoto = removeMemberPhoto;
window.togglePopular = togglePopular;
window.deleteProduct = deleteProduct;
window.loadProducts = loadProducts;
window.loadMemberRequests = loadMemberRequests;
window.loadCurrentMembers = loadCurrentMembers;
window.loadDisplayMembers = loadDisplayMembers;
window.approveMember = approveMember;
window.rejectMember = rejectMember;
window.removeMembership = removeMembership;
window.deleteDisplayMember = deleteDisplayMember;
window.editDisplayMember = editDisplayMember;
window.loadOrders = loadOrders;
window.completeOrder = completeOrder;
window.exportOrders = exportOrders;
window.switchTab = switchTab;
window.switchMemberTab = switchMemberTab;
window.switchOrderTab = switchOrderTab;

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