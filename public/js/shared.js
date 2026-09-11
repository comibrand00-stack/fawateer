/* ============================================
   Shared storage sync — central server
   Loads data from the server, then mirrors every
   localStorage write to it so all devices share.
   Runs synchronously at boot so Store sees the data.
   ============================================ */

(function () {
  'use strict';

  var nat = null;
  try { nat = window.localStorage; } catch (e) { nat = null; }

  var READY = false;
  var base = {};
  var serverVersion = 0;

  function keys() {
    if (READY) return Object.keys(base);
    var ks = [];
    if (nat) {
      try {
        for (var i = 0; i < nat.length; i++) ks.push(nat.key(i));
      } catch (e) {}
    }
    return ks;
  }

  function nativeGet(k) {
    try { return nat ? nat.getItem(k) : null; } catch (e) { return null; }
  }
  function nativeSet(k, v) {
    try { if (nat) nat.setItem(k, v); } catch (e) {}
  }
  function nativeRemove(k) {
    try { if (nat) nat.removeItem(k); } catch (e) {}
  }
  function nativeClear() {
    try { if (nat) nat.clear(); } catch (e) {}
  }

  function load() {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', '/api/store', false);
      x.send();
      if (x.status >= 200 && x.status < 300) {
        var res = JSON.parse(x.responseText);
        if (res && res.data && typeof res.data === 'object') {
          base = res.data;
          serverVersion = res.version || 0;
          READY = true;
          return;
        }
      }
    } catch (e) {}
    READY = false;
  }

  load();

  function sync(ops) {
    if (!READY) return;
    try {
      var x = new XMLHttpRequest();
      x.open('POST', '/api/op', false);
      x.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
      x.send(JSON.stringify({ ops: ops }));
      if (x.status >= 200 && x.status < 300) {
        var res = JSON.parse(x.responseText);
        if (res && res.version) serverVersion = res.version;
      }
    } catch (e) {}
  }

  function getItem(k) {
    if (READY) return base.hasOwnProperty(k) ? base[k] : null;
    return nativeGet(k);
  }

  function setItem(k, v) {
    var s = String(v);
    if (READY) {
      base[k] = s;
      sync([{ key: k, value: s }]);
      return;
    }
    nativeSet(k, s);
  }

  function removeItem(k) {
    if (READY) {
      if (!base.hasOwnProperty(k)) return;
      delete base[k];
      sync([{ key: k, remove: true }]);
      return;
    }
    nativeRemove(k);
  }

  function clear() {
    if (READY) {
      base = {};
      sync([{ clear: true }]);
      return;
    }
    nativeClear();
  }

  function key(i) {
    return keys()[i] || null;
  }

  var proxy = {
    get length() { return keys().length; },
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    key: key
  };

  try {
    Object.defineProperty(window, 'localStorage', { value: proxy, writable: false, configurable: true });
    window.__SHARED_INSTALLED = READY ? 'yes' : 'no';
    window.__SHARED_VERSION = serverVersion;
  } catch (e) {}
})();