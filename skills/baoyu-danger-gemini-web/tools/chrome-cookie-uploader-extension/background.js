import { getAutoSyncEnabled, isGoogleCookieChangeRelevant, uploadCookies } from './sync.js';

const AUTO_SYNC_DEBOUNCE_MS = 2000;
let syncTimer = null;

async function doSync(reason) {
  try {
    const result = await uploadCookies({ reason });
    console.log(`[Gemini Cookie Uploader] Auto sync success: ${result.cookieCount} cookies -> ${result.serverUrl}`);
  } catch (error) {
    console.error('[Gemini Cookie Uploader] Auto sync failed:', error);
  }
}

function scheduleSync(reason) {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void (async () => {
      const enabled = await getAutoSyncEnabled().catch(() => true);
      if (!enabled) {
        return;
      }
      await doSync(reason);
    })();
  }, AUTO_SYNC_DEBOUNCE_MS);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Gemini Cookie Uploader] Background auto sync is enabled.');
});

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (!changeInfo || !isGoogleCookieChangeRelevant(changeInfo.cookie)) {
    return;
  }

  scheduleSync('cookie-changed');
});
