/**
 * Shop page init — Protect page + member status indicator
 */
(function() {
    'use strict';

    // Protect this page - require email verification
    if (window.sleipnirAuth && window.sleipnirAuth.protectVerifiedPage) {
        sleipnirAuth.protectVerifiedPage('/login');
    }

    // Member Status Indicator - Always hidden for clean UI
    function updateMemberStatusIndicator() {
        var indicator = document.getElementById('memberStatusIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Fix member status UI function
    window.fixMemberStatusUI = async function() {
        var fixBtn = document.getElementById('fixStatusBtn');
        if (!fixBtn) return;
        var originalText = fixBtn.textContent;
        fixBtn.textContent = 'Fixing...';
        fixBtn.disabled = true;

        try {
            var result = await sleipnirAuth.fixMemberStatus(true);
            if (result.success) {
                alert('Member status has been fixed! The page will refresh.');
                window.location.reload();
            } else {
                alert('Error fixing member status: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            fixBtn.textContent = originalText;
            fixBtn.disabled = false;
        }
    };

    // Listen for auth state changes to update indicator
    window.addEventListener('authStateChanged', function() {
        setTimeout(updateMemberStatusIndicator, 100);
    });

    // Also update on page load
    setTimeout(updateMemberStatusIndicator, 1000);
})();
