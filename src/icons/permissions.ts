/** Optionale Berechtigung, Webseiten nach ihren Icons zu fragen. */

const SITE_ORIGINS = ['http://*/*', 'https://*/*'];

export async function hasSiteAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: SITE_ORIGINS });
  } catch {
    return false;
  }
}

/** Muss direkt aus einem Klick heraus aufgerufen werden. */
export async function requestSiteAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: SITE_ORIGINS });
  } catch {
    return false;
  }
}

export async function revokeSiteAccess(): Promise<void> {
  try {
    await chrome.permissions.remove({ origins: SITE_ORIGINS });
  } catch {
    // Bei fest erteiltem Zugriff (Testbuild) nicht entziehbar.
  }
}

export function onSiteAccessChange(listener: (granted: boolean) => void): () => void {
  const handler = (): void => {
    void hasSiteAccess().then(listener);
  };
  chrome.permissions.onAdded.addListener(handler);
  chrome.permissions.onRemoved.addListener(handler);
  return () => {
    chrome.permissions.onAdded.removeListener(handler);
    chrome.permissions.onRemoved.removeListener(handler);
  };
}
