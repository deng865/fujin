import { useEffect, useState } from 'react';
import { BROWSE_KEY, SERVICE_KEY, PRIVACY_EVENT, readPreference, savePreference } from '@/lib/locationPrivacy';
export function useLocationPrivacy() {
  const [browseEnabled, setBrowse] = useState(() => readPreference(BROWSE_KEY));
  const [serviceEnabled, setService] = useState(() => readPreference(SERVICE_KEY));
  useEffect(() => {
    const refresh = () => { setBrowse(readPreference(BROWSE_KEY)); setService(readPreference(SERVICE_KEY)); };
    window.addEventListener(PRIVACY_EVENT, refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(PRIVACY_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return { browseEnabled, serviceEnabled, setBrowseEnabled: (v: boolean) => savePreference(BROWSE_KEY, v), setServiceEnabled: (v: boolean) => savePreference(SERVICE_KEY, v) };
}
