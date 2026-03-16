/**
 * Sleipnir MC -- Email Verification Handler
 * Reads oobCode from URL, calls applyActionCode, shows result.
 */
(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var mode = params.get('mode');
    var oobCode = params.get('oobCode');

    var loadingEl = document.getElementById('verify-loading');
    var successEl = document.getElementById('verify-success');
    var errorEl = document.getElementById('verify-error');
    var nocodeEl = document.getElementById('verify-nocode');
    var errorMsgEl = document.getElementById('verify-error-msg');

    function showState(el) {
        [loadingEl, successEl, errorEl, nocodeEl].forEach(function (s) {
            if (s) s.style.display = 'none';
        });
        if (el) el.style.display = '';
    }

    // Wire up SPA navigation for buttons
    document.querySelectorAll('.verify-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.sleipnirRouter) {
                window.sleipnirRouter.navigate('/login');
            } else {
                window.location.href = '/login';
            }
        });
    });

    if (mode === 'verifyEmail' && oobCode) {
        showState(loadingEl);

        firebase.auth().applyActionCode(oobCode).then(function () {
            showState(successEl);

            // Reload current user to update emailVerified flag
            if (firebase.auth().currentUser) {
                firebase.auth().currentUser.reload();
            }
        }).catch(function (err) {
            console.error('Email verification error:', err);
            showState(errorEl);

            // Show specific error message
            if (errorMsgEl) {
                var lang = (window.currentLang || localStorage.getItem('language') || 'is');
                if (err.code === 'auth/expired-action-code') {
                    errorMsgEl.textContent = lang === 'en'
                        ? 'This verification link has expired. Please request a new one.'
                        : 'Staðfestingartengill er útrunninn. Vinsamlegast biðjið um nýjan.';
                } else if (err.code === 'auth/invalid-action-code') {
                    errorMsgEl.textContent = lang === 'en'
                        ? 'This verification link is invalid or has already been used.'
                        : 'Staðfestingartengill er ógildur eða hefur þegar verið notaður.';
                }
            }
        });
    } else {
        // No verification params — show info message
        showState(nocodeEl);
    }
})();
