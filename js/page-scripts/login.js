/**
 * Login page script — Auth forms, tab switching, social login
 */
(function() {
    // Flag to prevent authentication.js from auto-signing out unverified users
    // while login.js is handling the verification flow
    window._sleipnirLoginPageHandling = true;

    // Verification polling state
    var verificationPollTimer = null;
    var verificationPollCount = 0;
    var VERIFICATION_POLL_INTERVAL = 3000;
    var VERIFICATION_MAX_POLLS = 100; // ~5 minutes

    function stopVerificationPolling() {
        if (verificationPollTimer) {
            clearInterval(verificationPollTimer);
            verificationPollTimer = null;
        }
        verificationPollCount = 0;
    }

    function startVerificationPolling(email, additionalData) {
        stopVerificationPolling();
        verificationPollCount = 0;

        verificationPollTimer = setInterval(async function() {
            verificationPollCount++;

            var user = firebase.auth().currentUser;
            if (!user) {
                stopVerificationPolling();
                return;
            }

            try {
                await user.reload();
            } catch (err) {
                console.error('Reload error during poll:', err);
                return;
            }

            if (user.emailVerified) {
                stopVerificationPolling();

                var statusEl = document.getElementById('verificationStatus');
                if (statusEl) {
                    var t = window.SleipnirI18n.t;
                    statusEl.innerHTML =
                        '<div class="verification-success-icon">&#10003;</div>' +
                        '<p class="verification-success-text" data-i18n="login.verify.success">' +
                            t('login.verify.success', 'Netfang staðfest! Stofna aðgang...') +
                        '</p>';
                }

                try {
                    var result = await sleipnirAuth.completeRegistration(additionalData || {});
                    if (result.success) {
                        sleipnirAuth.showAuthMessage({
                            is: 'Aðgangur stofnaður! Beið...',
                            en: 'Account created! Redirecting...'
                        }, false);
                        setTimeout(function() {
                            if (window.sleipnirRouter) {
                                window.sleipnirRouter.navigate('/');
                            } else {
                                window.location.href = '/';
                            }
                        }, 1500);
                    }
                } catch (err) {
                    console.error('completeRegistration error:', err);
                }
                return;
            }

            if (verificationPollCount >= VERIFICATION_MAX_POLLS) {
                stopVerificationPolling();
                var statusEl = document.getElementById('verificationStatus');
                if (statusEl) {
                    var t = window.SleipnirI18n.t;
                    statusEl.innerHTML =
                        '<p class="verification-timeout" data-i18n="login.verify.timeout">' +
                            t('login.verify.timeout', 'Tímamörk náð. Vinsamlegast skráðu þig inn eftir staðfestingu.') +
                        '</p>';
                }
            }
        }, VERIFICATION_POLL_INTERVAL);
    }

    // Show verification screen replacing the form area
    // mode: 'polling' (fresh signup, user stays signed in) or 'static' (unverified login, user signed out)
    function showVerificationScreen(email, mode, additionalData) {
        var t = window.SleipnirI18n.t;
        var container = document.querySelector('.split-form-container');
        if (!container) return;

        var isPolling = (mode === 'polling');

        var html =
            '<div class="verification-screen">' +
                '<div class="verification-icon">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="80" height="80">' +
                        '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
                        '<path d="M22 4L12 13L2 4"/>' +
                    '</svg>' +
                '</div>' +
                '<h2 class="verification-title" data-i18n="login.verify.title">' +
                    t('login.verify.title', 'Staðfestu netfangið þitt') +
                '</h2>' +
                '<p class="verification-message" data-i18n="login.verify.message">' +
                    t('login.verify.message', 'Við höfum sent staðfestingarpóst á') +
                '</p>' +
                '<p class="verification-email">' + email + '</p>' +
                '<div class="verification-warning">' +
                    '<span class="verification-warning-icon">&#9888;</span>' +
                    '<p data-i18n="login.verify.warning">' +
                        t('login.verify.warning', 'Ekki loka þessum glugga fyrr en þú hefur staðfest netfangið.') +
                    '</p>' +
                '</div>';

        if (isPolling) {
            html +=
                '<div class="verification-status" id="verificationStatus">' +
                    '<div class="verification-spinner"></div>' +
                    '<p class="verification-checking" data-i18n="login.verify.checking">' +
                        t('login.verify.checking', 'Bíð eftir staðfestingu...') +
                    '</p>' +
                '</div>' +
                '<div class="verification-actions">' +
                    '<button class="verification-btn verification-btn-secondary" id="verifyResendBtn" data-i18n="login.verify.btn.resend">' +
                        t('login.verify.btn.resend', 'Senda aftur') +
                    '</button>' +
                    '<button class="verification-btn verification-btn-secondary" id="verifyCancelBtn" data-i18n="login.verify.btn.cancel">' +
                        t('login.verify.btn.cancel', 'Hætta við') +
                    '</button>' +
                '</div>';
        } else {
            html +=
                '<p class="verification-instructions" data-i18n="login.verify.instructions">' +
                    t('login.verify.instructions', 'Smelltu á hlekkinn í tölvupóstinum og skráðu þig svo inn aftur.') +
                '</p>' +
                '<div class="verification-actions">' +
                    '<button class="verification-btn verification-btn-primary" id="verifyLoginBtn" data-i18n="login.verify.btn.login">' +
                        t('login.verify.btn.login', 'Skrá inn aftur') +
                    '</button>' +
                    '<button class="verification-btn verification-btn-secondary" id="verifyGuestBtn" data-i18n="login.verify.btn.guest">' +
                        t('login.verify.btn.guest', 'Halda áfram sem gestur') +
                    '</button>' +
                '</div>';
        }

        html +=
                '<p class="verification-note" data-i18n="login.verify.note">' +
                    t('login.verify.note', 'Athugaðu einnig ruslpóstmöppuna ef þú finnur ekki póstinn.') +
                '</p>' +
            '</div>';

        container.innerHTML = html;

        if (isPolling) {
            startVerificationPolling(email, additionalData);

            var resendBtn = document.getElementById('verifyResendBtn');
            if (resendBtn) {
                resendBtn.addEventListener('click', async function() {
                    resendBtn.disabled = true;
                    try {
                        var user = firebase.auth().currentUser;
                        if (user) {
                            await user.sendEmailVerification({
                                url: 'https://sleipnirmc.com/login',
                                handleCodeInApp: false
                            });
                            sleipnirAuth.showAuthMessage({
                                is: 'Staðfestingarpóstur hefur verið sendur aftur',
                                en: 'Verification email has been resent'
                            }, false);
                        }
                    } catch (err) {
                        console.error('Error resending:', err);
                        sleipnirAuth.showAuthMessage({
                            is: 'Villa kom upp. Reyndu aftur síðar.',
                            en: 'Error occurred. Please try again later.'
                        }, true);
                    }
                    setTimeout(function() { resendBtn.disabled = false; }, 30000);
                });
            }

            var cancelBtn = document.getElementById('verifyCancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', async function() {
                    stopVerificationPolling();
                    await sleipnirAuth.signOut();
                    if (window.sleipnirRouter) {
                        window.sleipnirRouter.navigate('/');
                    } else {
                        window.location.href = '/';
                    }
                });
            }
        } else {
            var loginBtn = document.getElementById('verifyLoginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', function() {
                    if (window.sleipnirRouter) {
                        window.sleipnirRouter.navigate('/login');
                    } else {
                        window.location.href = '/login';
                    }
                });
            }

            var guestBtn = document.getElementById('verifyGuestBtn');
            if (guestBtn) {
                guestBtn.addEventListener('click', function() {
                    if (window.sleipnirRouter) {
                        window.sleipnirRouter.navigate('/');
                    } else {
                        window.location.href = '/';
                    }
                });
            }
        }
    }

    // Clear flag and stop polling when navigating away from login page (SPA)
    window.addEventListener('pageLoaded', function(e) {
        if (e.detail && e.detail.path !== '/login') {
            window._sleipnirLoginPageHandling = false;
            stopVerificationPolling();
        }
    });

    // Tab switching functionality
    var tabs = document.querySelectorAll('.tab-btn');
    var confirmGroup = document.getElementById('confirmGroup');
    var nameGroup = document.getElementById('nameGroup');
    var phoneGroup = document.getElementById('phoneGroup');
    var addressGroup = document.getElementById('addressGroup');
    var cityGroup = document.getElementById('cityGroup');
    var postalGroup = document.getElementById('postalGroup');
    var submitBtn = document.querySelector('.split-submit-btn');
    var formTitle = document.querySelector('.split-form-title');
    var formSubtitle = document.querySelector('.split-form-subtitle');

    if (!submitBtn) {
        console.warn('[login.js] Submit button not found in DOM — aborting init');
        return;
    }

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');

            var isSignup = tab.dataset.tab === 'signup';

            confirmGroup.style.display = isSignup ? 'block' : 'none';
            nameGroup.style.display = isSignup ? 'block' : 'none';
            phoneGroup.style.display = isSignup ? 'block' : 'none';
            addressGroup.style.display = isSignup ? 'block' : 'none';
            cityGroup.style.display = isSignup ? 'block' : 'none';
            postalGroup.style.display = isSignup ? 'block' : 'none';

            if (isSignup) {
                setTimeout(function() {
                    observeElements();
                    // Force visibility for newly shown signup fields
                    document.querySelectorAll('.split-input-group:not(.visible)').forEach(function(el) {
                        el.classList.add('visible');
                    });
                }, 100);
            }

            if (isSignup) {
                submitBtn.setAttribute('data-i18n', 'login.btn.signup');
                submitBtn.textContent = window.SleipnirI18n.t('login.btn.signup', 'Create Account');
                formTitle.setAttribute('data-i18n', 'login.title.signup');
                formTitle.textContent = window.SleipnirI18n.t('login.title.signup', 'Create Account');
                formSubtitle.setAttribute('data-i18n', 'login.subtitle.signup');
                formSubtitle.textContent = window.SleipnirI18n.t('login.subtitle.signup', 'Join our community');
            } else {
                submitBtn.setAttribute('data-i18n', 'login.btn.login');
                submitBtn.textContent = window.SleipnirI18n.t('login.btn.login', 'Login');
                formTitle.setAttribute('data-i18n', 'login.title');
                formTitle.textContent = window.SleipnirI18n.t('login.title', 'Welcome');
                formSubtitle.setAttribute('data-i18n', 'login.subtitle');
                formSubtitle.textContent = window.SleipnirI18n.t('login.subtitle', 'Access your account');
            }
        });
    });

    // Check for redirect parameter
    var urlParams = new URLSearchParams(window.location.search);
    var redirect = urlParams.get('redirect');
    var error = urlParams.get('error');
    var sessionExpired = urlParams.get('session_expired');
    var mode = urlParams.get('mode');
    var oobCode = urlParams.get('oobCode');

    // Handle email verification mode
    if (mode === 'verifyEmail' && oobCode) {
        sleipnirAuth.showAuthMessage({
            is: 'Netfang verið að staðfesta...',
            en: 'Verifying email...'
        }, false);

        firebase.auth().applyActionCode(oobCode).then(function() {
            sleipnirAuth.showAuthMessage({
                is: 'Netfang hefur verið staðfest! Þú getur nú skráð þig inn.',
                en: 'Email has been verified! You can now sign in.'
            }, false);

            if (firebase.auth().currentUser) {
                firebase.auth().currentUser.reload();
            }
        }).catch(function(error) {
            console.error('Email verification error:', error);
            sleipnirAuth.showAuthMessage({
                is: 'Villa kom upp við staðfestingu. Vinsamlegast reyndu aftur.',
                en: 'Error verifying email. Please try again.'
            }, true);
        });
    }

    if (error) {
        sleipnirAuth.showAuthMessage(decodeURIComponent(error), true);
    }

    if (sessionExpired) {
        sleipnirAuth.showAuthMessage({
            is: 'Innskráning rann út. Vinsamlegast skráðu þig inn aftur.',
            en: 'Session expired. Please sign in again.'
        }, true);
    }

    // Form submission
    var authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var email = document.getElementById('email').value;
            var password = document.getElementById('password').value;
            var isSignup = document.querySelector('.tab-btn.active').dataset.tab === 'signup';

            submitBtn.disabled = true;

            try {
                if (isSignup) {
                    var confirmPassword = document.getElementById('confirmPassword').value;
                    var fullName = document.getElementById('fullName').value;
                    var phone = document.getElementById('phone').value;
                    var address = document.getElementById('address').value;
                    var city = document.getElementById('city').value;
                    var postalCode = document.getElementById('postalCode').value;

                    if (password !== confirmPassword) {
                        sleipnirAuth.showAuthMessage({
                            is: 'Lykilorð passa ekki saman',
                            en: 'Passwords do not match'
                        }, true);
                        submitBtn.disabled = false;
                        return;
                    }

                    var result = await sleipnirAuth.signUp(email, password, {
                        fullName: fullName,
                        phone: phone,
                        address: address,
                        city: city,
                        postalCode: postalCode
                    });

                    if (result.success) {
                        // Keep user signed in for polling (_sleipnirLoginPageHandling prevents auto-signout)
                        showVerificationScreen(email, 'polling', {
                            fullName: fullName,
                            phone: phone,
                            address: address,
                            city: city,
                            postalCode: postalCode
                        });
                        return;
                    } else {
                        sleipnirAuth.showAuthMessage(result.error, true);
                        submitBtn.disabled = false;
                    }
                } else {
                    var result;
                    if (redirect === 'admin') {
                        result = await sleipnirAuth.adminSignIn(email, password);
                        if (result.success) {
                            sleipnirAuth.showAuthMessage({
                                is: 'Innskráning tókst! Beið...',
                                en: 'Login successful! Redirecting...'
                            }, false);
                            setTimeout(function() {
                                window.location.href = '/admin';
                            }, 1000);
                        } else {
                            sleipnirAuth.showAuthMessage(result.error, true);
                            submitBtn.disabled = false;
                        }
                    } else {
                        result = await sleipnirAuth.signIn(email, password);
                        if (result.success) {
                            var userData = sleipnirAuth.getCurrentUserData();
                            if (userData.isEmailVerified) {
                                sleipnirAuth.showAuthMessage({
                                    is: 'Innskráning tókst! Beið...',
                                    en: 'Login successful! Redirecting...'
                                }, false);
                                setTimeout(function() {
                                    window.location.href = '/';
                                }, 1000);
                            } else {
                                // Send verification email while still authenticated
                                try {
                                    await firebase.auth().currentUser.sendEmailVerification({
                                        url: 'https://sleipnirmc.com/login',
                                        handleCodeInApp: false
                                    });
                                } catch (verifyErr) {
                                    console.error('Error sending verification email:', verifyErr);
                                }
                                // Sign out — user stays as guest until verified
                                await sleipnirAuth.signOut();
                                showVerificationScreen(email, 'static', null);
                                return;
                            }
                        } else {
                            sleipnirAuth.showAuthMessage(result.error, true);
                            submitBtn.disabled = false;
                        }
                    }
                }
            } catch (error) {
                console.error('Authentication error:', error);
                sleipnirAuth.showAuthMessage({
                    is: 'Lykilorð eða netfang er rangt',
                    en: 'Password or email is incorrect'
                }, true);
                submitBtn.disabled = false;
            }
        });
    }

    // Google login handler
    var googleBtn = document.querySelector('.social-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async function() {
            try {
                var result = await sleipnirAuth.signInWithGoogle();

                if (result.success) {
                    // Check if social login returned unverified email (rare but possible)
                    var currentAuthUser = firebase.auth().currentUser;
                    if (currentAuthUser && !currentAuthUser.emailVerified) {
                        try {
                            await currentAuthUser.sendEmailVerification({
                                url: 'https://sleipnirmc.com/login',
                                handleCodeInApp: false
                            });
                        } catch (verifyErr) {
                            console.error('Error sending verification email:', verifyErr);
                        }
                        await sleipnirAuth.signOut();
                        showVerificationScreen(currentAuthUser.email, 'static', null);
                        return;
                    }

                    sleipnirAuth.showAuthMessage({
                        is: 'Innskráning tókst! Beið...',
                        en: 'Login successful! Redirecting...'
                    }, false);

                    var userData = sleipnirAuth.getCurrentUserData();
                    if (userData.isAdmin && redirect === 'admin') {
                        await sleipnirAuth.initializeAdminSession();
                        setTimeout(function() {
                            window.location.href = '/admin';
                        }, 1000);
                    } else {
                        setTimeout(function() {
                            window.location.href = '/';
                        }, 1000);
                    }
                } else {
                    sleipnirAuth.showAuthMessage(result.error, true);
                }
            } catch (error) {
                console.error('Social login error:', error);
                sleipnirAuth.showAuthMessage({
                    is: 'Villa kom upp við innskráningu.',
                    en: 'Error during sign in.'
                }, true);
            }
        });
    }

    // Forgot password handler
    var forgotLink = document.querySelector('.split-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', async function(e) {
            e.preventDefault();
            var email = document.getElementById('email').value;

            if (!email) {
                sleipnirAuth.showAuthMessage({
                    is: 'Vinsamlegast sláðu inn netfang',
                    en: 'Please enter your email address'
                }, true);
                return;
            }

            try {
                var result = await sleipnirAuth.sendPasswordResetEmail(email);
                if (result.success) {
                    sleipnirAuth.showAuthMessage({
                        is: 'Tölvupóstur sendur! Athugaðu póstólfið þitt.',
                        en: 'Email sent! Check your inbox.'
                    }, false);
                } else {
                    sleipnirAuth.showAuthMessage(result.error, true);
                }
            } catch (error) {
                console.error('Password reset error:', error);
                sleipnirAuth.showAuthMessage({
                    is: 'Lykilorð eða netfang er rangt',
                    en: 'Password or email is incorrect'
                }, true);
            }
        });
    }

    // Input icon hover effects and autofill detection
    var inputs = document.querySelectorAll('.split-input-group input');
    inputs.forEach(function(input) {
        input.addEventListener('focus', function() {
            input.parentElement.querySelector('.input-icon').style.transform = 'translateY(-50%) scale(1.2)';
        });
        input.addEventListener('blur', function() {
            input.parentElement.querySelector('.input-icon').style.transform = 'translateY(-50%) scale(1)';
        });
        input.addEventListener('input', function() {
            if (input.value) {
                input.parentElement.classList.add('has-value');
            } else {
                input.parentElement.classList.remove('has-value');
            }
        });
        if (input.value) {
            input.parentElement.classList.add('has-value');
        }
    });

    // Detect autofill
    function detectAutofill() {
        inputs.forEach(function(input) {
            try {
                if (input.matches(':-webkit-autofill')) {
                    input.parentElement.classList.add('has-value');
                }
            } catch (e) {
                if (input.value) {
                    input.parentElement.classList.add('has-value');
                }
            }
        });
    }

    detectAutofill();
    setTimeout(detectAutofill, 100);
    setTimeout(detectAutofill, 500);
    setTimeout(detectAutofill, 1000);

    inputs.forEach(function(input) {
        input.addEventListener('animationstart', function(e) {
            if (e.animationName === 'onAutoFillStart') {
                input.parentElement.classList.add('has-value');
            }
        });
    });

    // Intersection Observer for scroll animations
    var observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    function observeElements() {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Only observe fade-in elements (input groups use CSS animation now)
        document.querySelectorAll('.split-form-header, .form-tabs, .split-submit-btn, .split-social-section').forEach(function(el) {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    }

    observeElements();

    // Fallback: force visibility for fade-in elements if IntersectionObserver doesn't fire (SPA navigation)
    requestAnimationFrame(function() {
        document.querySelectorAll('.fade-in:not(.visible)').forEach(function(el) {
            el.classList.add('visible');
        });
    });

    // Smooth scroll to form when clicking visual section
    var visualSection = document.querySelector('.login-visual-section');
    if (visualSection) {
        visualSection.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                document.querySelector('.login-form-section').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
})();
