import { useEffect, useState } from 'react';

// Returns `value` once it has stopped changing for `delay` ms. Used for text filters, so typing
// "Engineering" sends one request instead of eleven.
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
