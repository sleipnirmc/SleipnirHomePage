/**
 * Contact page script — Leaflet map + contact form
 */
(function() {
    // Initialize the map with dark theme
    var mapEl = document.getElementById('map');
    if (!mapEl) return;

    var map = L.map('map').setView([64.037402, -21.987437], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Create custom Sleipnir icon
    var sleipnirIcon = L.divIcon({
        html: '<div style="background: #cf2342; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #000; box-shadow: 0 0 20px rgba(207, 35, 66, 0.8);"><span style="color: white; font-size: 20px; font-weight: bold;">S</span></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'sleipnir-marker'
    });

    // Add marker
    var marker = L.marker([64.037402, -21.987437], {icon: sleipnirIcon}).addTo(map);
    marker.bindPopup('<b>Sleipnir MC Reykjavík</b><br>Home of the Three-Legged Brotherhood').openPopup();

    // Contact form handler
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var button = document.getElementById('sendButton');
            var btnText = button.querySelector('.btn-text');
            var btnLoading = button.querySelector('.btn-loading');

            var formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            var successMsg = document.getElementById('formSuccess');
            var errorMsg = document.getElementById('formError');

            successMsg.style.display = 'none';
            errorMsg.style.display = 'none';

            button.classList.add('loading');
            button.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'block';

            try {
                await firebase.firestore().collection('contactMessages').add(formData);

                button.classList.remove('loading');
                button.classList.add('success');
                btnLoading.style.display = 'none';
                btnText.style.display = 'block';
                btnText.textContent = SleipnirI18n.t('contact.form.sent');

                successMsg.style.display = 'block';
                e.target.reset();

                setTimeout(function() {
                    button.classList.remove('success');
                    button.disabled = false;
                    btnText.textContent = SleipnirI18n.t('contact.form.submit');
                    successMsg.style.display = 'none';
                }, 3000);

            } catch (error) {
                console.error('Error sending message:', error);
                button.classList.remove('loading');
                button.disabled = false;
                btnLoading.style.display = 'none';
                btnText.style.display = 'block';
                errorMsg.style.display = 'block';

                setTimeout(function() {
                    errorMsg.style.display = 'none';
                }, 5000);
            }
        });
    }

    // Add animation on scroll
    var observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                setTimeout(function() {
                    entry.target.style.transition = 'all 0.6s ease-out';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.contact-card').forEach(function(el) {
        observer.observe(el);
    });
})();
