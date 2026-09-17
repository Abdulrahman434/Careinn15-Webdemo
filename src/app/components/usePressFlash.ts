import { useCallback, useEffect, useRef, useState } from "react";

/** A tap on a touch screen is over in a few milliseconds, so a `:active` /
 *  pointer-held highlight is gone before the eye registers it. Latching the
 *  pressed key for a moment after the press is what makes a keypad feel like
 *  it responded. Shared by every PIN pad and the dialer so they match. */
export function usePressFlash(durationMs = 150) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((key: string) => {
    setPressedKey(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPressedKey(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { pressedKey, flash };
}
