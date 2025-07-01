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

// Load member requests
async function loadMemberRequests() {
    const memberRequests = document.getElementById('memberRequests');
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
                <div class="member-request">
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

// Load current members
async function loadCurrentMembers() {
    const currentMembers = document.getElementById('currentMembers');
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
                            <button class="admin-btn secondary" onclick="removeMember('${doc.id}')">
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

// Remove member status
async function removeMember(userId) {
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

// Logout button
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    firebase.auth().signOut().then(() => {
        // Redirect to login page after logout
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    });
});

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

// Load current admins
async function loadCurrentAdmins() {
    const currentAdmins = document.getElementById('currentAdmins');
    currentAdmins.innerHTML = '<p>Loading admins...</p>';

    try {
        const snapshot = await firebase.firestore().collection('users')
            .where('role', '==', 'admin')
            .get();

        if (snapshot.empty) {
            currentAdmins.innerHTML = '<p>No admins found.</p>';
            return;
        }

        currentAdmins.innerHTML = snapshot.docs.map(doc => {
            const admin = doc.data();
            const currentUser = firebase.auth().currentUser;
            const isCurrentUser = currentUser && currentUser.uid === doc.id;
            
            return `
                <div class="admin-card">
                    <h4>${admin.fullName || 'Admin'}</h4>
                    <p><strong>Email:</strong> ${admin.email}</p>
                    <p><strong>Admin Since:</strong> ${admin.adminGrantedAt ? new Date(admin.adminGrantedAt.toDate()).toLocaleDateString() : 'Original Admin'}</p>
                    ${!isCurrentUser ? `
                        <div style="margin-top: 15px;">
                            <button class="admin-btn secondary" onclick="removeAdmin('${doc.id}', '${admin.email}')">
                                Remove Admin Access
                            </button>
                        </div>
                    ` : '<p style="color: var(--gray); font-style: italic;">Current User</p>'}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading admins:', error);
        currentAdmins.innerHTML = '<p>Error loading admins.</p>';
    }
}

// Grant admin access
document.getElementById('grantAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const messageDiv = document.getElementById('adminGrantMessage');
    
    try {
        // Find user by email
        const usersSnapshot = await firebase.firestore().collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            messageDiv.className = 'error-message';
            messageDiv.style.display = 'block';
            messageDiv.textContent = 'No user found with this email address.';
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.role === 'admin') {
            messageDiv.className = 'error-message';
            messageDiv.style.display = 'block';
            messageDiv.textContent = 'This user is already an admin.';
            return;
        }
        
        // Update user role to admin
        await firebase.firestore().collection('users').doc(userDoc.id).update({
            role: 'admin',
            adminGrantedAt: firebase.firestore.FieldValue.serverTimestamp(),
            adminGrantedBy: firebase.auth().currentUser.uid
        });
        
        messageDiv.className = 'success-message';
        messageDiv.style.display = 'block';
        messageDiv.textContent = `Admin access granted to ${userData.fullName || email}.`;
        
        // Clear form
        document.getElementById('grantAdminForm').reset();
        
        // Reload admin list
        loadCurrentAdmins();
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Error granting admin access:', error);
        messageDiv.className = 'error-message';
        messageDiv.style.display = 'block';
        messageDiv.textContent = 'Error granting admin access. Please try again.';
    }
});

// Remove admin access
async function removeAdmin(userId, userEmail) {
    if (!confirm(`Are you sure you want to remove admin access from ${userEmail}?`)) return;
    
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            role: 'customer',
            adminRemovedAt: firebase.firestore.FieldValue.serverTimestamp(),
            adminRemovedBy: firebase.auth().currentUser.uid
        });
        
        alert('Admin access removed successfully.');
        loadCurrentAdmins();
    } catch (error) {
        console.error('Error removing admin:', error);
        alert('Error removing admin access.');
    }
}

// Make removeAdmin globally available
window.removeAdmin = removeAdmin;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDragDrop();
    loadProducts();
    loadMemberRequests();
    loadCurrentMembers();
    loadCurrentAdmins();
    loadOrders();
    checkForNewOrders();
    
    // Initialize category with default sizes
    updateSizes('tshirt', 'sizesContainer');
});