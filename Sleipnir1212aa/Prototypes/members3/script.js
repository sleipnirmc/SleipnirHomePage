/* ===================================================================
   SLEIPNIR MC — MEMBERS3 PROTOTYPE SCRIPT
   =================================================================== */

const MEMBERS = [
    {
        name: 'Gunnar Thorsson',
        role: 'Forseti',
        chapter: 'Reykjavik',
        motorcycle: 'Harley-Davidson Road King',
        joinDate: '2008',
        motto: 'Vegurinn er markmiðið, ekki áfangastaðurinn.',
        bio: 'Gunnar hefur verið leiðtogi Sleipnir MC frá upphafi. Hann hefur ekið þvert yfir Evrópu og Norður-Ameríku á tveimur hjólum. Ástríða hans fyrir mótorhjólum hófst sem unglingur í Vestmannaeyjum. Hann leggur áherslu á bræðralag og gagnkvæma virðingu meðal allra meðlima.'
    },
    {
        name: 'Björk Sigurdardóttir',
        role: 'Varaforseti',
        chapter: 'Reykjavik',
        motorcycle: 'Indian Scout Bobber',
        joinDate: '2010',
        motto: 'Frelsið finnst á opnum vegi.',
        bio: 'Björk er einn af stofnmeðlimum klúbbsins og hefur gegnt margvíslegum hlutverkum í gegnum árin. Hún er þekkt fyrir sína djörfung á fjallvegum og í ófærð. Björk skipuleggur árlega sumargöngu klúbbsins og hefur komið á samstarfi við norræna mótorhjólaklúbba.'
    },
    {
        name: 'Eiríkur Magnússon',
        role: 'Ritari',
        chapter: 'Akureyri',
        motorcycle: 'Triumph Bonneville T120',
        joinDate: '2012',
        motto: 'Hvert hjól sem snýst segir sögu.',
        bio: 'Eiríkur flutti til Akureyrar árið 2011 og stofnaði norðurlandsdeild klúbbsins. Hann er bókmenntafræðingur að mennt og skrifar reglulega greinar um mótorhjólasögu á Íslandi. Hann á safn af fimm klassískum hjólum sem hann viðheldur sjálfur í bílskúrnum sínum.'
    },
    {
        name: 'Sigríður Jónsdóttir',
        role: 'Gjaldkeri',
        chapter: 'Reykjavik',
        motorcycle: 'BMW R nineT',
        joinDate: '2014',
        motto: 'Styrkur kemur ekki úr vélum heldur úr vilja.',
        bio: 'Sigríður er endurskoðandi að mennt og hefur haldið fjármálum klúbbsins í góðu horfi frá því hún tók við. Hún er einnig ákafur ferðamaður og hefur ekið mótorhjóli um Japan, Suður-Ameríku og Suðaustur-Asíu. Hennar fagmennska og skipulagshæfileikar eru ómetanlegir.'
    },
    {
        name: 'Ragnar Ólafsson',
        role: 'Vegameistari',
        chapter: 'Reykjavik',
        motorcycle: 'Harley-Davidson Street Glide',
        joinDate: '2011',
        motto: 'Saman erum við sterkari en veðrið.',
        bio: 'Ragnar er sá sem skipuleggur allar akstursleiðir og útivistarferðir klúbbsins. Hann þekkir alla vegi landsins og hefur kortlagt bestu mótorhjólaleiðirnar á Íslandi. Áður en hann sneri sér að mótorhjólum var hann leiðsögumaður í útivist og fjallamennsku.'
    },
    {
        name: 'Helga Brynjarsdóttir',
        role: 'Viðburðastjóri',
        chapter: 'Akureyri',
        motorcycle: 'Ducati Scrambler',
        joinDate: '2015',
        motto: 'Lífið er of stutt fyrir beina vegi.',
        bio: 'Helga kemur úr listum og hefur umbylt viðburðastarfsemi klúbbsins. Hún skipuleggur allt frá sumarhátíðum upp í vinnustoður um viðhald hjóla. Hennar sköpunargáfa og skipulagshæfni hafa gert viðburði klúbbsins að eftirsóttum atburðum á mótorhjólasenunni.'
    },
    {
        name: 'Þorsteinn Hákonarson',
        role: 'Vélvirki',
        chapter: 'Reykjavik',
        motorcycle: 'Moto Guzzi V7',
        joinDate: '2013',
        motto: 'Maður þekkir hjól sitt eins og vin.',
        bio: 'Þorsteinn er lærður vélvirki og rekur eigin verkstæði í Hafnarfirði. Hann annast viðhald og viðgerðir á hjólum klúbbsmeðlima og kennir nýjum meðlimum undirstöðuatriði vélfræði. Hann er einnig safnari gamalla mótorhjóla og á sjaldgæfa Honda CB750 frá 1972.'
    },
    {
        name: 'Katrín Einarsdóttir',
        role: 'Samskiptafulltrúi',
        chapter: 'Reykjavik',
        motorcycle: 'Yamaha MT-07',
        joinDate: '2016',
        motto: 'Aksturinn er samtal við sjálfan þig.',
        bio: 'Katrín sér um samfélagsmiðla og samskipti klúbbsins. Hún er blaðamaður að mennt og notar reynslu sína til að koma skilaboðum klúbbsins á framfæri. Hún er einnig ákafur ljósmyndari og tekur myndir af öllum ferðum og viðburðum klúbbsins.'
    },
    {
        name: 'Ólafur Guðmundsson',
        role: 'Meðlimur',
        chapter: 'Akureyri',
        motorcycle: 'Kawasaki Z900',
        joinDate: '2018',
        motto: 'Nýir vegir, nýjar sögur.',
        bio: 'Ólafur bættist í klúbbinn eftir að hafa búið erlendis í áratugi. Hann hefur ekið mótorhjólum í Evrópu og Asíu og kemur með fjölbreytta reynslu í klúbbinn. Hann er sérlega áhugasamur um öryggi á vegum og hefur haldið námskeið um varnarakstur.'
    },
    {
        name: 'Freydís Þórhallsdóttir',
        role: 'Meðlimur',
        chapter: 'Reykjavik',
        motorcycle: 'Honda CB650R',
        joinDate: '2020',
        motto: 'Þú verður aldrei of gömul til að læra nýjan veg.',
        bio: 'Freydís er nýjasti meðlimurinn í klúbbnum en hefur þegar sannað sig á vegum landsins. Hún er verkfræðingur að mennt og hefur sérstakan áhuga á rafmótorhjólum og framtíð samgangna. Hún er einnig dugleg í sjálfboðastarfi og skipuleggur góðgerðarakstur á vegum klúbbsins.'
    }
];

// SVG for person placeholder
const PERSON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
</svg>`;

// SVG icons for meta items
const ICONS = {
    motorcycle: `<svg viewBox="0 0 24 24"><path d="M5 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM19 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 7l3 5h4l2-3M6 19l3-7h6l2 3M9 12L7 7h3"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    chapter: `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
};

let previouslyFocused = null;

function openMemberModal(index) {
    const member = MEMBERS[index];
    if (!member) return;

    previouslyFocused = document.activeElement;

    const modal = document.getElementById('memberModal');

    // Populate modal
    modal.querySelector('.modal-photo').innerHTML = PERSON_SVG;
    modal.querySelector('.modal-name').textContent = member.name;
    modal.querySelector('.modal-role').textContent = member.role;
    modal.querySelector('.modal-motto p').textContent = `"${member.motto}"`;
    modal.querySelector('.modal-bio').textContent = member.bio;

    // Meta items
    modal.querySelector('.meta-motorcycle span').textContent = member.motorcycle;
    modal.querySelector('.meta-joindate span').textContent = `Meðlimur síðan ${member.joinDate}`;
    modal.querySelector('.meta-chapter span').textContent = member.chapter;

    // Set icon SVGs
    modal.querySelector('.meta-motorcycle svg').outerHTML = ICONS.motorcycle;
    modal.querySelector('.meta-joindate svg').outerHTML = ICONS.calendar;
    modal.querySelector('.meta-chapter svg').outerHTML = ICONS.chapter;

    // Show modal
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus close button
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.focus();
}

function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    if (!modal.classList.contains('active')) return;

    modal.classList.add('closing');

    modal.addEventListener('animationend', function handler(e) {
        if (e.target !== modal) return;
        modal.classList.remove('active', 'closing');
        document.body.style.overflow = '';
        modal.removeEventListener('animationend', handler);

        if (previouslyFocused) {
            previouslyFocused.focus();
            previouslyFocused = null;
        }
    });
}

// Focus trap within modal
function trapFocus(e) {
    const modal = document.getElementById('memberModal');
    if (!modal.classList.contains('active')) return;

    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Card click/keyboard
    document.querySelectorAll('.member-card').forEach(card => {
        card.addEventListener('click', () => {
            openMemberModal(parseInt(card.dataset.memberIndex, 10));
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openMemberModal(parseInt(card.dataset.memberIndex, 10));
            }
        });
    });

    // Close button
    document.querySelector('.modal-close').addEventListener('click', closeMemberModal);

    // Backdrop click
    document.getElementById('memberModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeMemberModal();
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMemberModal();
        }
        trapFocus(e);
    });
});
