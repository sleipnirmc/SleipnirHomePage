/**
 * Home page script — Northern lights parallax animation
 */
(function() {
    var lastScrollY = window.scrollY;
    window.addEventListener('scroll', function () {
        var scrolled = window.pageYOffset;
        var lights = document.querySelector('.northern-lights');
        if (lights) {
            lights.style.transform = 'translateY(' + (scrolled * 0.3) + 'px)';
        }
        lastScrollY = scrolled;
    });
})();
