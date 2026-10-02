import { useEffect, useState } from 'react';
import { isGoogleBlocked, onGoogleBlocked, probeGoogle } from './tripGeo';

// 'google' while Google Maps works, 'osm' (free OpenStreetMap) when it is blocked
// (for example, billing is not enabled on the Google Cloud project).
export default function useMapProvider(loadError) {
  const [blocked, setBlocked] = useState(isGoogleBlocked());
  useEffect(() => {
    const stop = onGoogleBlocked(() => setBlocked(true));
    // Google may still be loading, so keep checking for a few seconds.
    probeGoogle();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      probeGoogle();
      if (tries > 20) clearInterval(timer);
    }, 500);
    return () => { stop(); clearInterval(timer); };
  }, []);
  return blocked || Boolean(loadError) ? 'osm' : 'google';
}