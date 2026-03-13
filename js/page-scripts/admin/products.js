(function() {
    'use strict';

    if (!document.getElementById('page-dashboard')) return;

    // =============================================
    // PRODUCTS MODULE — Firestore-backed product management
    // Depends on: window.AdminApp, firebase
    // =============================================

    var products = [];
    var uploadedImages = [];
    var currentEditImages = [];
    var editNewImages = [];

    var categoryGradients = {
        tshirt: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        hoodie: 'linear-gradient(135deg, #1a1a1a, #2d1f1f)',
        jacket: 'linear-gradient(135deg, #0d1117, #161b22)',
        jeans: 'linear-gradient(135deg, #1a1a2e, #0f1729)',
        other: 'linear-gradient(135deg, #1a1a1a, #2a1a1a)'
    };

    var categoryLabels = {
        tshirt: 'Bolir',
        hoodie: 'Hettupeysa',
        jacket: 'Jakkar',
        jeans: 'Buxur',
        other: 'Anna\u00F0'
    };

    var categorySizes = {
        tshirt: ['S', 'M', 'L', 'XL', 'XXL'],
        hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
        jacket: ['S', 'M', 'L', 'XL', 'XXL'],
        jeans: ['28', '30', '32', '34', '36', '38'],
        other: ['One Size']
    };

    // =============================================
    // DATA LOADING
    // =============================================

    function loadProducts() {
        var grid = document.getElementById('productGrid');
        if (!grid) return;

        AdminApp.showLoading(grid);

        // Ensure db is available (may not be set if Firebase loaded after admin-app.js)
        var db = AdminApp.db;
        if (!db && typeof firebase !== 'undefined' && firebase.firestore) {
            db = firebase.firestore();
            AdminApp.db = db;
        }
        if (!db) {
            grid.innerHTML = '<div class="empty-state">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.loadError', 'Firebase ekki tilgengilegt')) + '</div>';
            return;
        }

        db.collection('products').orderBy('createdAt', 'desc').get()
            .then(function(snapshot) {
                products = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    products.push(data);
                });
                renderProducts();
            })
            .catch(function(error) {
                console.warn('Ordered products query failed, trying without order:', error);
                // Fallback: fetch without orderBy and sort client-side
                db.collection('products').get()
                    .then(function(snapshot) {
                        products = [];
                        snapshot.forEach(function(doc) {
                            var data = doc.data();
                            data.id = doc.id;
                            products.push(data);
                        });
                        products.sort(function(a, b) {
                            var aDate = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                            var bDate = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                            return bDate - aDate;
                        });
                        renderProducts();
                    })
                    .catch(function(err2) {
                        console.error('Error loading products (fallback):', err2);
                        AdminApp.showToast(SleipnirI18n.t('admin.products.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a v\u00F6rum'), 'error');
                        grid.innerHTML = '<div class="empty-state">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a v\u00F6rum')) + '</div>';
                    });
            });
    }

    // =============================================
    // RENDERING
    // =============================================

    function renderProducts() {
        var grid = document.getElementById('productGrid');
        if (!grid) return;

        var searchEl = document.getElementById('productSearch');
        var catFilterEl = document.getElementById('productCategoryFilter');
        var search = searchEl ? searchEl.value.toLowerCase() : '';
        var catFilter = catFilterEl ? catFilterEl.value : 'all';

        var filtered = products.filter(function(p) {
            var nameIs = (p.nameIs || '').toLowerCase();
            var nameEn = (p.nameEn || '').toLowerCase();
            var matchSearch = !search || nameIs.indexOf(search) !== -1 || nameEn.indexOf(search) !== -1;
            var matchCat = catFilter === 'all' || p.category === catFilter;
            return matchSearch && matchCat;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.empty', 'Engar v\u00F6rur fundust')) + '</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(product) {
            var gradient = categoryGradients[product.category] || categoryGradients.other;
            var initials = AdminApp.generateInitials(product.nameEn || product.nameIs || '');
            var hasImage = product.images && product.images.length > 0 && product.images[0].dataUrl;

            var badges = '';
            if (product.isNew) badges += '<span class="product-badge badge-new">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.badgeNew', 'N\u00FDtt')) + '</span>';
            if (product.isPopular) badges += '<span class="product-badge badge-popular">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.badgePopular', 'Vins\u00E6lt')) + '</span>';
            if (product.membersOnly) badges += '<span class="product-badge badge-members">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.badgeMembers', 'A\u00F0eins me\u00F0limir')) + '</span>';

            var imageHTML;
            if (hasImage) {
                imageHTML = '<div class="product-image" style="height:180px;border-radius:8px 8px 0 0;overflow:hidden;position:relative;">' +
                    '<img src="' + AdminApp.escapeAttr(product.images[0].dataUrl) + '" alt="' + AdminApp.escapeAttr(product.nameIs) + '" style="width:100%;height:100%;object-fit:cover;">' +
                    (badges ? '<div class="product-badges" style="position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:4px;">' + badges + '</div>' : '') +
                '</div>';
            } else {
                imageHTML = '<div class="product-image" style="background:' + gradient + ';height:180px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;position:relative;">' +
                    '<span class="product-image-text" style="font-size:2.5rem;font-weight:700;color:rgba(255,255,255,0.15);letter-spacing:4px;">' + AdminApp.escapeHTML(initials) + '</span>' +
                    (badges ? '<div class="product-badges" style="position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:4px;">' + badges + '</div>' : '') +
                '</div>';
            }

            var sizes = product.availableSizes || [];
            var catLabel = categoryLabels[product.category] || product.category;

            html += '<div class="product-card">' +
                imageHTML +
                '<div class="product-info">' +
                    '<div class="product-name">' + AdminApp.escapeHTML(product.nameIs || '') + '</div>' +
                    '<div class="product-name-en" style="color:#888;font-size:0.85rem;">' + AdminApp.escapeHTML(product.nameEn || '') + '</div>' +
                    '<div class="product-price" style="color:#cf2342;font-weight:700;font-size:1.1rem;margin:8px 0;">' + AdminApp.formatPrice(product.price) + '</div>' +
                    '<div class="product-meta" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
                        '<span class="badge badge--' + AdminApp.escapeAttr(product.category || 'other') + '">' + AdminApp.escapeHTML(catLabel) + '</span>' +
                        '<span class="product-sizes" style="color:#888;font-size:0.8rem;">' + AdminApp.escapeHTML(sizes.join(', ')) + '</span>' +
                    '</div>' +
                    '<div class="product-actions" style="display:flex;gap:8px;flex-wrap:wrap;">' +
                        '<button class="btn btn-sm btn-secondary" onclick="ProductsModule.editProduct(\'' + AdminApp.escapeAttr(product.id) + '\')">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ' +
                            AdminApp.escapeHTML(SleipnirI18n.t('admin.products.edit', 'Breyta')) +
                        '</button>' +
                        '<button class="btn btn-sm btn-' + (product.isPopular ? 'warning' : 'info') + '" onclick="ProductsModule.togglePopular(\'' + AdminApp.escapeAttr(product.id) + '\')" style="font-size:0.75rem;">' +
                            (product.isPopular
                                ? AdminApp.escapeHTML(SleipnirI18n.t('admin.products.removePopular', 'Fjarl\u00E6gja vins\u00E6lt'))
                                : AdminApp.escapeHTML(SleipnirI18n.t('admin.products.markPopular', 'Merkja vins\u00E6lt'))) +
                        '</button>' +
                        '<button class="btn btn-sm btn-danger" onclick="ProductsModule.deleteProduct(\'' + AdminApp.escapeAttr(product.id) + '\')">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ' +
                            AdminApp.escapeHTML(SleipnirI18n.t('admin.products.delete', 'Ey\u00F0a')) +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        grid.innerHTML = html;
    }

    // =============================================
    // FORM HTML
    // =============================================

    function getProductFormHTML(product) {
        var p = product || {
            nameIs: '', nameEn: '', description: '', category: 'tshirt',
            price: '', availableSizes: [], membersOnly: false
        };
        var cat = p.category || 'tshirt';
        var sizes = categorySizes[cat] || ['S', 'M', 'L', 'XL', 'XXL'];
        var currentSizes = p.availableSizes || [];

        var sizesHTML = sizes.map(function(s) {
            var checked = currentSizes.indexOf(s) !== -1 ? ' checked' : '';
            return '<label class="size-checkbox" style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer;">' +
                '<input type="checkbox" name="productSize" value="' + AdminApp.escapeAttr(s) + '"' + checked + '> ' + AdminApp.escapeHTML(s) +
            '</label>';
        }).join('');

        return '<form id="productForm" class="admin-form">' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.nameIs', 'Heiti (\u00CDslenska)')) + '</label>' +
                    '<input type="text" class="form-input" name="nameIs" value="' + AdminApp.escapeAttr(p.nameIs) + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.nameEn', 'Name (English)')) + '</label>' +
                    '<input type="text" class="form-input" name="nameEn" value="' + AdminApp.escapeAttr(p.nameEn) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.description', 'L\u00FDsing')) + '</label>' +
                '<textarea class="form-textarea" name="description" rows="3">' + AdminApp.escapeHTML(p.description || '') + '</textarea>' +
            '</div>' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.category', 'Flokkur')) + '</label>' +
                    '<select class="form-select" name="category" id="modalCategorySelect">' +
                        '<option value="tshirt"' + (cat === 'tshirt' ? ' selected' : '') + '>Bolir</option>' +
                        '<option value="hoodie"' + (cat === 'hoodie' ? ' selected' : '') + '>Hettupeysa</option>' +
                        '<option value="jacket"' + (cat === 'jacket' ? ' selected' : '') + '>Jakkar</option>' +
                        '<option value="jeans"' + (cat === 'jeans' ? ' selected' : '') + '>Buxur</option>' +
                        '<option value="other"' + (cat === 'other' ? ' selected' : '') + '>Anna\u00F0</option>' +
                    '</select>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.price', 'Ver\u00F0 (ISK)')) + '</label>' +
                    '<input type="number" class="form-input" name="price" value="' + (p.price || '') + '" min="0" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.sizes', 'St\u00E6r\u00F0ir \u00ED bo\u00F0i')) + '</label>' +
                '<div class="form-checkbox-group" id="modalSizeGroup" style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 0;">' + sizesHTML + '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.membersOnly', 'A\u00F0eins me\u00F0limir')) + '</label>' +
                '<label class="toggle-label" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">' +
                    '<input type="checkbox" name="membersOnly"' + (p.membersOnly ? ' checked' : '') + ' class="toggle-input"> ' +
                    '<span class="toggle-switch"></span> ' + AdminApp.escapeHTML(SleipnirI18n.t('admin.common.yes', 'J\u00E1')) +
                '</label>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.images', 'Myndir')) + '</label>' +
                '<div id="modalExistingImages" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;"></div>' +
                '<div id="modalNewImagePreviews" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;"></div>' +
                '<div id="modalImageUploadZone" class="image-upload-zone" style="border:2px dashed rgba(255,255,255,0.15);border-radius:8px;padding:30px;text-align:center;cursor:pointer;transition:border-color 0.2s;">' +
                    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                    '<p style="color:#888;margin-top:8px;margin-bottom:0;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.dragImages', 'Smelltu e\u00F0a drag\u00F0u myndir hinga\u00F0')) + '</p>' +
                '</div>' +
                '<input type="file" id="modalImageFileInput" accept="image/*" multiple style="display:none;">' +
            '</div>' +
        '</form>';
    }

    // =============================================
    // MODAL INTERACTIVITY SETUP
    // =============================================

    function setupModalInteractions() {
        setTimeout(function() {
            // Category change -> update sizes
            var select = document.getElementById('modalCategorySelect');
            if (select) {
                select.addEventListener('change', function() {
                    var cat = this.value;
                    var sizes = categorySizes[cat] || ['One Size'];
                    var group = document.getElementById('modalSizeGroup');
                    if (!group) return;
                    group.innerHTML = sizes.map(function(s) {
                        return '<label class="size-checkbox" style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer;">' +
                            '<input type="checkbox" name="productSize" value="' + AdminApp.escapeAttr(s) + '"> ' + AdminApp.escapeHTML(s) +
                        '</label>';
                    }).join('');
                });
            }

            // Image upload zone
            var zone = document.getElementById('modalImageUploadZone');
            var fileInput = document.getElementById('modalImageFileInput');
            if (zone && fileInput) {
                zone.addEventListener('click', function() {
                    fileInput.click();
                });

                fileInput.addEventListener('change', function(e) {
                    handleImageFiles(e.target.files);
                });

                zone.addEventListener('dragenter', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.style.borderColor = '#cf2342';
                });

                zone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.style.borderColor = '#cf2342';
                });

                zone.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.style.borderColor = 'rgba(255,255,255,0.15)';
                });

                zone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.style.borderColor = 'rgba(255,255,255,0.15)';
                    handleImageFiles(e.dataTransfer.files);
                });
            }
        }, 50);
    }

    function handleImageFiles(files) {
        if (!files || !files.length) return;
        var fileArr = Array.prototype.slice.call(files);
        fileArr.forEach(function(file) {
            if (!file.type.startsWith('image/')) {
                AdminApp.showToast(SleipnirI18n.t('admin.products.imageOnly', 'Einungis myndaskr\u00E1r leyfar'), 'error');
                return;
            }
            var reader = new FileReader();
            reader.onloadend = function() {
                var imageData = { dataUrl: reader.result, name: file.name };
                // Determine which list to add to (edit mode or add mode)
                if (currentEditImages.length > 0 || editNewImages.length > 0) {
                    editNewImages.push(imageData);
                    renderEditNewPreviews();
                } else {
                    uploadedImages.push(imageData);
                    renderNewImagePreviews();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function renderNewImagePreviews() {
        var container = document.getElementById('modalNewImagePreviews');
        if (!container) return;
        var html = '';
        uploadedImages.forEach(function(img, idx) {
            html += '<div style="position:relative;width:80px;height:80px;display:inline-block;">' +
                '<img src="' + AdminApp.escapeAttr(img.dataUrl) + '" alt="' + AdminApp.escapeAttr(img.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">' +
                '<button type="button" onclick="ProductsModule.removeNewImage(' + idx + ')" style="position:absolute;top:-6px;right:-6px;background:#cf2342;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:22px;text-align:center;">\u00D7</button>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    function renderExistingImages() {
        var container = document.getElementById('modalExistingImages');
        if (!container) return;
        var html = '';
        currentEditImages.forEach(function(img, idx) {
            html += '<div style="position:relative;width:80px;height:80px;display:inline-block;">' +
                '<img src="' + AdminApp.escapeAttr(img.dataUrl) + '" alt="' + AdminApp.escapeAttr(img.name || '') + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">' +
                '<button type="button" onclick="ProductsModule.removeExistingImage(' + idx + ')" style="position:absolute;top:-6px;right:-6px;background:#cf2342;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:22px;text-align:center;">\u00D7</button>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    function renderEditNewPreviews() {
        var container = document.getElementById('modalNewImagePreviews');
        if (!container) return;
        var html = '';
        editNewImages.forEach(function(img, idx) {
            html += '<div style="position:relative;width:80px;height:80px;display:inline-block;">' +
                '<img src="' + AdminApp.escapeAttr(img.dataUrl) + '" alt="' + AdminApp.escapeAttr(img.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">' +
                '<button type="button" onclick="ProductsModule.removeEditNewImage(' + idx + ')" style="position:absolute;top:-6px;right:-6px;background:#cf2342;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:22px;text-align:center;">\u00D7</button>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    // =============================================
    // FORM DATA COLLECTION
    // =============================================

    function collectFormData() {
        var form = document.getElementById('productForm');
        if (!form) return null;

        var nameIs = form.querySelector('[name="nameIs"]').value.trim();
        var nameEn = form.querySelector('[name="nameEn"]').value.trim();
        if (!nameIs || !nameEn) {
            AdminApp.showToast(SleipnirI18n.t('admin.products.nameRequired', 'Vinsamlegast fylltu \u00FAt n\u00F6fn v\u00F6runnar'), 'error');
            return null;
        }

        var price = parseInt(form.querySelector('[name="price"]').value);
        if (!price || price <= 0) {
            AdminApp.showToast(SleipnirI18n.t('admin.products.priceRequired', 'Vinsamlegast sl\u00E1\u00F0u inn gilt ver\u00F0'), 'error');
            return null;
        }

        var sizes = [];
        var sizeCheckboxes = form.querySelectorAll('[name="productSize"]:checked');
        for (var i = 0; i < sizeCheckboxes.length; i++) {
            sizes.push(sizeCheckboxes[i].value);
        }
        if (sizes.length === 0) {
            AdminApp.showToast(SleipnirI18n.t('admin.products.sizeRequired', 'Vinsamlegast veldu amk eina st\u00E6r\u00F0'), 'error');
            return null;
        }

        return {
            nameIs: nameIs,
            nameEn: nameEn,
            description: form.querySelector('[name="description"]').value.trim(),
            category: form.querySelector('[name="category"]').value,
            price: price,
            availableSizes: sizes,
            membersOnly: form.querySelector('[name="membersOnly"]').checked
        };
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.ProductsModule = {

        // --- Add Product ---
        addProduct: function() {
            uploadedImages = [];
            currentEditImages = [];
            editNewImages = [];

            var bodyHTML = getProductFormHTML(null);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="ProductsModule.saveNew()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.products.add', 'B\u00E6ta vi\u00F0')) +
                '</button>';

            AdminApp.openModal(SleipnirI18n.t('admin.products.newProduct', 'N\u00FD vara'), bodyHTML, footerHTML);
            setupModalInteractions();
        },

        saveNew: function() {
            var data = collectFormData();
            if (!data) return;

            if (uploadedImages.length === 0) {
                AdminApp.showToast(SleipnirI18n.t('admin.products.imageRequired', '\u00DEa\u00F0 \u00FEarf a\u00F0 hla\u00F0a upp amk einni mynd'), 'error');
                return;
            }

            var images = uploadedImages.map(function(img) {
                return { dataUrl: img.dataUrl, name: img.name };
            });

            data.images = images;
            data.isNew = true;
            data.isPopular = false;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

            AdminApp.db.collection('products').add(data)
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.products.addSuccess', 'V\u00F6ru b\u00E6tt vi\u00F0'), 'success');
                    AdminApp.logActivity('product_added', data.nameIs + ' / ' + data.nameEn);
                    loadProducts();
                })
                .catch(function(error) {
                    console.error('Error adding product:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.products.addError', 'Villa vi\u00F0 a\u00F0 b\u00E6ta vi\u00F0 v\u00F6ru'), 'error');
                });
        },

        // --- Edit Product ---
        editProduct: function(id) {
            var product = null;
            for (var i = 0; i < products.length; i++) {
                if (products[i].id === id) { product = products[i]; break; }
            }
            if (!product) return;

            uploadedImages = [];
            currentEditImages = (product.images || []).slice();
            editNewImages = [];

            var bodyHTML = getProductFormHTML(product);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="ProductsModule.saveEdit(\'' + AdminApp.escapeAttr(id) + '\')">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.products.saveChanges', 'Vista breytingar')) +
                '</button>';

            AdminApp.openModal(SleipnirI18n.t('admin.products.editProduct', 'Breyta v\u00F6ru'), bodyHTML, footerHTML);
            setupModalInteractions();

            // Render existing images after modal is open
            setTimeout(function() {
                renderExistingImages();
            }, 60);
        },

        saveEdit: function(id) {
            var data = collectFormData();
            if (!data) return;

            var allImages = currentEditImages.concat(editNewImages.map(function(img) {
                return { dataUrl: img.dataUrl, name: img.name };
            }));

            if (allImages.length === 0) {
                AdminApp.showToast(SleipnirI18n.t('admin.products.imageRequired', '\u00DEa\u00F0 \u00FEarf a\u00F0 hla\u00F0a upp amk einni mynd'), 'error');
                return;
            }

            data.images = allImages;
            data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

            AdminApp.db.collection('products').doc(id).update(data)
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.products.editSuccess', 'Vara uppf\u00E6r\u00F0'), 'success');
                    AdminApp.logActivity('product_updated', data.nameIs + ' / ' + data.nameEn);
                    loadProducts();
                })
                .catch(function(error) {
                    console.error('Error updating product:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.products.editError', 'Villa vi\u00F0 a\u00F0 uppf\u00E6ra v\u00F6ru'), 'error');
                });
        },

        // --- Delete Product ---
        deleteProduct: function(id) {
            var product = null;
            for (var i = 0; i < products.length; i++) {
                if (products[i].id === id) { product = products[i]; break; }
            }
            if (!product) return;

            AdminApp.openModal(
                SleipnirI18n.t('admin.products.deleteTitle', 'Ey\u00F0a v\u00F6ru'),
                '<p style="color:#b3b2b2;font-size:1.1rem;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.deleteConfirm', 'Ertu viss um a\u00F0 \u00FE\u00FA viljir ey\u00F0a')) + ' <strong>' + AdminApp.escapeHTML(product.nameIs) + '</strong>?</p>' +
                '<p style="color:#888;margin-top:8px;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cannotUndo', '\u00DEessa a\u00F0ger\u00F0 er ekki h\u00E6gt a\u00F0 afturkalla.')) + '</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) + '</button>' +
                '<button class="btn btn-danger" onclick="ProductsModule.confirmDelete(\'' + AdminApp.escapeAttr(id) + '\')">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.products.delete', 'Ey\u00F0a')) + '</button>'
            );
        },

        confirmDelete: function(id) {
            var product = null;
            for (var i = 0; i < products.length; i++) {
                if (products[i].id === id) { product = products[i]; break; }
            }

            AdminApp.db.collection('products').doc(id).delete()
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.products.deleteSuccess', 'V\u00F6ru eytt'), 'success');
                    AdminApp.logActivity('product_deleted', product ? (product.nameIs + ' / ' + product.nameEn) : id);
                    loadProducts();
                })
                .catch(function(error) {
                    console.error('Error deleting product:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.products.deleteError', 'Villa vi\u00F0 a\u00F0 ey\u00F0a v\u00F6ru'), 'error');
                });
        },

        // --- Toggle Popular ---
        togglePopular: function(id) {
            var product = null;
            for (var i = 0; i < products.length; i++) {
                if (products[i].id === id) { product = products[i]; break; }
            }
            if (!product) return;

            var newVal = !product.isPopular;
            AdminApp.db.collection('products').doc(id).update({ isPopular: newVal })
                .then(function() {
                    product.isPopular = newVal;
                    AdminApp.showToast(
                        newVal
                            ? SleipnirI18n.t('admin.products.markedPopular', 'Vara merkt sem vins\u00E6l')
                            : SleipnirI18n.t('admin.products.unmarkedPopular', 'Vara ekki lengur merkt sem vins\u00E6l'),
                        'success'
                    );
                    renderProducts();
                })
                .catch(function(error) {
                    console.error('Error toggling popular:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.products.updateError', 'Villa vi\u00F0 a\u00F0 uppf\u00E6ra v\u00F6ru'), 'error');
                });
        },

        // --- Image removal helpers (called from onclick) ---
        removeNewImage: function(idx) {
            uploadedImages.splice(idx, 1);
            renderNewImagePreviews();
        },

        removeExistingImage: function(idx) {
            var total = currentEditImages.length + editNewImages.length;
            if (total <= 1) {
                AdminApp.showToast(SleipnirI18n.t('admin.products.minOneImage', 'Vara ver\u00F0ur a\u00F0 hafa amk eina mynd'), 'error');
                return;
            }
            currentEditImages.splice(idx, 1);
            renderExistingImages();
        },

        removeEditNewImage: function(idx) {
            var total = currentEditImages.length + editNewImages.length;
            if (total <= 1) {
                AdminApp.showToast(SleipnirI18n.t('admin.products.minOneImage', 'Vara ver\u00F0ur a\u00F0 hafa amk eina mynd'), 'error');
                return;
            }
            editNewImages.splice(idx, 1);
            renderEditNewPreviews();
        }
    };

    // =============================================
    // SECTION EVENTS
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section !== 'products') return;

        var addBtn = document.getElementById('addProductBtn');
        var searchInput = document.getElementById('productSearch');
        var catFilter = document.getElementById('productCategoryFilter');

        if (addBtn) addBtn.addEventListener('click', ProductsModule.addProduct);
        if (searchInput) searchInput.addEventListener('input', AdminApp.debounce(renderProducts, 300));
        if (catFilter) catFilter.addEventListener('change', renderProducts);
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section !== 'products') return;
        loadProducts();
    });

})();
