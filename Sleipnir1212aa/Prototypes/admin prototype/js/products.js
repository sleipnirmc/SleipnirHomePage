(function() {
    'use strict';

    var categoryGradients = {
        tshirt: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        hoodie: 'linear-gradient(135deg, #1a1a1a, #2d1f1f)',
        jacket: 'linear-gradient(135deg, #0d1117, #161b22)',
        jeans: 'linear-gradient(135deg, #1a1a2e, #0f1729)',
        other: 'linear-gradient(135deg, #1a1a1a, #2a1a1a)'
    };

    var categoryLabels = {
        tshirt: 'Bolur',
        hoodie: 'Hettupeysа',
        jacket: 'Jakki',
        jeans: 'Buxur',
        other: 'Annað'
    };

    var categorySizes = {
        tshirt: ['S', 'M', 'L', 'XL', 'XXL'],
        hoodie: ['S', 'M', 'L', 'XL', 'XXL'],
        jacket: ['S', 'M', 'L', 'XL', 'XXL'],
        jeans: ['28', '30', '32', '34', '36', '38'],
        other: ['One Size']
    };

    function renderProducts() {
        var data = window.MOCK_DATA.products;
        var search = document.getElementById('productSearch').value.toLowerCase();
        var catFilter = document.getElementById('productCategoryFilter').value;

        var filtered = data.filter(function(p) {
            var matchSearch = !search ||
                p.nameIs.toLowerCase().includes(search) ||
                p.nameEn.toLowerCase().includes(search);
            var matchCat = catFilter === 'all' || p.category === catFilter;
            return matchSearch && matchCat;
        });

        var grid = document.getElementById('productGrid');
        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">Engar vörur fundust</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(product) {
            var gradient = categoryGradients[product.category] || categoryGradients.other;
            var initials = AdminApp.generateInitials(product.nameEn);

            var badges = '';
            if (product.isNew) badges += '<span class="product-badge badge-new">Nýtt</span>';
            if (product.isPopular) badges += '<span class="product-badge badge-popular">Vinsælt</span>';
            if (product.membersOnly) badges += '<span class="product-badge badge-members">Aðeins meðlimir</span>';

            html += '<div class="product-card">' +
                '<div class="product-image" style="background:' + gradient + ';height:180px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;">' +
                    '<span class="product-image-text" style="font-size:2.5rem;font-weight:700;color:rgba(255,255,255,0.15);letter-spacing:4px;">' + initials + '</span>' +
                    (badges ? '<div class="product-badges" style="position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:4px;">' + badges + '</div>' : '') +
                '</div>' +
                '<div class="product-info">' +
                    '<div class="product-name">' + product.nameIs + '</div>' +
                    '<div class="product-name-en" style="color:#888;font-size:0.85rem;">' + product.nameEn + '</div>' +
                    '<div class="product-price" style="color:#cf2342;font-weight:700;font-size:1.1rem;margin:8px 0;">' + AdminApp.formatPrice(product.price) + '</div>' +
                    '<div class="product-meta" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
                        '<span class="badge badge--' + product.category + '">' + (categoryLabels[product.category] || product.category) + '</span>' +
                        '<span class="product-sizes" style="color:#888;font-size:0.8rem;">' + product.availableSizes.join(', ') + '</span>' +
                    '</div>' +
                    '<div class="product-actions" style="display:flex;gap:8px;">' +
                        '<button class="btn btn-sm btn-secondary" onclick="ProductsModule.editProduct(\'' + product.id + '\')">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Breyta' +
                        '</button>' +
                        '<button class="btn btn-sm btn-danger" onclick="ProductsModule.deleteProduct(\'' + product.id + '\')">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Eyða' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        grid.innerHTML = html;
    }

    function getProductFormHTML(product) {
        var p = product || {
            nameIs: '', nameEn: '', description: '', category: 'tshirt',
            price: '', availableSizes: [], membersOnly: false
        };
        var cat = p.category || 'tshirt';
        var sizes = categorySizes[cat] || ['S', 'M', 'L', 'XL', 'XXL'];

        var sizesHTML = sizes.map(function(s) {
            var checked = p.availableSizes.indexOf(s) !== -1 ? ' checked' : '';
            return '<label class="size-checkbox" style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer;">' +
                '<input type="checkbox" name="productSize" value="' + s + '"' + checked + '> ' + s +
            '</label>';
        }).join('');

        return '<form id="productForm" class="admin-form">' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">Heiti (Íslenska)</label>' +
                    '<input type="text" class="form-input" name="nameIs" value="' + escapeAttr(p.nameIs) + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">Name (English)</label>' +
                    '<input type="text" class="form-input" name="nameEn" value="' + escapeAttr(p.nameEn) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Lýsing</label>' +
                '<textarea class="form-textarea" name="description" rows="3">' + escapeHTML(p.description || '') + '</textarea>' +
            '</div>' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">Flokkur</label>' +
                    '<select class="form-select" name="category" id="modalCategorySelect">' +
                        '<option value="tshirt"' + (cat === 'tshirt' ? ' selected' : '') + '>Bolur</option>' +
                        '<option value="hoodie"' + (cat === 'hoodie' ? ' selected' : '') + '>Hettupeysа</option>' +
                        '<option value="jacket"' + (cat === 'jacket' ? ' selected' : '') + '>Jakki</option>' +
                        '<option value="jeans"' + (cat === 'jeans' ? ' selected' : '') + '>Buxur</option>' +
                        '<option value="other"' + (cat === 'other' ? ' selected' : '') + '>Annað</option>' +
                    '</select>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">Verð (ISK)</label>' +
                    '<input type="number" class="form-input" name="price" value="' + (p.price || '') + '" min="0" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Stærðir í boði</label>' +
                '<div class="form-checkbox-group" id="modalSizeGroup" style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 0;">' + sizesHTML + '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Aðeins meðlimir</label>' +
                '<label class="toggle-label" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">' +
                    '<input type="checkbox" name="membersOnly"' + (p.membersOnly ? ' checked' : '') + ' class="toggle-input"> ' +
                    '<span class="toggle-switch"></span> Já' +
                '</label>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Myndir</label>' +
                '<div class="image-upload-zone" style="border:2px dashed rgba(255,255,255,0.15);border-radius:8px;padding:30px;text-align:center;cursor:pointer;transition:border-color 0.2s;">' +
                    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                    '<p style="color:#888;margin-top:8px;margin-bottom:0;">Smelltu eða dragðu myndir hingað</p>' +
                '</div>' +
            '</div>' +
        '</form>';
    }

    function handleCategoryChange() {
        setTimeout(function() {
            var select = document.getElementById('modalCategorySelect');
            if (!select) return;
            select.addEventListener('change', function() {
                var cat = this.value;
                var sizes = categorySizes[cat] || ['One Size'];
                var group = document.getElementById('modalSizeGroup');
                if (!group) return;
                group.innerHTML = sizes.map(function(s) {
                    return '<label class="size-checkbox" style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer;">' +
                        '<input type="checkbox" name="productSize" value="' + s + '"> ' + s +
                    '</label>';
                }).join('');
            });
        }, 50);
    }

    function collectFormData() {
        var form = document.getElementById('productForm');
        if (!form) return null;

        var nameIs = form.querySelector('[name="nameIs"]').value.trim();
        var nameEn = form.querySelector('[name="nameEn"]').value.trim();
        if (!nameIs || !nameEn) {
            AdminApp.showToast('Vinsamlegast fylltu út nöfn vörunnar', 'error');
            return null;
        }

        var price = parseInt(form.querySelector('[name="price"]').value);
        if (!price || price <= 0) {
            AdminApp.showToast('Vinsamlegast sláðu inn gilt verð', 'error');
            return null;
        }

        var sizes = [];
        form.querySelectorAll('[name="productSize"]:checked').forEach(function(cb) {
            sizes.push(cb.value);
        });
        if (sizes.length === 0) {
            AdminApp.showToast('Vinsamlegast veldu amk eina stærð', 'error');
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

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Public API
    window.ProductsModule = {
        editProduct: function(id) {
            var product = window.MOCK_DATA.products.find(function(p) { return p.id === id; });
            if (!product) return;

            var bodyHTML = getProductFormHTML(product);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-primary" onclick="ProductsModule.saveEdit(\'' + id + '\')">Vista breytingar</button>';

            AdminApp.openModal('Breyta vöru', bodyHTML, footerHTML);
            handleCategoryChange();
        },

        saveEdit: function(id) {
            var data = collectFormData();
            if (!data) return;
            var idx = window.MOCK_DATA.products.findIndex(function(p) { return p.id === id; });
            if (idx === -1) return;
            Object.assign(window.MOCK_DATA.products[idx], data);
            AdminApp.closeModal();
            AdminApp.showToast('Vara uppfærð', 'success');
            renderProducts();
        },

        deleteProduct: function(id) {
            var product = window.MOCK_DATA.products.find(function(p) { return p.id === id; });
            if (!product) return;

            AdminApp.openModal('Eyða vöru',
                '<p style="color:#b3b2b2;font-size:1.1rem;">Ertu viss um að þú viljir eyða <strong>' + escapeHTML(product.nameIs) + '</strong>?</p>' +
                '<p style="color:#888;margin-top:8px;">Þessa aðgerð er ekki hægt að afturkalla.</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-danger" onclick="ProductsModule.confirmDelete(\'' + id + '\')">Eyða</button>'
            );
        },

        confirmDelete: function(id) {
            window.MOCK_DATA.products = window.MOCK_DATA.products.filter(function(p) { return p.id !== id; });
            AdminApp.closeModal();
            AdminApp.showToast('Vöru eytt', 'success');
            renderProducts();
        },

        addProduct: function() {
            var bodyHTML = getProductFormHTML(null);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-primary" onclick="ProductsModule.saveNew()">Bæta við</button>';
            AdminApp.openModal('Ný vara', bodyHTML, footerHTML);
            handleCategoryChange();
        },

        saveNew: function() {
            var data = collectFormData();
            if (!data) return;
            data.id = 'prd' + Date.now();
            data.isNew = true;
            data.isPopular = false;
            data.createdAt = new Date().toISOString().split('T')[0];
            window.MOCK_DATA.products.unshift(data);
            AdminApp.closeModal();
            AdminApp.showToast('Vöru bætt við', 'success');
            renderProducts();
        }
    };

    // Initialize
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'products') {
            renderProducts();
            document.getElementById('addProductBtn').addEventListener('click', ProductsModule.addProduct);
            document.getElementById('productSearch').addEventListener('input', debounce(renderProducts, 300));
            document.getElementById('productCategoryFilter').addEventListener('change', renderProducts);
        }
    });

    function debounce(fn, delay) {
        var timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

})();
