(function (global) {
  function readProxyStats() {
    try {
      const raw = localStorage.getItem("proxyStats");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeProxyStats(stats) {
    try {
      localStorage.setItem("proxyStats", JSON.stringify(stats));
    } catch {
      // ignore
    }
  }

  function recordProxyTiming(url, ms, ok) {
    const stats = readProxyStats();
    const entry = stats[url] || { count: 0, avgMs: 0, ok: 0, fail: 0 };
    entry.count += 1;
    if (ok) entry.ok += 1;
    else entry.fail += 1;
    if (Number.isFinite(ms)) {
      entry.avgMs = entry.count === 1 ? ms : (entry.avgMs * 0.7 + ms * 0.3);
    }
    stats[url] = entry;
    writeProxyStats(stats);
  }

  function isProxyDebugEnabled() {
    try {
      return localStorage.getItem("debugProxy") === "1";
    } catch {
      return false;
    }
  }

  function orderProxies(urls) {
    const stats = readProxyStats();
    return [...urls].sort((a, b) => {
      const sa = stats[a];
      const sb = stats[b];
      if (!sa && !sb) return 0;
      if (!sa) return 1;
      if (!sb) return -1;
      if (sa.ok !== sb.ok) return sb.ok - sa.ok;
      if (sa.avgMs !== sb.avgMs) return sa.avgMs - sb.avgMs;
      return sa.fail - sb.fail;
    });
  }

  function buildFetchUrls(url) {
    const encoded = encodeURIComponent(url);
    const urls = [
      `${location.origin}/proxy?url=${encoded}`,
      `https://readbible-production.up.railway.app/?url=${encoded}`,
      `https://corsproxy.io/?url=${encoded}`,
      `https://corsproxy.org/?${encoded}`,
      `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
      `https://api.allorigins.win/raw?url=${encoded}`
    ];
    if (location.hostname.endsWith("github.io")) {
      return orderProxies(urls.slice(1));
    }
    return orderProxies(urls);
  }

  function anyResolve(promises) {
    return new Promise((resolve, reject) => {
      let pending = promises.length;
      if (!pending) {
        reject(new Error("No promises"));
        return;
      }
      promises.forEach((p) => {
        Promise.resolve(p).then(resolve, (err) => {
          pending -= 1;
          if (pending === 0) reject(err);
        });
      });
    });
  }

  async function fetchWithTimeout(url, timeoutMs, controller) {
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = performance.now();
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("bad response");
      const text = await response.text();
      if (!text || text.length <= 500) throw new Error("short response");
      recordProxyTiming(url, performance.now() - start, true);
      if (isProxyDebugEnabled()) {
        console.log("[proxy ok]", Math.round(performance.now() - start), "ms", url);
      }
      return text;
    } catch (error) {
      if (error && error.name === "AbortError") {
        if (isProxyDebugEnabled()) {
          console.log("[proxy abort]", Math.round(performance.now() - start), "ms", url);
        }
        throw error;
      }
      recordProxyTiming(url, performance.now() - start, false);
      if (isProxyDebugEnabled()) {
        console.log("[proxy fail]", Math.round(performance.now() - start), "ms", url);
      }
      throw new Error("fetch failed");
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFirstHtml(urls, timeoutMs) {
    const ordered = orderProxies(urls);
    const controllers = ordered.map(() => new AbortController());
    try {
      const staggerMs = 250;
      const attempts = ordered.map((url, index) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          fetchWithTimeout(url, timeoutMs, controllers[index]).then(resolve, reject);
        }, index * staggerMs);
        controllers[index].signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
      }));
      const html = await anyResolve(attempts);
      controllers.forEach((ctrl) => ctrl.abort());
      return html;
    } catch {
      controllers.forEach((ctrl) => ctrl.abort());
      return "";
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("fetch failed");
    return response.json();
  }

  const api = {
    readProxyStats,
    writeProxyStats,
    recordProxyTiming,
    isProxyDebugEnabled,
    orderProxies,
    buildFetchUrls,
    anyResolve,
    fetchWithTimeout,
    fetchFirstHtml,
    fetchJson
  };

  global.ReadBibleNet = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
