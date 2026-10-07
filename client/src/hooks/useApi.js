import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data from a service function and re-loads when `deps` change or reload() is called.
//   const { data, loading, error, reload } = useApi(() => getMyLeaves(filters), [filters]);
// The previous data stays visible while a refresh is loading, so tables do not flash empty.
export function useApi(fetcher, deps = []) {
  const [version, setVersion] = useState(0);
  // Identifies the current request; a result belongs to the request it was fetched for.
  const key = `${JSON.stringify(deps)}#${version}`;
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  // Always call the latest fetcher without making it a dependency.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current()
      .then((data) => { if (!cancelled) setResult({ key, data, error: '' }); })
      .catch((err) => { if (!cancelled) setResult((r) => ({ key, data: r.data, error: err.message })); });
    return () => { cancelled = true; };
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const settled = result.key === key;
  return { data: result.data, loading: !settled, error: settled ? result.error : '', reload };
}
