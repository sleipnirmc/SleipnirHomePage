/**
 * Sagan (Story) page script — Content loading, edit mode, timeline animation
 */
(function() {
    var isEditMode = false;
    var originalContent = '';

    function getCurrentLang() {
        return window.currentLang || 'is';
    }

    // Load story content from Firebase
    async function loadStoryContent() {
        var storyContent = document.getElementById('storyContent');
        if (!storyContent) return;
        var lang = getCurrentLang();

        try {
            var doc = await firebase.firestore()
                .collection('siteContent')
                .doc('story')
                .get();

            if (doc.exists) {
                var data = doc.data();
                var content = lang === 'is' ? data.contentIs : data.contentEn;

                if (content) {
                    storyContent.innerHTML = content;
                } else {
                    showEmptyState();
                }
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading story:', error);
            var lang = getCurrentLang();
            var errorMsg = lang === 'is' ? 'Villa við að hlaða sögu.' : 'Error loading story.';
            storyContent.innerHTML = '<div class="story-empty"><span class="rune">\u16A6</span><p>' + errorMsg + '</p></div>';
        }
    }

    function showEmptyState() {
        var lang = getCurrentLang();
        var title = lang === 'is' ? 'Engin saga enn' : 'No story yet';
        var text = lang === 'is' ? 'Sagan verður birt hér fljótlega.' : 'The story will be published here soon.';
        var el = document.getElementById('storyContent');
        if (el) {
            el.innerHTML = '<div class="story-empty"><span class="rune">\u16C9</span><h2>' + title + '</h2><p>' + text + '</p></div>';
        }
    }

    // Toggle edit mode (exposed globally for onclick handler)
    window.toggleEditMode = async function() {
        var storyContent = document.getElementById('storyContent');
        var editBtn = document.getElementById('editBtn');
        if (!storyContent || !editBtn) return;
        var lang = getCurrentLang();

        if (!isEditMode) {
            originalContent = storyContent.innerHTML;
            storyContent.contentEditable = true;
            storyContent.classList.add('edit-mode');
            var saveText = lang === 'is' ? 'Vista Sögu' : 'Save Story';
            var span = editBtn.querySelector('[data-i18n]');
            if (span) span.textContent = saveText;
            editBtn.classList.add('save-btn');

            if (storyContent.querySelector('.story-empty')) {
                storyContent.innerHTML = '<h2>' + (lang === 'is' ? 'Titill Sögunnar' : 'Story Title') + '</h2><p>' + (lang === 'is' ? 'Skrifaðu sögu hópsins hér...' : 'Write the group story here...') + '</p>';
            }

            isEditMode = true;
        } else {
            try {
                var content = storyContent.innerHTML;
                var updateData = {};
                if (lang === 'is') {
                    updateData.contentIs = content;
                } else {
                    updateData.contentEn = content;
                }
                updateData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();

                await firebase.firestore()
                    .collection('siteContent')
                    .doc('story')
                    .set(updateData, { merge: true });

                storyContent.contentEditable = false;
                storyContent.classList.remove('edit-mode');
                var editText = lang === 'is' ? 'Breyta Sögu' : 'Edit Story';
                var span = editBtn.querySelector('[data-i18n]');
                if (span) span.textContent = editText;
                editBtn.classList.remove('save-btn');
                isEditMode = false;

                alert(lang === 'is' ? 'Saga vistuð!' : 'Story saved!');
            } catch (error) {
                console.error('Error saving story:', error);
                alert(lang === 'is' ? 'Villa við að vista sögu' : 'Error saving story');
            }
        }
    };

    // Check if user is admin and show edit button
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            try {
                var userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get();

                if (userDoc.exists && userDoc.data().role === 'admin') {
                    var editBtn = document.getElementById('editBtn');
                    if (editBtn) editBtn.style.display = 'block';
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        }
    });

    // Load content immediately
    loadStoryContent();

    // Add scroll animation to timeline items
    var observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry, index) {
            if (entry.isIntersecting) {
                setTimeout(function() {
                    entry.target.style.opacity = '1';
                }, index * 200);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.timeline-item').forEach(function(item) {
        observer.observe(item);
    });

    // Reload content when language changes
    document.addEventListener('langchange', function() {
        if (!isEditMode) {
            loadStoryContent();
        }
    });
})();
