import {
  DEFAULT_AUTO_SYNC_ENABLED,
  DEFAULT_SERVER_URL,
  getAutoSyncEnabled,
  getServerUrl,
  setAutoSyncEnabled,
  setServerUrl,
  uploadCookies,
} from './sync.js';

document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('serverUrl');
  const autoSyncInput = document.getElementById('autoSync');
  const syncBtn = document.getElementById('syncBtn');
  const statusDiv = document.getElementById('status');

  const initialServerUrl = await getServerUrl().catch(() => DEFAULT_SERVER_URL);
  const initialAutoSync = await getAutoSyncEnabled().catch(() => DEFAULT_AUTO_SYNC_ENABLED);
  serverInput.value = initialServerUrl;
  autoSyncInput.checked = initialAutoSync;

  autoSyncInput.addEventListener('change', async () => {
    const enabled = await setAutoSyncEnabled(autoSyncInput.checked);
    showStatus(enabled ? 'Auto sync enabled.' : 'Auto sync disabled.', 'info');
  });

  syncBtn.addEventListener('click', async () => {
    const serverUrl = serverInput.value.trim();
    if (!serverUrl) {
      showStatus('Please enter a server URL', 'error');
      return;
    }

    await setServerUrl(serverUrl);
    
    showStatus('Fetching cookies from google.com...', 'info');
    syncBtn.disabled = true;

    try {
      showStatus(`Uploading cookies to ${serverUrl}...`, 'info');
      const uploadResult = await uploadCookies({ reason: 'manual', serverUrl });
      showStatus(`Success! Uploaded ${uploadResult.cookieCount} cookies.`, 'success');
    } catch (err) {
      console.error(err);
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      syncBtn.disabled = false;
    }
  });

  function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = type;
  }
});
