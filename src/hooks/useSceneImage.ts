import { useCallback, useEffect, useState } from 'react';

export function useSceneImage(imageUrl: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setLoaded(false);
      return;
    }

    setLoaded(false);

    const img = new Image();
    const markLoaded = () => setLoaded(true);
    img.onload = markLoaded;
    img.onerror = markLoaded;
    img.src = imageUrl;

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  const onImgLoad = useCallback(() => setLoaded(true), []);
  const onImgError = useCallback(() => setLoaded(true), []);

  return { loaded, onImgLoad, onImgError };
}
