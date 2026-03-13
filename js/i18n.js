/**
 * Sleipnir MC -- Internationalization Engine
 * Adapted from Katla Intel i18n. Default language: Icelandic.
 * Exposes window.SleipnirI18n, window.currentLang, window.toggleLanguage.
 */
(function () {
  'use strict';
  var DEFAULT_LANG = 'is';
  var STORAGE_KEY = 'language';
  var currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  var translations = { en: {}, is: {} };

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'is') return;
    currentLang = lang;
    window.currentLang = currentLang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function t(key, fallback) {
    var dict = translations[currentLang] || translations[DEFAULT_LANG];
    return dict[key] || fallback || key;
  }

  function applyTranslations() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      els[i].textContent = t(key, els[i].textContent);
    }
    var htmlEls = document.querySelectorAll('[data-i18n-html]');
    for (var h = 0; h < htmlEls.length; h++) {
      var hKey = htmlEls[h].getAttribute('data-i18n-html');
      htmlEls[h].innerHTML = t(hKey, htmlEls[h].innerHTML);
    }
    var pEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var p = 0; p < pEls.length; p++) {
      var pKey = pEls[p].getAttribute('data-i18n-placeholder');
      pEls[p].setAttribute('placeholder', t(pKey, pEls[p].getAttribute('placeholder')));
    }
    var aEls = document.querySelectorAll('[data-i18n-aria]');
    for (var a = 0; a < aEls.length; a++) {
      var aKey = aEls[a].getAttribute('data-i18n-aria');
      aEls[a].setAttribute('aria-label', t(aKey, aEls[a].getAttribute('aria-label')));
    }
  }

  function registerTranslations(lang, dict) {
    var existing = translations[lang] || {};
    var keys = Object.keys(dict);
    for (var i = 0; i < keys.length; i++) {
      existing[keys[i]] = dict[keys[i]];
    }
    translations[lang] = existing;
  }

  document.documentElement.setAttribute('lang', currentLang);
  window.currentLang = currentLang;

  window.SleipnirI18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    applyTranslations: applyTranslations,
    registerTranslations: registerTranslations
  };

  window.toggleLanguage = function () {
    setLang(currentLang === 'is' ? 'en' : 'is');
  };
})();
