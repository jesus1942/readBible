// Sesion de usuario y gate de login con Google.
// Se carga antes de app.js y expone window.ReadBibleAuth.
(function (global) {
  const PROD_API_URL = "https://versiculodiario-production.up.railway.app";
  const GIS_SRC = "https://accounts.google.com/gsi/client";
  const GIS_TIMEOUT_MS = 3000;

  function readStorage(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function writeStorage(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      // sin storage la sesion dura lo que dure la pagina
    }
  }

  function resolveApiBase() {
    const override = readStorage("pushServerUrl").trim();
    if (override) return override;
    if (typeof location !== "undefined" && location.protocol === "http:" && !location.hostname.endsWith("github.io")) {
      return `${location.origin}/api`;
    }
    return PROD_API_URL;
  }

  function getSessionToken() {
    return readStorage("sessionToken");
  }

  function setSessionToken(token) {
    writeStorage("sessionToken", token || "");
  }

  function getSessionUser() {
    try {
      const raw = readStorage("sessionUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSessionUser(user) {
    writeStorage("sessionUser", user ? JSON.stringify(user) : "");
  }

  function hasSession() {
    return Boolean(getSessionToken());
  }

  async function authFetch(path, options) {
    const opts = { ...(options || {}) };
    opts.headers = { ...(opts.headers || {}) };
    const token = getSessionToken();
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (opts.body && !opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${resolveApiBase()}${path}`, opts);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function isLocalhost() {
    return typeof location !== "undefined" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1");
  }

  function isStandaloneIos() {
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    const standalone = (typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
    return iOS && standalone;
  }

  function getNativePlatform() {
    try {
      const capacitor = global.Capacitor;
      if (!capacitor || typeof capacitor.getPlatform !== "function") return "web";
      return capacitor.getPlatform() || "web";
    } catch {
      return "web";
    }
  }

  function selectGoogleClientId(config) {
    const platform = getNativePlatform();
    if (platform === "android") return config.googleAndroidClientId || "";
    if (platform === "ios") return config.googleIosClientId || "";
    return config.googleClientId || "";
  }

  async function requestNativeGoogleCredential(clientId) {
    const adapter = global.ReadBibleNativeAuth;
    if (!adapter || typeof adapter.getGoogleCredential !== "function") {
      const error = new Error("El acceso nativo esta preparado pero falta instalar el adaptador de Google.");
      error.code = "NATIVE_AUTH_ADAPTER_MISSING";
      throw error;
    }
    return adapter.getGoogleCredential({ clientId, platform: getNativePlatform() });
  }

  function buildDevCredential() {
    const payload = {
      sub: readStorage("devUserSub") || "dev-1",
      email: readStorage("devUserEmail") || "dev@prueba.local",
      name: readStorage("devUserName") || "Usuario Prueba",
      picture: ""
    };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `dev.${b64}`;
  }

  function readLegacyIdentity() {
    const key = (() => {
      try {
        const raw = localStorage.getItem("communityInfo");
        return raw ? String(JSON.parse(raw).communityKey || "") : "";
      } catch {
        return "";
      }
    })();
    const secret = readStorage("communitySecret");
    if (key && secret) return { communityKey: key, communitySecret: secret };
    return null;
  }

  async function loginWithCredential(credential) {
    const data = await authFetch("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        credential,
        legacy: readLegacyIdentity(),
        deviceLabel: (navigator.userAgent || "").slice(0, 120)
      })
    });
    setSessionToken(data.token);
    setSessionUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await authFetch("/auth/logout", { method: "POST" });
    } catch {
      // igual se limpia la sesion local
    }
    setSessionToken("");
    setSessionUser("");
  }

  // Valida la sesion contra el servidor. Devuelve:
  //   "valid" | "invalid" (401: hay que volver al gate) | "offline" (sin red: se sigue local)
  async function validateSession() {
    if (!hasSession()) return "invalid";
    try {
      const data = await authFetch("/auth/me");
      setSessionUser(data.user);
      return "valid";
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setSessionToken("");
        setSessionUser("");
        return "invalid";
      }
      return "offline";
    }
  }

  function loadGisScript() {
    return new Promise((resolve, reject) => {
      if (global.google && global.google.accounts && global.google.accounts.id) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("no pude cargar Google"));
      document.head.appendChild(script);
      setTimeout(() => reject(new Error("Google tardo demasiado")), GIS_TIMEOUT_MS + 5000);
    });
  }

  function randomNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback para iOS standalone o GIS bloqueado: flujo redirect de OpenID.
  function startRedirectLogin(clientId) {
    const nonce = randomNonce();
    writeStorage("authNonce", nonce);
    const redirectUri = `${location.origin}${location.pathname}`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      prompt: "select_account"
    });
    location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Si volvemos de un redirect de Google, el id_token viene en el fragmento.
  function consumeRedirectCredential() {
    if (typeof location === "undefined" || !location.hash) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    const idToken = params.get("id_token");
    if (!idToken) return null;
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const payloadPart = idToken.split(".")[1] || "";
      const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      const expectedNonce = readStorage("authNonce");
      writeStorage("authNonce", "");
      if (!expectedNonce || payload.nonce !== expectedNonce) return null;
    } catch {
      writeStorage("authNonce", "");
      return null;
    }
    return idToken;
  }

  global.ReadBibleAuth = {
    resolveApiBase,
    getSessionToken,
    setSessionToken,
    getSessionUser,
    setSessionUser,
    hasSession,
    authFetch,
    isLocalhost,
    isStandaloneIos,
    getNativePlatform,
    selectGoogleClientId,
    requestNativeGoogleCredential,
    buildDevCredential,
    readLegacyIdentity,
    loginWithCredential,
    logout,
    validateSession,
    loadGisScript,
    startRedirectLogin,
    consumeRedirectCredential
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
