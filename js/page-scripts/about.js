/**
 * About page script — Load members from Firestore
 */
(function() {
    // Load members from Firestore
    async function loadMembers() {
        var membersGrid = document.getElementById('membersGrid');
        if (!membersGrid) return;

        try {
            var snapshot = await firebase.firestore()
                .collection('displayMembers')
                .where('isActive', '==', true)
                .orderBy('displayOrder', 'asc')
                .get();

            // Clear loading skeletons
            membersGrid.innerHTML = '';

            if (snapshot.empty) {
                var lang = window.currentLang || 'is';
                var emptyMsg = lang === 'is'
                    ? 'Engar upplýsingar um meðlimi enn.'
                    : 'No member information available yet.';
                membersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;"><p style="color: var(--gray); font-size: 1.1rem;">' + emptyMsg + '</p></div>';
                return;
            }

            snapshot.forEach(function(doc) {
                var member = doc.data();
                var memberCard = createMemberCard(member);
                membersGrid.appendChild(memberCard);
            });

        } catch (error) {
            console.error('Error loading members:', error);
            var lang = window.currentLang || 'is';
            var errorMsg = lang === 'is'
                ? 'Villa við að hlaða meðlimum.'
                : 'Error loading members.';
            membersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;"><p style="color: var(--gray); font-size: 1.1rem;">' + errorMsg + '</p></div>';
        }
    }

    // Create member card element
    function createMemberCard(member) {
        var card = document.createElement('div');

        // Determine which template to use
        var templateName = 'classic';

        if (member.featured) {
            templateName = 'featured';
        } else if (member.role && member.role.toLowerCase().includes('president')) {
            templateName = 'featured';
        } else if (member.role && member.role.toLowerCase().includes('officer')) {
            templateName = 'horizontal';
        } else if (member.displayOrder === 1) {
            templateName = 'badge';
        } else if (member.displayOrder % 3 === 0) {
            templateName = 'minimal';
        }

        // Use template from member data if specified
        if (member.cardTemplate) {
            templateName = member.cardTemplate;
        }

        card.innerHTML = renderMemberCard(member, templateName);
        return card.firstElementChild;
    }

    // Execute immediately (DOM and Firebase are already ready)
    loadMembers();
})();
