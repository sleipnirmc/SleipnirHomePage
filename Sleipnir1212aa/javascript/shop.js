// Shop functionality
let cart = [];
let products = [];
let currentFilter = 'all';

// Lazy loading observer
let imageObserver = null;

// Pagination variables
const PRODUCTS_PER_PAGE = 12;
let currentPage = 1;
let totalPages = 1;

// Initialize lazy loading observer
function initLazyLoading() {
    const options = {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    };

    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                if (src) {
                    // Create a new image to preload
                    const tempImg = new Image();
                    tempImg.onload = function() {
                        img.src = src;
                        img.classList.add('loaded');
                        img.removeAttribute('data-src');
                    };
                    tempImg.src = src;
                    
                    // Stop observing this image
                    observer.unobserve(img);
                }
            }
        });
    }, options);
}

// Load products from Firebase
async function loadProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p><span class="is">Hleður vörur...</span><span class="en">Loading products...</span></p></div>';

    try {
        // Try to load products - this should work for all users (authenticated or not)
        // The Firebase rules should allow read access to products collection
        const snapshot = await firebase.firestore().collection('products').get();
        products = [];

        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // If no products exist, add sample products
        if (products.length === 0) {
            console.log('No products found, adding sample products...');
            await addSampleProducts();
            // Reload products after adding samples
            const newSnapshot = await firebase.firestore().collection('products').get();
            products = [];
            newSnapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
        }

        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        
        // Check if it's a permission error
        if (error.code === 'permission-denied') {
            // Show helpful message about Firebase rules
            productGrid.innerHTML = `
                <div class="no-products">
                    <p><span class="is">Vara: Aðgangur að vörum neitar vegna öryggisreglna.</span><span class="en">Error: Access to products denied due to security rules.</span></p>
                    <p style="font-size: 14px; color: var(--gray); margin-top: 10px;">
                        <span class="is">Vinsamlegast uppfærðu Firebase Firestore reglur til að leyfa lestur á 'products' safninu.</span>
                        <span class="en">Please update Firebase Firestore rules to allow read access to the 'products' collection.</span>
                    </p>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 5px; margin-top: 20px; font-family: monospace; font-size: 12px; text-align: left;">
                        <p style="margin-bottom: 10px;">Suggested Firestore Rules:</p>
                        <pre style="margin: 0;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all users to read products
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}</pre>
                    </div>
                </div>`;
        } else {
            productGrid.innerHTML = `<div class="no-products"><p><span class="is">Villa við að hlaða vörum. Vinsamlegast reyndu aftur.</span><span class="en">Error loading products. Please try again later.</span></p><p style="font-size: 12px; color: var(--gray);">Error: ${error.message}</p></div>`;
        }
        // Don't show any products if Firebase fails
        products = [];
    }
}


// Add sample products function
async function addSampleProducts() {
    const sampleProducts = [
        {
            nameIs: 'Reiðmanns Kyrtill',
            nameEn: 'Rider\'s Tunic',
            description: 'Woven with threads of midnight sun',
            category: 'tshirt',
            price: 3999,
            availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
            membersOnly: true,
            isNew: true,
            isPopular: false,
            images: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            nameIs: 'Berserkja Buxur',
            nameEn: 'Berserker Denim',
            description: 'Armor for the modern warrior',
            category: 'jeans',
            price: 12999,
            availableSizes: ['30', '32', '34', '36'],
            membersOnly: true,
            isNew: false,
            isPopular: true,
            images: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            nameIs: 'Valkyrju Hetta',
            nameEn: 'Valkyrie Hood',
            description: 'Protection from the northern winds',
            category: 'hoodie',
            price: 8999,
            availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
            membersOnly: false,
            isNew: true,
            isPopular: false,
            images: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            nameIs: 'Þórs Hamar Lykill',
            nameEn: 'Thor\'s Hammer Keychain',
            description: 'Carry the power of thunder',
            category: 'other',
            price: 2499,
            availableSizes: ['One Size'],
            membersOnly: false,
            isNew: false,
            isPopular: true,
            images: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    ];

    for (const product of sampleProducts) {
        try {
            await firebase.firestore().collection('products').add(product);
            console.log('Added sample product:', product.nameEn);
        } catch (error) {
            console.error('Error adding sample product:', error);
        }
    }
}

// Display products based on filter
async function displayProducts() {
    const productGrid = document.getElementById('productGrid');
    let isMember = false;
    
    // Check member status only if user is logged in
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            isMember = await checkMemberStatus();
        }
    } catch (error) {
        console.error('Error checking member status:', error);
        isMember = false;
    }
    
    // Filter products based on category
    let filteredProducts = currentFilter === 'all'
        ? products
        : products.filter(p => p.category === currentFilter);
    
    // IMPORTANT: For non-members (including not logged in users), 
    // only show non-member products
    if (!isMember) {
        filteredProducts = filteredProducts.filter(p => !p.membersOnly);
    }
    // Members can see all products (both member and non-member items)

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<div class="no-products"><p><span class="is">Engar vörur fundust í þessum flokki</span><span class="en">No products found in this category</span></p></div>';
        updatePaginationControls(0);
        return;
    }

    // Calculate pagination
    totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    // Get products for current page
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    productGrid.innerHTML = paginatedProducts.map((product, index) => {
        const images = product.images && product.images.length > 0 ? product.images : 
                       (product.imageUrl ? [{dataUrl: product.imageUrl}] : []);
        const hasMultipleImages = images.length > 1;
        
        return `
        <div class="product-card shop-product-card" data-category="${product.category}" data-product-index="${index}" onclick="openProductModal('${product.id}')">
            
            <!-- Product Badges -->
            <div class="product-badges">
                ${product.isNew ? '<div class="product-badge">Nýtt</div>' : ''}
                ${product.isPopular ? '<div class="product-badge">Vinsælt</div>' : ''}
                ${product.membersOnly ? '<div class="product-badge">Meðlimur</div>' : ''}
            </div>
            
            <!-- Image Gallery -->
            <div class="product-image-gallery">
                ${images.length > 0 ? `
                    <div class="gallery-images" data-product-id="${product.id}">
                        ${images.map((img, imgIndex) => `
                            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23222' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' text-anchor='middle' dominant-baseline='middle' font-family='Arial' font-size='16'%3ELoading...%3C/text%3E%3C/svg%3E" 
                                 data-src="${img.dataUrl}" 
                                 alt="${product.nameIs}" 
                                 class="gallery-image lazy-image"
                                 style="${imgIndex === 0 ? '' : 'display: none;'}">
                        `).join('')}
                    </div>
                    ${hasMultipleImages ? `
                        <button class="gallery-nav gallery-prev" onclick="event.stopPropagation(); navigateGallery('${product.id}', 'prev')">‹</button>
                        <button class="gallery-nav gallery-next" onclick="event.stopPropagation(); navigateGallery('${product.id}', 'next')">›</button>
                        <div class="gallery-dots">
                            ${images.map((_, dotIndex) => `
                                <span class="gallery-dot ${dotIndex === 0 ? 'active' : ''}" 
                                      onclick="event.stopPropagation(); goToSlide('${product.id}', ${dotIndex})"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                ` : `
                    <div class="product-overlay">
                        <span class="norse-symbol">${getRandomRune()}</span>
                    </div>
                `}
            </div>
            
            <div class="product-info" onclick="event.stopPropagation()">
                <h3 class="product-name">
                    <span class="is">${product.nameIs}</span>
                    <span class="en">${product.nameEn}</span>
                </h3>
                <p class="product-saga">${product.description}</p>
                <p class="product-price">${formatPrice(product.price)} ISK</p>
                <div class="size-selector">
                    <label class="size-label">
                        <span class="is">Stærð:</span>
                        <span class="en">Size:</span>
                    </label>
                    <div class="size-options" data-product="${product.id}">
                        ${getSizeOptions(product.category, product.availableSizes)}
                    </div>
                </div>
                <button class="add-to-cart" 
                        data-product-id="${product.id}"
                        data-product-name="${product.nameIs}"
                        data-product-price="${product.price}">
                    <span class="is">Bæta í Körfu</span>
                    <span class="en">Add to Cart</span>
                </button>
            </div>
        </div>
    `}).join('');

    // Add event listeners
    addProductEventListeners();
    
    // Initialize lazy loading if not already done
    if (!imageObserver) {
        initLazyLoading();
    }
    
    // Observe all lazy images
    document.querySelectorAll('.lazy-image').forEach(img => {
        imageObserver.observe(img);
    });
    
    // Make cards visible with animation
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('visible');
            }, index * 100);
        });
    }, 100);
    
    // Update pagination controls
    updatePaginationControls(filteredProducts.length);
}

// Get size options based on category
function getSizeOptions(category, availableSizes) {
    const sizes = {
        tshirt: ['S', 'M', 'L', 'XL', 'XXL'],
        hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
        jacket: ['S', 'M', 'L', 'XL', 'XXL'],
        jeans: ['28', '30', '32', '34', '36', '38'],
        other: ['One Size']
    };

    const categorySizes = sizes[category] || sizes.other;
    
    return categorySizes.map(size => {
        const isAvailable = !availableSizes || availableSizes.includes(size);
        return `<button class="size-btn" data-size="${size}" ${!isAvailable ? 'disabled' : ''}>${size}</button>`;
    }).join('');
}

// Get random Norse rune
function getRandomRune() {
    const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];
    return runes[Math.floor(Math.random() * runes.length)];
}

// Format price with thousand separators
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Update pagination controls
function updatePaginationControls(totalProducts) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <span class="is">‹ Fyrri</span>
            <span class="en">‹ Previous</span>
        </button>
    `;
    
    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">${i}</button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="is">Næsta ›</span>
            <span class="en">Next ›</span>
        </button>
    `;
    
    // Product count
    const startProduct = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
    const endProduct = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);
    
    paginationHTML += `
        <div class="pagination-info">
            <span class="is">Sýnir ${startProduct}-${endProduct} af ${totalProducts}</span>
            <span class="en">Showing ${startProduct}-${endProduct} of ${totalProducts}</span>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    displayProducts();
    
    // Scroll to top of products
    const shopSection = document.querySelector('.shop-section');
    if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Add event listeners to products
function addProductEventListeners() {
    // Size selection
    document.querySelectorAll('.size-options').forEach(sizeGroup => {
        sizeGroup.addEventListener('click', (e) => {
            if (e.target.classList.contains('size-btn')) {
                sizeGroup.querySelectorAll('.size-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                e.target.classList.add('selected');
            }
        });
    });

    // Add to cart
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', async function() {
            const productCard = this.closest('.product-card');
            const productId = this.dataset.productId;
            const productName = this.dataset.productName;
            const productPrice = parseFloat(this.dataset.productPrice);
            const sizeSelector = productCard.querySelector('.size-options');
            const selectedSize = sizeSelector.querySelector('.selected');

            // Find the product to check if it's members only
            const product = products.find(p => p.id === productId);
            if (product && product.membersOnly) {
                const isMember = await checkMemberStatus();
                if (!isMember) {
                    alert(currentLang === 'is' 
                        ? 'Þessi vara er eingöngu fyrir meðlimi. Vinsamlegast skráðu þig inn sem meðlimur.' 
                        : 'This product is for members only. Please login as a member.');
                    return;
                }
            }

            if (!selectedSize) {
                alert('Vinsamlegast veldu stærð / Please select a size');
                return;
            }

            const size = selectedSize.dataset.size;

            // Add to cart
            const cartItem = {
                id: productId,
                name: productName,
                price: productPrice,
                size: size,
                quantity: 1
            };

            addToCart(cartItem);
        });
    });
}

// Add item to cart
function addToCart(item) {
    const existingItem = cart.find(i => i.id === item.id && i.size === item.size);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push(item);
    }

    updateCartUI();
    showCartNotification(item);
    saveCartToLocalStorage();
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;"><span class="is">Karfan er tóm</span><span class="en">Cart is empty</span></p>';
        cartTotal.textContent = '0 ISK';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>Size: ${item.size} | ${formatPrice(item.price)} ISK</p>
            </div>
            <div class="cart-item-actions">
                <button onclick="updateQuantity('${item.id}', '${item.size}', -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity('${item.id}', '${item.size}', 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart('${item.id}', '${item.size}')">✕</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatPrice(total) + ' ISK';
}

// Update item quantity
function updateQuantity(id, size, change) {
    const item = cart.find(i => i.id === id && i.size === size);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id, size);
        } else {
            updateCartUI();
            saveCartToLocalStorage();
        }
    }
}

// Remove item from cart
function removeFromCart(id, size) {
    cart = cart.filter(item => !(item.id === id && item.size === size));
    updateCartUI();
    saveCartToLocalStorage();
}

// Show cart notification
function showCartNotification(item) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification show';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="norse-symbol">ᛋ</span>
            <div>
                <h3><span class="is">Bætt í körfu!</span><span class="en">Added to cart!</span></h3>
                <p>${item.name} (Size: ${item.size}) - ${formatPrice(item.price)} ISK</p>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Save cart to localStorage
function saveCartToLocalStorage() {
    // Note: We're not using localStorage per Claude.ai restrictions
    // In production, you would implement this differently
}

// Category filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.category;
        currentPage = 1; // Reset to first page when filtering
        displayProducts();
    });
});

// Cart sidebar functionality
document.getElementById('cartBtn').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.add('open');
});

document.getElementById('closeCart').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.remove('open');
});

// Checkout button
document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (cart.length === 0) return;

    const user = firebase.auth().currentUser;
    if (!user) {
        const msg = currentLang === 'is' 
            ? 'Þú þarft að skrá þig inn til að panta. Viltu skrá þig inn núna?' 
            : 'You need to be logged in to place an order. Would you like to login now?';
        if (confirm(msg)) {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        // Get user data
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Calculate total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create order
        const orderData = {
            userId: user.uid,
            userEmail: user.email,
            userName: userData?.fullName || user.email,
            userAddress: userData?.address || '',
            userCity: userData?.city || '',
            userPostalCode: userData?.postalCode || '',
            items: cart.map(item => ({
                productId: item.id,
                productName: item.name,
                size: item.size,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            })),
            totalAmount: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            adminNotified: false
        };
        
        // Save order to Firestore
        const orderRef = await firebase.firestore().collection('orders').add(orderData);
        
        // Send email notification (this would typically be done via a cloud function)
        // For now, we'll just mark that notification is needed
        await sendOrderNotification(orderRef.id, orderData);
        
        // Clear cart
        cart = [];
        updateCartUI();
        saveCartToLocalStorage();
        
        // Close cart sidebar
        document.getElementById('cartSidebar').classList.remove('open');
        
        // Show success message
        showOrderConfirmation(orderRef.id);
        
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
    }
});

// Send order notification (placeholder for email functionality)
async function sendOrderNotification(orderId, orderData) {
    // In a real implementation, this would trigger a cloud function to send email
    // For now, we'll just log it
    console.log('Order notification would be sent to admin:', {
        orderId,
        orderData,
        adminEmail: 'admin@sleipnirmc.is' // Configure this in Firebase settings
    });
}

// Show order confirmation
function showOrderConfirmation(orderId) {
    const modal = document.createElement('div');
    modal.className = 'order-confirmation-modal';
    modal.innerHTML = `
        <div class="order-confirmation-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="confirmation-icon">✓</div>
            <h2>
                <span class="is">Pöntun móttekin!</span>
                <span class="en">Order Received!</span>
            </h2>
            <p class="order-number">
                <span class="is">Pöntunarnúmer:</span>
                <span class="en">Order Number:</span>
                <strong>${orderId.substr(-8).toUpperCase()}</strong>
            </p>
            <p class="confirmation-message">
                <span class="is">Við höfum móttekið pöntunina þína og munum hafa samband fljótlega.</span>
                <span class="en">We have received your order and will contact you soon.</span>
            </p>
            <button class="cta-button" onclick="window.location.href='shop.html'">
                <span class="is">Halda áfram að versla</span>
                <span class="en">Continue Shopping</span>
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add styles for the modal
    const style = document.createElement('style');
    style.textContent = `
        .order-confirmation-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        }
        .order-confirmation-content {
            background: var(--norse-black);
            padding: 40px;
            border: 2px solid var(--mc-red);
            text-align: center;
            max-width: 500px;
            position: relative;
        }
        .confirmation-icon {
            font-size: 80px;
            color: #00ff00;
            margin-bottom: 20px;
        }
        .order-number {
            font-size: 18px;
            margin: 20px 0;
        }
        .order-number strong {
            color: var(--mc-red);
            font-size: 24px;
        }
        .confirmation-message {
            margin-bottom: 30px;
            color: var(--gray);
        }
    `;
    document.head.appendChild(style);
}

// Product Modal Functions
let currentModalProduct = null;
let modalSelectedSize = null;

// Open product modal
async function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Check member status first
    const isMember = await checkMemberStatus();
    
    // Prevent non-members from viewing member-only products
    if (product.membersOnly && !isMember) {
        alert(currentLang === 'is' 
            ? 'Þessi vara er eingöngu fyrir meðlimi. Vinsamlegast skráðu þig inn sem meðlimur til að skoða þessa vöru.' 
            : 'This product is available to members only. Please login as a member to view this product.');
        return;
    }
    
    currentModalProduct = product;
    modalSelectedSize = null;
    
    const modal = document.getElementById('productModal');
    
    // Set product name
    document.querySelector('#modalProductName .is').textContent = product.nameIs;
    document.querySelector('#modalProductName .en').textContent = product.nameEn;
    
    // Set price
    document.getElementById('modalPrice').textContent = formatPrice(product.price) + ' ISK';
    
    // Set description
    document.getElementById('modalDescription').textContent = product.description;
    
    // Set main image
    const mainImage = document.getElementById('modalMainImage');
    if (product.images && product.images.length > 0) {
        mainImage.src = product.images[0].dataUrl;
        mainImage.alt = product.nameIs;
        
        // Set thumbnails
        const thumbnailsContainer = document.getElementById('modalThumbnails');
        thumbnailsContainer.innerHTML = product.images.map((img, index) => `
            <img class="thumbnail ${index === 0 ? 'active' : ''}" 
                 src="${img.dataUrl}" 
                 alt="${product.nameIs}" 
                 onclick="changeModalImage('${img.dataUrl}', ${index})">
        `).join('');
    } else if (product.imageUrl) {
        mainImage.src = product.imageUrl;
        mainImage.alt = product.nameIs;
        document.getElementById('modalThumbnails').innerHTML = '';
    }
    
    // Set sizes
    const sizesContainer = document.getElementById('modalSizes');
    const categorySizes = getSizesForCategory(product.category);
    sizesContainer.innerHTML = categorySizes.map(size => {
        const isAvailable = !product.availableSizes || product.availableSizes.includes(size);
        return `
            <button class="modal-size-btn ${!isAvailable ? 'disabled' : ''}" 
                    data-size="${size}"
                    onclick="selectModalSize('${size}')"
                    ${!isAvailable ? 'disabled' : ''}>
                ${size}
            </button>
        `;
    }).join('');
    
    // Set add to cart button
    const addToCartBtn = document.getElementById('modalAddToCart');
    if (product.membersOnly && !isMember) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<span class="is">Eingöngu Meðlimir</span><span class="en">Members Only</span>';
    } else {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = '<span class="is">Bæta í körfu</span><span class="en">Add to Cart</span>';
        addToCartBtn.onclick = () => addModalProductToCart();
    }
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Change modal main image
function changeModalImage(imageUrl, index) {
    document.getElementById('modalMainImage').src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('#modalThumbnails .thumbnail').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Select modal size
function selectModalSize(size) {
    modalSelectedSize = size;
    
    // Update button states
    document.querySelectorAll('#modalSizes .modal-size-btn').forEach(btn => {
        if (btn.dataset.size === size) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Add modal product to cart
function addModalProductToCart() {
    if (!currentModalProduct || !modalSelectedSize) {
        alert('Vinsamlegast veldu stærð / Please select a size');
        return;
    }
    
    const cartItem = {
        id: currentModalProduct.id,
        name: currentModalProduct.nameIs,
        price: currentModalProduct.price,
        size: modalSelectedSize,
        quantity: 1
    };
    
    addToCart(cartItem);
    closeProductModal();
}

// Close product modal
function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentModalProduct = null;
    modalSelectedSize = null;
}

// Get sizes for category (helper function)
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

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeProductModal();
    }
}

// Gallery navigation functions
const galleryStates = {};

function navigateGallery(productId, direction) {
    const gallery = document.querySelector(`[data-product-id="${productId}"]`);
    if (!gallery) return;
    
    const images = gallery.querySelectorAll('.gallery-image');
    const dots = gallery.parentElement.querySelectorAll('.gallery-dot');
    const totalImages = images.length;
    
    // Initialize state if not exists
    if (!galleryStates[productId]) {
        galleryStates[productId] = 0;
    }
    
    let currentIndex = galleryStates[productId];
    
    if (direction === 'prev') {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
    } else {
        currentIndex = (currentIndex + 1) % totalImages;
    }
    
    galleryStates[productId] = currentIndex;
    updateGalleryPosition(productId, currentIndex);
}

function goToSlide(productId, index) {
    galleryStates[productId] = index;
    updateGalleryPosition(productId, index);
}

function updateGalleryPosition(productId, index) {
    const gallery = document.querySelector(`[data-product-id="${productId}"]`);
    if (!gallery) return;
    
    // Update gallery position
    gallery.style.transform = `translateX(-${index * 100}%)`;
    
    // Update dots
    const dots = gallery.parentElement.querySelectorAll('.gallery-dot');
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Lazy load the current image if needed
    const images = gallery.querySelectorAll('.gallery-image');
    const currentImage = images[index];
    if (currentImage && currentImage.getAttribute('data-src') && !currentImage.classList.contains('loaded')) {
        const src = currentImage.getAttribute('data-src');
        const tempImg = new Image();
        tempImg.onload = function() {
            currentImage.src = src;
            currentImage.classList.add('loaded');
            currentImage.removeAttribute('data-src');
        };
        tempImg.src = src;
    }
    
    // Show current image, hide others
    images.forEach((img, i) => {
        img.style.display = i === index ? 'block' : 'none';
    });
}

// Make functions globally available
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.changeModalImage = changeModalImage;
window.selectModalSize = selectModalSize;
window.navigateGallery = navigateGallery;
window.goToSlide = goToSlide;
window.changePage = changePage;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for Firebase to initialize
    setTimeout(() => {
        loadProducts();
        updateCartUI();
    }, 500);
    
    // Also load when auth state changes
    firebase.auth().onAuthStateChanged(() => {
        // Reload products to update member-only visibility
        if (document.getElementById('productGrid')) {
            if (products.length > 0) {
                // If products are already loaded, just re-display with new auth state
                displayProducts();
            } else {
                // Otherwise load products from Firebase
                loadProducts();
            }
        }
    });
});