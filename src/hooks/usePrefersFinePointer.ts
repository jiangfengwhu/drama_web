import { useEffect, useState } from 'react';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/** 桌面精确指针（可 hover）；移动端为 false */
export function usePrefersFinePointer(): boolean {
  const [prefersFinePointer, setPrefersFinePointer] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(FINE_POINTER_QUERY).matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER_QUERY);
    const onChange = () => setPrefersFinePointer(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return prefersFinePointer;
}
