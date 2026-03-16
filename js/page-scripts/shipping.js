(function() {
    'use strict';

    var t = window.SleipnirI18n ? window.SleipnirI18n.t : function(k, d) { return d; };

    function init() {
        var form = document.querySelector('.shipping-form');
        if (!form) return;

        var user = firebase.auth().currentUser;
        if (!user) {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
        }

        loadShippingInfo();

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveShippingInfo();
        });
    }

    async function loadShippingInfo() {
        var loadingEl = document.getElementById('shippingLoading');
        if (loadingEl) loadingEl.style.display = 'block';

        try {
            var data = await window.sleipnirAuth.getShippingInfo();
            if (data) {
                var addressInput = document.getElementById('shippingAddress');
                var cityInput = document.getElementById('shippingCity');
                var postalInput = document.getElementById('shippingPostal');
                var phoneInput = document.getElementById('shippingPhone');

                if (addressInput) addressInput.value = data.address || '';
                if (cityInput) cityInput.value = data.city || '';
                if (postalInput) postalInput.value = data.postalCode || '';
                if (phoneInput) phoneInput.value = data.phone || '';
            }
        } catch (error) {
            console.error('Error loading shipping info:', error);
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    async function saveShippingInfo() {
        var address = document.getElementById('shippingAddress').value.trim();
        var city = document.getElementById('shippingCity').value.trim();
        var postalCode = document.getElementById('shippingPostal').value.trim();
        var phone = document.getElementById('shippingPhone').value.trim();
        var messageEl = document.getElementById('shippingMessage');
        var saveBtn = document.querySelector('.shipping-save-btn');

        if (!address) {
            if (messageEl) {
                messageEl.textContent = t('shipping.address.required', 'Heimilisfang er nauðsynlegt');
                messageEl.className = 'form-message error';
                messageEl.style.display = 'block';
            }
            return;
        }

        if (saveBtn) saveBtn.disabled = true;

        try {
            var result = await window.sleipnirAuth.saveShippingInfo({
                address: address,
                city: city,
                postalCode: postalCode,
                phone: phone
            });

            if (result.success) {
                if (messageEl) {
                    messageEl.textContent = t('shipping.saved', 'Sendingaupplýsingar vistaðar!');
                    messageEl.className = 'form-message success';
                    messageEl.style.display = 'block';
                }
            } else {
                if (messageEl) {
                    messageEl.textContent = t('shipping.error', 'Villa kom upp við að vista');
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error saving shipping info:', error);
            if (messageEl) {
                messageEl.textContent = t('shipping.error', 'Villa kom upp við að vista');
                messageEl.className = 'form-message error';
                messageEl.style.display = 'block';
            }
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    // Listen for page load event from SPA router
    if (document.querySelector('.shipping-form')) {
        init();
    }
    window.addEventListener('pageLoaded', function() {
        if (document.querySelector('.shipping-form')) {
            init();
        }
    });
})();
