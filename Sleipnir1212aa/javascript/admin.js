// Admin functionality - Comprehensive management system

// Image upload handling
let uploadedImages = [];
let editImages = [];
let memberPhotoFile = null;
let memberPhotoData = null;
let currentProductImages = [];
let editUploadedImages = [];

// Email monitoring data
let emailStats = null;
let emailChartData = null;

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
    } else if (mode === 'editMember') {
        // For edit member modal
        if (files.length > 0) {
            handleEditMemberPhoto(files[0]);
        }
    } else if (mode === 'edit') {
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
        // Store the base64 data
        memberPhotoData = reader.result;
        
        const preview = document.getElementById('memberPhotoPreview');
        preview.innerHTML = `
            <div class="image-preview" style="position: relative; max-width: 200px;">
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
    // Prevent removing if it's the last image
    if (uploadedImages.length <= 1) {
        alert('Cannot remove the last image. Each product must have at least one image.');
        return;
    }
    
    uploadedImages.splice(index, 1);
    displayProductPreviews();
}

// Remove member photo
function removeMemberPhoto() {
    memberPhotoFile = null;
    memberPhotoData = null;
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
                    ${member.motorcycleType ? `<p style="color: var(--gray);">🏍️ ${member.motorcycleType}</p>` : ''}
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
                motorcycleType: document.getElementById('displayMemberMotorcycleType').value || '',
                joinDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('displayMemberJoinDate').value)),
                isActive: true,
                displayOrder: Date.now(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                // Add photo data if provided
                if (memberPhotoData) {
                    memberData.photoUrl = memberPhotoData;
                }
                
                // Add member to displayMembers collection with photo
                const docRef = await firebase.firestore().collection('displayMembers').add(memberData);
                
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

// Edit display member
let editMemberPhotoFile = null;
let editMemberPhotoData = null;
let currentEditMember = null;

async function editDisplayMember(memberId) {
    try {
        // Get member data
        const memberDoc = await firebase.firestore().collection('displayMembers').doc(memberId).get();
        if (!memberDoc.exists) {
            alert('Member not found');
            return;
        }
        
        currentEditMember = { id: memberId, ...memberDoc.data() };
        
        // Populate form fields
        document.getElementById('editMemberId').value = memberId;
        document.getElementById('editMemberName').value = currentEditMember.name || '';
        document.getElementById('editMemberRole').value = currentEditMember.role || '';
        document.getElementById('editMemberMotorcycleType').value = currentEditMember.motorcycleType || '';
        
        // Convert timestamp to date string for input
        if (currentEditMember.joinDate) {
            const date = new Date(currentEditMember.joinDate.seconds * 1000);
            document.getElementById('editMemberJoinDate').value = date.toISOString().split('T')[0];
        }
        
        document.getElementById('editMemberDisplayOrder').value = currentEditMember.displayOrder || '';
        document.getElementById('editMemberStatus').value = currentEditMember.isActive !== false ? 'true' : 'false';
        
        // Display current photo
        const currentPhotoDiv = document.getElementById('editMemberCurrentPhoto');
        if (currentEditMember.photoUrl) {
            currentPhotoDiv.innerHTML = `
                <img src="${currentEditMember.photoUrl}" alt="${currentEditMember.name}" 
                     style="max-width: 200px; height: auto; border-radius: 8px;">
            `;
        } else {
            currentPhotoDiv.innerHTML = '<p style="color: var(--gray);">No photo uploaded</p>';
        }
        
        // Clear preview
        document.getElementById('editMemberPhotoPreview').innerHTML = '';
        editMemberPhotoFile = null;
        editMemberPhotoData = null;
        
        // Show modal
        document.getElementById('editMemberModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading member for edit:', error);
        alert('Error loading member data');
    }
}

// Close edit member modal
function closeEditMemberModal() {
    document.getElementById('editMemberModal').style.display = 'none';
    document.getElementById('editMemberForm').reset();
    editMemberPhotoFile = null;
    editMemberPhotoData = null;
    currentEditMember = null;
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No orders found</td></tr>';
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
                        <button class="admin-btn delete" onclick="deleteOrder('${order.id}')" style="margin-left: 5px;">Delete</button>
                    </td>
                ` : `
                    <td>${order.completedAt ? new Date(order.completedAt.toDate()).toLocaleDateString('is-IS') : '-'}</td>
                    <td>
                        <button class="admin-btn delete" onclick="deleteOrder('${order.id}')">Delete</button>
                    </td>
                `}
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

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
    
    try {
        await firebase.firestore().collection('orders').doc(orderId).delete();
        
        alert('Order deleted successfully!');
        loadOrders();
        loadDashboardStats();
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order.');
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
    } else if (tab === 'currentMembers') {
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

// Email Monitoring Functions
async function loadEmailMonitoring() {
    try {
        // Load email stats from the last 24 hours by default
        const timeRange = parseInt(document.getElementById('emailTimeRange')?.value || '24');
        await updateEmailMetrics(timeRange);
    } catch (error) {
        console.error('Error loading email monitoring:', error);
    }
}

async function updateEmailMetrics(hours) {
    try {
        const timeWindow = (hours || 24) * 60 * 60 * 1000; // Convert to milliseconds
        
        // Get email tracking data
        const trackingSnapshot = await firebase.firestore().collection('emailTracking').get();
        const cutoffTime = new Date(Date.now() - timeWindow);
        
        // Calculate stats
        let totalSent = 0;
        let totalVerified = 0;
        let totalPending = 0;
        const deliveryTimes = [];
        const hourlyData = {};
        const recentEmails = [];
        
        trackingSnapshot.forEach(doc => {
            const data = doc.data();
            const userId = doc.id;
            
            if (data.lastSent && data.lastSent.toDate() > cutoffTime) {
                totalSent++;
                
                if (data.status === 'verified') {
                    totalVerified++;
                    
                    // Calculate delivery time
                    if (data.verifiedAt && data.lastSent) {
                        const deliveryTime = data.verifiedAt.toDate() - data.lastSent.toDate();
                        deliveryTimes.push(deliveryTime);
                    }
                } else if (data.status === 'sent') {
                    totalPending++;
                }
                
                // Group by hour for chart
                const sentHour = new Date(data.lastSent.toDate());
                sentHour.setMinutes(0, 0, 0);
                const hourKey = sentHour.toISOString();
                
                if (!hourlyData[hourKey]) {
                    hourlyData[hourKey] = { sent: 0, verified: 0 };
                }
                hourlyData[hourKey].sent++;
                if (data.status === 'verified') {
                    hourlyData[hourKey].verified++;
                }
                
                // Add to recent emails
                recentEmails.push({
                    userId: userId,
                    sentCount: data.sentCount || 1,
                    reminderCount: data.reminderCount || 0,
                    lastSent: data.lastSent?.toDate(),
                    status: data.status,
                    verifiedAt: data.verifiedAt?.toDate()
                });
            }
        });
        
        // Calculate delivery rate and average time
        const deliveryRate = totalSent > 0 ? Math.round((totalVerified / totalSent) * 100) : 0;
        const avgDeliveryTime = deliveryTimes.length > 0 
            ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 1000 / 60) 
            : 0;
        
        // Update stats display
        document.getElementById('emailsSent').textContent = totalSent;
        document.getElementById('emailsVerified').textContent = totalVerified;
        document.getElementById('deliveryRate').textContent = deliveryRate + '%';
        document.getElementById('avgDeliveryTime').textContent = avgDeliveryTime + 'm';
        
        // Update hourly chart
        updateHourlyChart(hourlyData);
        
        // Update recent emails table
        await updateRecentEmailsTable(recentEmails.sort((a, b) => b.lastSent - a.lastSent).slice(0, 20));
        
        // Update recommendations
        updateEmailRecommendations(deliveryRate, avgDeliveryTime, totalPending, totalVerified);
        
    } catch (error) {
        console.error('Error updating email metrics:', error);
    }
}

function updateHourlyChart(hourlyData) {
    const chartContainer = document.getElementById('hourlyEmailChart');
    chartContainer.innerHTML = '';
    
    // Convert data to array and sort by time
    const chartData = Object.entries(hourlyData)
        .map(([hour, data]) => ({
            hour: new Date(hour),
            sent: data.sent,
            verified: data.verified
        }))
        .sort((a, b) => a.hour - b.hour);
    
    if (chartData.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: var(--gray);">No email data available for this time range</p>';
        return;
    }
    
    // Simple ASCII chart (in production, use Chart.js or similar)
    const maxValue = Math.max(...chartData.map(d => d.sent));
    const chartHeight = 20;
    
    let chartHTML = '<div style="font-family: monospace; white-space: pre; line-height: 1.2;">';
    
    // Draw chart
    for (let i = chartHeight; i >= 0; i--) {
        let line = '';
        const threshold = (i / chartHeight) * maxValue;
        
        if (i % 5 === 0) {
            line += String(Math.round(threshold)).padStart(4, ' ') + ' |';
        } else {
            line += '     |';
        }
        
        chartData.forEach(data => {
            if (data.sent >= threshold) {
                line += '█';
            } else if (data.verified >= threshold) {
                line += '▓';
            } else {
                line += ' ';
            }
        });
        
        chartHTML += line + '\n';
    }
    
    // X-axis
    chartHTML += '     +' + '─'.repeat(chartData.length) + '\n';
    chartHTML += '      ';
    chartData.forEach((data, i) => {
        if (i % Math.ceil(chartData.length / 10) === 0) {
            chartHTML += data.hour.getHours();
        } else {
            chartHTML += ' ';
        }
    });
    
    chartHTML += '</div>';
    chartHTML += '<div style="margin-top: 10px; display: flex; gap: 20px; justify-content: center;">';
    chartHTML += '<span>█ Sent</span>';
    chartHTML += '<span>▓ Verified</span>';
    chartHTML += '</div>';
    
    chartContainer.innerHTML = chartHTML;
}

async function updateRecentEmailsTable(recentEmails) {
    const tbody = document.getElementById('recentEmailsBody');
    tbody.innerHTML = '';
    
    // Get user details for each email
    for (const email of recentEmails) {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(email.userId).get();
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData?.email || 'Unknown'}</td>
                <td>Verification</td>
                <td>${email.lastSent ? new Date(email.lastSent).toLocaleString('is-IS') : 'N/A'}</td>
                <td>
                    <span class="order-status ${email.status === 'verified' ? 'completed' : 'pending'}">
                        ${email.status || 'sent'}
                    </span>
                </td>
                <td>${email.sentCount} (${email.reminderCount} reminders)</td>
                <td>
                    ${email.status !== 'verified' ? `
                        <button class="admin-btn" onclick="resendVerificationEmail('${email.userId}')" style="padding: 5px 10px; font-size: 0.9rem;">
                            Resend
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    if (recentEmails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--gray);">No recent email activity</td></tr>';
    }
}

function updateEmailRecommendations(deliveryRate, avgDeliveryTime, pending, verified) {
    const container = document.getElementById('emailRecommendations');
    const recommendations = [];
    
    if (deliveryRate < 50) {
        recommendations.push({
            priority: 'high',
            icon: '⚠️',
            message: 'Low email delivery rate. Check spam folder instructions and email content.',
            action: 'Consider reviewing email templates and adding SPF/DKIM records.'
        });
    }
    
    if (avgDeliveryTime > 60) {
        recommendations.push({
            priority: 'medium',
            icon: '⏱️',
            message: 'Slow email verification times. Users may need reminders.',
            action: 'Enable automatic reminder emails for unverified users.'
        });
    }
    
    if (pending > verified) {
        recommendations.push({
            priority: 'high',
            icon: '📧',
            message: 'Many pending verifications. Users may not be receiving emails.',
            action: 'Check email delivery settings and consider using a different email provider.'
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'low',
            icon: '✅',
            message: 'Email delivery is performing well!',
            action: 'Continue monitoring for any changes.'
        });
    }
    
    container.innerHTML = '<h4>Recommendations</h4>' + recommendations.map(rec => `
        <div style="padding: 15px; margin-bottom: 10px; background: rgba(${rec.priority === 'high' ? '255,0,0' : rec.priority === 'medium' ? '255,165,0' : '0,255,0'},0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px;">
            <div style="display: flex; align-items: start; gap: 10px;">
                <span style="font-size: 1.5rem;">${rec.icon}</span>
                <div>
                    <p style="margin: 0 0 5px 0; font-weight: bold;">${rec.message}</p>
                    <p style="margin: 0; color: var(--gray); font-size: 0.9rem;">${rec.action}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Email resend functionality
async function resendVerificationEmail(userId) {
    try {
        const user = firebase.auth().currentUser;
        if (user && user.uid === userId) {
            await user.sendEmailVerification();
            alert('Verification email sent successfully!');
        } else {
            alert('Cannot send email to other users from client side. This requires server-side implementation.');
        }
        
        // Update the tracking
        await firebase.firestore().collection('emailTracking').doc(userId).update({
            lastSent: firebase.firestore.FieldValue.serverTimestamp(),
            sentCount: firebase.firestore.FieldValue.increment(1),
            reminderCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Reload metrics
        updateEmailMetrics();
    } catch (error) {
        console.error('Error resending email:', error);
        alert('Error resending email: ' + error.message);
    }
}

async function searchUserForResend() {
    const email = document.getElementById('resendEmailInput').value.trim();
    const container = document.getElementById('resendUserInfo');
    
    if (!email) {
        container.innerHTML = '<p style="color: var(--gray);">Please enter an email address</p>';
        return;
    }
    
    container.innerHTML = '<p>Searching...</p>';
    
    try {
        const usersSnapshot = await firebase.firestore().collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            container.innerHTML = '<p style="color: var(--mc-red);">No user found with this email</p>';
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get email tracking info
        const trackingDoc = await firebase.firestore().collection('emailTracking').doc(userId).get();
        const trackingData = trackingDoc.exists() ? trackingDoc.data() : null;
        
        container.innerHTML = `
            <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px;">
                <h4>User Information</h4>
                <p><strong>Name:</strong> ${userData.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Email Verified:</strong> ${userData.emailVerified ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Member Status:</strong> ${userData.isMember ? 'Member' : 'Non-member'}</p>
                ${trackingData ? `
                    <hr style="margin: 20px 0;">
                    <h4>Email History</h4>
                    <p><strong>Emails Sent:</strong> ${trackingData.sentCount || 0}</p>
                    <p><strong>Reminders Sent:</strong> ${trackingData.reminderCount || 0}</p>
                    <p><strong>Last Sent:</strong> ${trackingData.lastSent ? new Date(trackingData.lastSent.toDate()).toLocaleString('is-IS') : 'Never'}</p>
                    <p><strong>Status:</strong> ${trackingData.status || 'Unknown'}</p>
                ` : ''}
                ${!userData.emailVerified ? `
                    <button class="admin-btn" onclick="resendVerificationEmail('${userId}')" style="margin-top: 20px;">
                        Send Verification Email
                    </button>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error searching user:', error);
        container.innerHTML = '<p style="color: var(--mc-red);">Error searching for user</p>';
    }
}

async function bulkResendEmails() {
    if (!confirm('This will send verification emails to all unverified users. Continue?')) {
        return;
    }
    
    try {
        const unverifiedUsers = await firebase.firestore().collection('users')
            .where('emailVerified', '==', false)
            .get();
        
        alert(`Found ${unverifiedUsers.size} unverified users. Note: Bulk email sending requires server-side implementation.`);
        
        // In production, this would call a Cloud Function to send emails
        console.log('Unverified users:', unverifiedUsers.docs.map(doc => doc.data().email));
        
    } catch (error) {
        console.error('Error in bulk resend:', error);
        alert('Error: ' + error.message);
    }
}

// Email template preview
async function loadEmailTemplate() {
    const template = document.getElementById('templateSelector').value;
    const language = document.getElementById('templateLanguage').value;
    const preview = document.getElementById('templatePreview');
    
    if (!template) {
        preview.innerHTML = '';
        return;
    }
    
    // Template HTML based on selection
    const templates = {
        verification: {
            subject: language === 'is' 
                ? '🏍️ Staðfestu netfangið þitt - Sleipnir MC Reykjavík'
                : '🏍️ Verify your email - Sleipnir MC Reykjavík',
            preview: `
                <div style="background: #000; color: #fff; padding: 20px; border: 2px solid #cf2342;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="/Images/SleipnirLogo.png" alt="Sleipnir MC" style="max-width: 200px;">
                    </div>
                    <h1 style="color: #cf2342; text-align: center; text-transform: uppercase;">
                        ${language === 'is' ? 'Staðfestu netfangið þitt' : 'Verify your email'}
                    </h1>
                    <p>${language === 'is' 
                        ? 'Takk fyrir að skrá þig hjá Sleipnir MC Reykjavík. Smelltu á hnappinn hér að neðan til að staðfesta netfangið þitt.'
                        : 'Thank you for registering with Sleipnir MC Reykjavík. Click the button below to verify your email.'}</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background: #cf2342; color: #fff; padding: 15px 40px; text-decoration: none; text-transform: uppercase; display: inline-block;">
                            ${language === 'is' ? 'Staðfesta netfang' : 'Verify email'}
                        </a>
                    </div>
                    <p style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cf2342;">
                        NO DRUGS, NO ATTITUDE
                    </p>
                </div>
            `
        },
        passwordReset: {
            subject: language === 'is'
                ? '🔐 Endurstilla lykilorð - Sleipnir MC Reykjavík'
                : '🔐 Reset password - Sleipnir MC Reykjavík',
            preview: `
                <div style="background: #000; color: #fff; padding: 20px; border: 2px solid #cf2342;">
                    <h1 style="color: #cf2342; text-align: center;">
                        ${language === 'is' ? 'Endurstilla lykilorð' : 'Reset Password'}
                    </h1>
                    <p>${language === 'is'
                        ? 'Við fengum beiðni um að endurstilla lykilorðið þitt.'
                        : 'We received a request to reset your password.'}</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background: #cf2342; color: #fff; padding: 15px 40px; text-decoration: none;">
                            ${language === 'is' ? 'Endurstilla lykilorð' : 'Reset Password'}
                        </a>
                    </div>
                </div>
            `
        },
        memberApproval: {
            subject: language === 'is'
                ? '🎉 Meðlimsumsókn samþykkt - Sleipnir MC Reykjavík'
                : '🎉 Membership approved - Sleipnir MC Reykjavík',
            preview: `
                <div style="background: #000; color: #fff; padding: 20px; border: 2px solid #cf2342;">
                    <h1 style="color: #cf2342; text-align: center;">
                        ${language === 'is' ? 'Velkomin/n í hópinn!' : 'Welcome to the club!'}
                    </h1>
                    <p>${language === 'is'
                        ? 'Meðlimsumsókn þín hefur verið samþykkt!'
                        : 'Your membership application has been approved!'}</p>
                    <ul>
                        <li>${language === 'is' ? 'Aðgangur að meðlimavörum' : 'Access to member products'}</li>
                        <li>${language === 'is' ? 'Sérstök tilboð' : 'Special offers'}</li>
                        <li>${language === 'is' ? 'Viðburðatilkynningar' : 'Event notifications'}</li>
                    </ul>
                </div>
            `
        }
    };
    
    const selectedTemplate = templates[template];
    if (selectedTemplate) {
        preview.innerHTML = `
            <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px;">
                <h4>Subject: ${selectedTemplate.subject}</h4>
                <div style="margin-top: 20px; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; overflow: hidden;">
                    ${selectedTemplate.preview}
                </div>
            </div>
        `;
    }
}

async function sendTestEmail() {
    const email = document.getElementById('testEmailAddress').value.trim();
    const template = document.getElementById('templateSelector').value;
    
    if (!email || !template) {
        alert('Please select a template and enter an email address');
        return;
    }
    
    alert('Test email functionality requires server-side implementation. In production, this would send a test email to: ' + email);
}

// Switch email tabs
function switchEmailTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#emailMonitoringSection .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#emailMonitoringSection .tab-content').forEach(content => content.classList.remove('active'));
    
    const tabMap = {
        'metrics': 'emailMetricsTab',
        'resend': 'emailResendTab',
        'bounces': 'emailBouncesTab',
        'templates': 'emailTemplatesTab'
    };
    
    document.getElementById(tabMap[tab]).classList.add('active');
    
    // Load tab-specific data
    if (tab === 'bounces') {
        loadBounceData();
    }
}

async function loadBounceData() {
    // Simulated bounce data (in production, this would come from email service webhooks)
    const bouncesBody = document.getElementById('bouncesBody');
    bouncesBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; color: var(--gray);">
                Bounce tracking requires integration with email service webhooks
            </td>
        </tr>
    `;
    
    // Update bounce stats
    document.getElementById('softBounces').textContent = '0';
    document.getElementById('hardBounces').textContent = '0';
    document.getElementById('spamReports').textContent = '0';
    document.getElementById('unsubscribes').textContent = '0';
}

function exportBounces() {
    alert('Bounce export requires server-side implementation with email service integration');
}

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.removeProductImage = removeProductImage;
window.removeMemberPhoto = removeMemberPhoto;
window.togglePopular = togglePopular;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
window.removeCurrentImage = removeCurrentImage;
window.removeEditImage = removeEditImage;
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
window.searchUsers = searchUsers;
window.clearSearch = clearSearch;
window.loadAllAccounts = loadAllAccounts;
window.makeUserMember = makeUserMember;
window.closeEditMemberModal = closeEditMemberModal;
window.removeEditMemberPhoto = removeEditMemberPhoto;
// Email monitoring functions
window.loadEmailMonitoring = loadEmailMonitoring;
window.updateEmailMetrics = updateEmailMetrics;
window.switchEmailTab = switchEmailTab;
window.resendVerificationEmail = resendVerificationEmail;
window.searchUserForResend = searchUserForResend;
window.bulkResendEmails = bulkResendEmails;
window.loadEmailTemplate = loadEmailTemplate;
window.sendTestEmail = sendTestEmail;
window.exportBounces = exportBounces;

// Search Users functionality
async function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.trim().toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (!searchTerm) {
        searchResults.innerHTML = '<p style="color: var(--gray);">Please enter a search term.</p>';
        return;
    }
    
    searchResults.innerHTML = '<p>Searching...</p>';
    
    try {
        // Get all users
        const usersSnapshot = await firebase.firestore().collection('users').get();
        
        // Filter users based on search term
        const matchingUsers = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const fullName = (user.fullName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const address = (user.address || '').toLowerCase();
            const city = (user.city || '').toLowerCase();
            
            if (fullName.includes(searchTerm) || 
                email.includes(searchTerm) || 
                address.includes(searchTerm) || 
                city.includes(searchTerm)) {
                matchingUsers.push({ id: doc.id, ...user });
            }
        });
        
        if (matchingUsers.length === 0) {
            searchResults.innerHTML = '<p style="color: var(--gray);">No users found matching your search.</p>';
            return;
        }
        
        // Display results
        searchResults.innerHTML = `
            <h3>Found ${matchingUsers.length} user${matchingUsers.length > 1 ? 's' : ''}</h3>
            <div class="admin-grid">
                ${matchingUsers.map(user => `
                    <div class="admin-card">
                        <h4>${user.fullName || 'Unknown Name'}</h4>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Member Status:</strong> ${user.isMember ? '<span style="color: var(--mc-red);">Member</span>' : 'Non-Member'}</p>
                        <p><strong>Role:</strong> ${user.role || 'User'}</p>
                        ${user.address ? `<p><strong>Address:</strong> ${user.address}, ${user.city} ${user.postalCode}</p>` : ''}
                        <p><strong>Joined:</strong> ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                        <div style="margin-top: 15px;">
                            ${user.role !== 'admin' ? `
                                ${!user.isMember ? `
                                    <button class="admin-btn" onclick="makeUserMember('${user.id}')">
                                        Make Member
                                    </button>
                                ` : `
                                    <button class="admin-btn secondary" onclick="removeMembership('${user.id}')">
                                        Remove Membership
                                    </button>
                                `}
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error searching users:', error);
        searchResults.innerHTML = '<p style="color: var(--dark-red);">Error searching users. Please try again.</p>';
    }
}

// Clear search
function clearSearch() {
    document.getElementById('userSearchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

// Load all accounts
async function loadAllAccounts(filter = 'all') {
    let targetElement;
    let query = firebase.firestore().collection('users');
    
    switch(filter) {
        case 'all':
            targetElement = document.getElementById('allUsersList');
            break;
        case 'members':
            targetElement = document.getElementById('membersList');
            query = query.where('isMember', '==', true);
            break;
        case 'nonMembers':
            targetElement = document.getElementById('nonMembersList');
            query = query.where('isMember', '==', false);
            break;
    }
    
    if (!targetElement) return;
    
    targetElement.innerHTML = '<p>Loading users...</p>';
    
    try {
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            targetElement.innerHTML = '<p style="color: var(--gray);">No users found.</p>';
            return;
        }
        
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        targetElement.innerHTML = `
            <p style="margin-bottom: 20px;">Total: ${users.length} user${users.length > 1 ? 's' : ''}</p>
            <div class="admin-grid">
                ${users.map(user => `
                    <div class="admin-card">
                        <h4>${user.fullName || 'Unknown Name'}</h4>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Member Status:</strong> ${user.isMember ? '<span style="color: var(--mc-red);">Member</span>' : 'Non-Member'}</p>
                        <p><strong>Role:</strong> ${user.role || 'User'}</p>
                        ${user.memberRequestPending ? '<p style="color: orange;"><strong>Membership Pending</strong></p>' : ''}
                        <p><strong>Joined:</strong> ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                        <div style="margin-top: 15px;">
                            ${user.role !== 'admin' ? `
                                ${!user.isMember && !user.memberRequestPending ? `
                                    <button class="admin-btn" onclick="makeUserMember('${user.id}')">
                                        Make Member
                                    </button>
                                ` : ''}
                                ${user.isMember ? `
                                    <button class="admin-btn secondary" onclick="removeMembership('${user.id}')">
                                        Remove Membership
                                    </button>
                                ` : ''}
                                ${user.memberRequestPending ? `
                                    <button class="admin-btn" onclick="approveMember('${user.id}')">
                                        Approve Request
                                    </button>
                                    <button class="admin-btn secondary" onclick="rejectMember('${user.id}')">
                                        Reject Request
                                    </button>
                                ` : ''}
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading accounts:', error);
        targetElement.innerHTML = '<p style="color: var(--dark-red);">Error loading users. Please try again.</p>';
    }
}

// Make user a member directly
async function makeUserMember(userId) {
    if (!confirm('Are you sure you want to grant membership to this user?')) return;
    
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            isMember: true,
            memberRequestPending: false,
            memberApprovedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Membership granted successfully!');
        
        // Reload the current view
        const activeTab = document.querySelector('#allAccountsSection .tab-btn.active');
        if (activeTab) {
            const tabText = activeTab.textContent;
            if (tabText.includes('All')) loadAllAccounts('all');
            else if (tabText.includes('Members Only')) loadAllAccounts('members');
            else if (tabText.includes('Non-Members')) loadAllAccounts('nonMembers');
        }
        
        // Also reload search results if we're in search view
        if (document.getElementById('searchUsersSection').classList.contains('active')) {
            searchUsers();
        }
    } catch (error) {
        console.error('Error granting membership:', error);
        alert('Error granting membership. Please try again.');
    }
}

// Handle edit member photo
function handleEditMemberPhoto(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    editMemberPhotoFile = file;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        // Store the base64 data
        editMemberPhotoData = reader.result;
        
        const preview = document.getElementById('editMemberPhotoPreview');
        preview.innerHTML = `
            <div class="image-preview" style="position: relative; max-width: 200px;">
                <img src="${reader.result}" alt="Member photo" style="width: 100%; height: auto; border-radius: 8px;">
                <button class="remove-btn" onclick="removeEditMemberPhoto()" style="position: absolute; top: -5px; right: -5px; background: var(--mc-red); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
            </div>
        `;
    };
}

// Remove edit member photo
function removeEditMemberPhoto() {
    editMemberPhotoFile = null;
    editMemberPhotoData = null;
    document.getElementById('editMemberPhotoPreview').innerHTML = '';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDragDrop();
    
    // Only load if we're on the admin page
    if (window.location.pathname.includes('admin.html')) {
        // The loadDashboardStats is called from admin.html after auth check
        // Initialize tabs with default sizes if elements exist
        updateSizes('tshirt', 'sizesContainer');
        
        // Setup edit member photo upload
        const editMemberDropZone = document.getElementById('editMemberDropZone');
        const editMemberPhotoInput = document.getElementById('editMemberPhoto');
        
        if (editMemberDropZone && editMemberPhotoInput) {
            // Click to upload
            editMemberDropZone.addEventListener('click', () => editMemberPhotoInput.click());
            
            // Handle file selection
            editMemberPhotoInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleEditMemberPhoto(e.target.files[0]);
                }
            });
            
            // Setup drag and drop
            setupDragDrop(editMemberDropZone, editMemberPhotoInput, 'editMember');
        }
        
        // Setup edit member form submission
        const editMemberForm = document.getElementById('editMemberForm');
        if (editMemberForm) {
            editMemberForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const memberId = document.getElementById('editMemberId').value;
                
                const updateData = {
                    name: document.getElementById('editMemberName').value,
                    role: document.getElementById('editMemberRole').value || '',
                    motorcycleType: document.getElementById('editMemberMotorcycleType').value || '',
                    joinDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('editMemberJoinDate').value)),
                    displayOrder: parseInt(document.getElementById('editMemberDisplayOrder').value) || Date.now(),
                    isActive: document.getElementById('editMemberStatus').value === 'true',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Add photo if a new one was uploaded
                if (editMemberPhotoData) {
                    updateData.photoUrl = editMemberPhotoData;
                }
                
                try {
                    await firebase.firestore().collection('displayMembers').doc(memberId).update(updateData);
                    
                    alert('Member updated successfully!');
                    closeEditMemberModal();
                    loadDisplayMembers();
                } catch (error) {
                    console.error('Error updating member:', error);
                    alert('Error updating member. Please try again.');
                }
            });
        }
    }
});

// ===== EMAIL MONITORING FUNCTIONS =====

// Load email monitoring section
async function loadEmailMonitoring() {
    console.log('Loading email monitoring data...');
    updateEmailMetrics(24); // Default to 24 hours
}

// Update email metrics based on time range
async function updateEmailMetrics(hours) {
    try {
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
        
        // Get email tracking data
        const trackingSnapshot = await firebase.firestore()
            .collection('emailTracking')
            .get();
        
        let totalSent = 0;
        let totalVerified = 0;
        let totalPending = 0;
        const hourlyData = {};
        const recentEmails = [];
        const deliveryTimes = [];
        
        // Initialize hourly data structure
        for (let i = 0; i < Math.min(hours, 24); i++) {
            const hourTime = new Date(Date.now() - (i * 60 * 60 * 1000));
            hourTime.setMinutes(0, 0, 0);
            const hourKey = hourTime.toISOString().slice(0, 13);
            hourlyData[hourKey] = { sent: 0, verified: 0 };
        }
        
        // Process tracking data
        trackingSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.lastSent && data.lastSent.toDate() > cutoffTime) {
                totalSent++;
                
                // Categorize by status
                if (data.status === 'verified') {
                    totalVerified++;
                    
                    // Calculate delivery time
                    if (data.verifiedAt) {
                        const deliveryTime = data.verifiedAt.toDate() - data.lastSent.toDate();
                        deliveryTimes.push(deliveryTime);
                    }
                } else if (data.status === 'sent') {
                    totalPending++;
                }
                
                // Group by hour
                const sentHour = new Date(data.lastSent.toDate());
                sentHour.setMinutes(0, 0, 0);
                const hourKey = sentHour.toISOString().slice(0, 13);
                
                if (hourlyData[hourKey]) {
                    hourlyData[hourKey].sent++;
                    if (data.status === 'verified') {
                        hourlyData[hourKey].verified++;
                    }
                }
                
                // Add to recent emails
                recentEmails.push({
                    userId: doc.id,
                    email: data.email || 'Unknown',
                    type: data.type || 'verification',
                    sentAt: data.lastSent.toDate(),
                    status: data.status,
                    attempts: data.sentCount || 1,
                    verifiedAt: data.verifiedAt?.toDate()
                });
            }
        });
        
        // Calculate metrics
        const deliveryRate = totalSent > 0 ? Math.round((totalVerified / totalSent) * 100) : 0;
        const avgDeliveryTime = deliveryTimes.length > 0 
            ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 1000 / 60) // minutes
            : 0;
        
        // Update stats display
        document.getElementById('emailsSent').textContent = totalSent;
        document.getElementById('emailsVerified').textContent = totalVerified;
        document.getElementById('deliveryRate').textContent = deliveryRate + '%';
        document.getElementById('avgDeliveryTime').textContent = avgDeliveryTime + 'm';
        
        // Generate hourly chart
        generateHourlyChart(hourlyData, hours);
        
        // Display recent emails
        displayRecentEmails(recentEmails.sort((a, b) => b.sentAt - a.sentAt).slice(0, 10));
        
        // Generate recommendations
        generateEmailRecommendations(deliveryRate, avgDeliveryTime, totalPending, totalVerified);
        
        // Store data for other functions
        emailStats = {
            totalSent,
            totalVerified,
            totalPending,
            deliveryRate,
            avgDeliveryTime,
            hourlyData,
            recentEmails
        };
        
    } catch (error) {
        console.error('Error updating email metrics:', error);
    }
}

// Generate ASCII hourly chart
function generateHourlyChart(hourlyData, hours) {
    const chartContainer = document.getElementById('hourlyEmailChart');
    if (!chartContainer) return;
    
    const maxValue = Math.max(...Object.values(hourlyData).map(d => d.sent), 1);
    const chartHeight = 15;
    const chartWidth = Math.min(hours, 24);
    
    let chart = '<pre style="color: var(--gray); font-family: monospace; line-height: 1.2;">';
    
    // Draw chart
    for (let row = chartHeight; row >= 0; row--) {
        const threshold = (row / chartHeight) * maxValue;
        let line = row === 0 ? '  ' : (row % 5 === 0 ? row.toString().padStart(2, ' ') : '  ');
        line += ' │';
        
        const sortedHours = Object.keys(hourlyData).sort().slice(-chartWidth);
        
        sortedHours.forEach(hour => {
            const data = hourlyData[hour];
            if (data.sent >= threshold) {
                line += data.verified >= threshold ? '█' : '▓';
            } else if (data.verified >= threshold) {
                line += '░';
            } else {
                line += ' ';
            }
            line += ' ';
        });
        
        chart += line + '\\n';
    }
    
    // Draw x-axis
    chart += '  └' + '─'.repeat(chartWidth * 2) + '\\n';
    chart += '   ';
    
    // Hour labels
    const sortedHours = Object.keys(hourlyData).sort().slice(-chartWidth);
    sortedHours.forEach((hour, index) => {
        if (index % Math.ceil(chartWidth / 12) === 0) {
            const hourNum = new Date(hour).getHours();
            chart += hourNum.toString().padStart(2, ' ');
        } else {
            chart += '  ';
        }
    });
    
    chart += '\\n\\n';
    chart += '<span style="color: var(--white);">Legend:</span> ';
    chart += '<span style="color: #888;">█ Verified</span> ';
    chart += '<span style="color: #555;">▓ Sent</span>';
    chart += '</pre>';
    
    chartContainer.innerHTML = chart;
}

// Display recent emails
function displayRecentEmails(emails) {
    const tbody = document.getElementById('recentEmailsBody');
    if (!tbody) return;
    
    tbody.innerHTML = emails.map(email => `
        <tr>
            <td>${email.email}</td>
            <td>${email.type}</td>
            <td>${new Date(email.sentAt).toLocaleString()}</td>
            <td>
                <span class="status-badge ${email.status}">
                    ${email.status}
                </span>
            </td>
            <td>${email.attempts}</td>
            <td>
                ${email.status !== 'verified' ? 
                    `<button class="admin-btn small" onclick="resendEmailToUser('${email.userId}')">Resend</button>` : 
                    '<span style="color: var(--gray);">—</span>'}
            </td>
        </tr>
    `).join('');
}

// Generate recommendations
function generateEmailRecommendations(deliveryRate, avgTime, pending, verified) {
    const container = document.getElementById('emailRecommendations');
    if (!container) return;
    
    const recommendations = [];
    
    if (deliveryRate < 50) {
        recommendations.push({
            priority: 'high',
            title: 'Low Delivery Rate',
            message: 'Less than 50% of emails are being verified. Check spam folder instructions.',
            action: 'Consider using a dedicated email service provider'
        });
    }
    
    if (avgTime > 60) {
        recommendations.push({
            priority: 'medium',
            title: 'Slow Verification',
            message: `Average verification time is ${avgTime} minutes. Users may need reminders.`,
            action: 'Enable automatic reminder emails'
        });
    }
    
    if (pending > verified) {
        recommendations.push({
            priority: 'high',
            title: 'Many Pending Verifications',
            message: `${pending} emails pending vs ${verified} verified.`,
            action: 'Review email content and delivery settings'
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'low',
            title: 'Email System Healthy',
            message: 'Email delivery metrics look good!',
            action: 'Continue monitoring'
        });
    }
    
    container.innerHTML = `
        <h4>Recommendations</h4>
        ${recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <div class="recommendation-header">
                    <span class="priority-badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
                    <strong>${rec.title}</strong>
                </div>
                <p>${rec.message}</p>
                <p class="action"><strong>Action:</strong> ${rec.action}</p>
            </div>
        `).join('')}
    `;
}

// Switch email monitoring tabs
function switchEmailTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#emailMonitoringSection .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#emailMonitoringSection .tab-content').forEach(content => content.classList.remove('active'));
    const tabContent = document.getElementById(`email${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Load tab-specific data
    switch(tab) {
        case 'metrics':
            updateEmailMetrics(parseInt(document.getElementById('emailTimeRange')?.value || 24));
            break;
        case 'resend':
            // Clear previous search
            document.getElementById('resendUserInfo').innerHTML = '';
            break;
        case 'bounces':
            loadBounceData();
            break;
        case 'templates':
            // Clear template preview
            document.getElementById('templatePreview').innerHTML = '';
            break;
    }
}

// Search user for email resend
async function searchUserForResend() {
    const email = document.getElementById('resendEmailInput').value.trim();
    const container = document.getElementById('resendUserInfo');
    
    if (!email) {
        container.innerHTML = '<p style="color: var(--mc-red);">Please enter an email address</p>';
        return;
    }
    
    try {
        // Search for user
        const usersSnapshot = await firebase.firestore()
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            container.innerHTML = '<p style="color: var(--mc-red);">User not found</p>';
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get email tracking info
        const trackingDoc = await firebase.firestore()
            .collection('emailTracking')
            .doc(userId)
            .get();
        
        const trackingData = trackingDoc.exists() ? trackingDoc.data() : null;
        
        container.innerHTML = `
            <div class="user-info-card">
                <h4>${userData.fullName || 'Unknown'}</h4>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Status:</strong> ${userData.emailVerified ? 
                    '<span style="color: #4CAF50;">Verified</span>' : 
                    '<span style="color: var(--mc-red);">Unverified</span>'}</p>
                ${trackingData ? `
                    <p><strong>Emails Sent:</strong> ${trackingData.sentCount || 0}</p>
                    <p><strong>Last Sent:</strong> ${trackingData.lastSent ? 
                        new Date(trackingData.lastSent.toDate()).toLocaleString() : 'Never'}</p>
                ` : ''}
                <div style="margin-top: 20px;">
                    <button class="admin-btn" onclick="resendVerificationEmail('${userId}', '${email}')">
                        Send Verification Email
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error searching user:', error);
        container.innerHTML = '<p style="color: var(--mc-red);">Error searching for user</p>';
    }
}

// Resend verification email to specific user
async function resendVerificationEmail(userId, email) {
    try {
        // Note: This requires the user to be signed in or Admin SDK
        alert(`Cannot send email from client-side. User ID: ${userId}, Email: ${email}\\nThis would normally trigger a Cloud Function to send the email.`);
        
        // Update tracking (simulate)
        await firebase.firestore().collection('emailTracking').doc(userId).set({
            email: email,
            lastSent: firebase.firestore.FieldValue.serverTimestamp(),
            sentCount: firebase.firestore.FieldValue.increment(1),
            status: 'sent',
            type: 'verification'
        }, { merge: true });
        
        alert('Email tracking updated. In production, email would be sent via Cloud Function.');
        
        // Refresh the search
        searchUserForResend();
        
    } catch (error) {
        console.error('Error resending email:', error);
        alert('Error resending email: ' + error.message);
    }
}

// Bulk resend emails to unverified users
async function bulkResendEmails() {
    if (!confirm('This will resend verification emails to all unverified users. Continue?')) {
        return;
    }
    
    try {
        const unverifiedUsers = await firebase.firestore()
            .collection('users')
            .where('emailVerified', '==', false)
            .get();
        
        alert(`Found ${unverifiedUsers.size} unverified users.\\nIn production, this would trigger Cloud Functions to send emails.`);
        
        // In production, this would call a Cloud Function
        // For now, just show the count
        
    } catch (error) {
        console.error('Error in bulk resend:', error);
        alert('Error: ' + error.message);
    }
}

// Load bounce data (placeholder)
function loadBounceData() {
    // In a real implementation, this would fetch from an email service provider
    document.getElementById('softBounces').textContent = '0';
    document.getElementById('hardBounces').textContent = '0';
    document.getElementById('spamReports').textContent = '0';
    document.getElementById('unsubscribes').textContent = '0';
    
    document.getElementById('bouncesBody').innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; color: var(--gray);">
                Bounce tracking requires integration with email service provider
            </td>
        </tr>
    `;
}

// Load email template preview
function loadEmailTemplate() {
    const template = document.getElementById('templateSelector').value;
    const language = document.getElementById('templateLanguage').value;
    const preview = document.getElementById('templatePreview');
    
    if (!template) {
        preview.innerHTML = '';
        return;
    }
    
    // Template content
    const templates = {
        verification: {
            is: {
                subject: 'Staðfestu netfangið þitt - Sleipnir MC',
                body: `
                    <h2>Velkomin/n í Sleipnir MC!</h2>
                    <p>Takk fyrir að skrá þig. Vinsamlegast staðfestu netfangið þitt með því að smella á hnappinn hér að neðan:</p>
                    <a href="#" style="background: #cf2342; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 20px 0;">Staðfesta Netfang</a>
                    <p>Ef þú getur ekki smellt á hnappinn, afritaðu þennan hlekk í vafrann þinn:</p>
                    <p style="word-break: break-all;">[VERIFICATION_LINK]</p>
                `
            },
            en: {
                subject: 'Verify Your Email - Sleipnir MC',
                body: `
                    <h2>Welcome to Sleipnir MC!</h2>
                    <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                    <a href="#" style="background: #cf2342; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 20px 0;">Verify Email</a>
                    <p>If you can't click the button, copy this link to your browser:</p>
                    <p style="word-break: break-all;">[VERIFICATION_LINK]</p>
                `
            }
        },
        passwordReset: {
            is: {
                subject: 'Endurstilla lykilorð - Sleipnir MC',
                body: `
                    <h2>Endurstilling lykilorðs</h2>
                    <p>Við fengum beiðni um að endurstilla lykilorðið þitt. Smelltu á hnappinn hér að neðan:</p>
                    <a href="#" style="background: #cf2342; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 20px 0;">Endurstilla Lykilorð</a>
                    <p>Ef þú baðst ekki um þetta, huntsaðu þennan tölvupóst.</p>
                `
            },
            en: {
                subject: 'Reset Password - Sleipnir MC',
                body: `
                    <h2>Password Reset</h2>
                    <p>We received a request to reset your password. Click the button below:</p>
                    <a href="#" style="background: #cf2342; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 20px 0;">Reset Password</a>
                    <p>If you didn't request this, please ignore this email.</p>
                `
            }
        }
    };
    
    const selectedTemplate = templates[template]?.[language];
    
    if (selectedTemplate) {
        preview.innerHTML = `
            <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px;">
                <h4>Subject: ${selectedTemplate.subject}</h4>
                <div style="background: white; color: black; padding: 20px; margin-top: 10px; border-radius: 4px;">
                    ${selectedTemplate.body}
                </div>
            </div>
        `;
    }
}

// Send test email
function sendTestEmail() {
    const email = document.getElementById('testEmailAddress').value;
    const template = document.getElementById('templateSelector').value;
    
    if (!email || !template) {
        alert('Please select a template and enter an email address');
        return;
    }
    
    alert(`Test email would be sent to: ${email}\\nTemplate: ${template}\\n\\nNote: This requires server-side implementation`);
}

// Export bounces (placeholder)
function exportBounces() {
    alert('Bounce export requires integration with email service provider');
}

// Resend email to user from recent emails list
function resendEmailToUser(userId) {
    // Find user email from emailStats
    const user = emailStats?.recentEmails?.find(e => e.userId === userId);
    if (user) {
        resendVerificationEmail(userId, user.email);
    }
}

// Add styles for email monitoring
const emailStyles = `
<style>
.recommendation {
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 8px;
    background: rgba(0,0,0,0.5);
    border-left: 4px solid;
}

.recommendation.high {
    border-color: var(--mc-red);
}

.recommendation.medium {
    border-color: #ff9800;
}

.recommendation.low {
    border-color: #4CAF50;
}

.priority-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    margin-right: 10px;
}

.priority-badge.high {
    background: var(--mc-red);
    color: white;
}

.priority-badge.medium {
    background: #ff9800;
    color: white;
}

.priority-badge.low {
    background: #4CAF50;
    color: white;
}

.status-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.status-badge.sent {
    background: #ff9800;
    color: white;
}

.status-badge.verified {
    background: #4CAF50;
    color: white;
}

.user-info-card {
    background: rgba(0,0,0,0.5);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
}

.admin-btn.small {
    padding: 5px 15px;
    font-size: 0.9rem;
}
</style>
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('email-monitoring-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'email-monitoring-styles';
    styleElement.innerHTML = emailStyles;
    document.head.appendChild(styleElement.firstElementChild);
}