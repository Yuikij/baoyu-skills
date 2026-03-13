export const DEFAULT_SERVER_URL = 'http://localhost:3000/upload';
export const DEFAULT_AUTO_SYNC_ENABLED = true;

function normalizeServerUrl(input) {
  const value = (input || '').trim();
  return value || DEFAULT_SERVER_URL;
}

export async function getServerUrl() {
  const result = await chrome.storage.local.get(['serverUrl']);
  return normalizeServerUrl(result.serverUrl);
}

export async function setServerUrl(serverUrl) {
  const normalized = normalizeServerUrl(serverUrl);
  await chrome.storage.local.set({ serverUrl: normalized });
  return normalized;
}

export async function getAutoSyncEnabled() {
  const result = await chrome.storage.local.get(['autoSyncEnabled']);
  if (typeof result.autoSyncEnabled === 'boolean') {
    return result.autoSyncEnabled;
  }
  return DEFAULT_AUTO_SYNC_ENABLED;
}

export async function setAutoSyncEnabled(enabled) {
  const value = Boolean(enabled);
  await chrome.storage.local.set({ autoSyncEnabled: value });
  return value;
}

export function isGoogleCookieDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const value = domain.startsWith('.') ? domain.slice(1) : domain;
  return value === 'google.com' || value.endsWith('.google.com');
}

export function isGoogleCookieChangeRelevant(cookie) {
  if (!cookie) return false;
  return isGoogleCookieDomain(cookie.domain);
}

export async function collectGoogleCookies() {
  const cookies = await chrome.cookies.getAll({ domain: 'google.com' });
  if (!cookies || cookies.length === 0) {
    throw new Error('No cookies found for google.com. Please log in first.');
  }

  const cookieMap = {};
  for (const cookie of cookies) {
    cookieMap[cookie.name] = cookie.value;
  }

  return { cookies, cookieMap };
}

export async function uploadCookies(options = {}) {
  const reason = options.reason || 'manual';
  const serverUrl = normalizeServerUrl(options.serverUrl || (await getServerUrl()));
  const { cookies, cookieMap } = await collectGoogleCookies();

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    cookieMap,
    source: 'chrome-extension',
    reason,
  };

  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Server returned ${response.status}: ${response.statusText}${bodyText ? ` - ${bodyText}` : ''}`);
  }

  const result = await response.json().catch(() => ({}));

  return {
    serverUrl,
    cookieCount: cookies.length,
    result,
  };
}
