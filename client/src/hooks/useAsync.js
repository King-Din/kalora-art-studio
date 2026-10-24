import { useCallback, useEffect, useRef, useState } from "react";

// ONE hook for loading data: { data, error, loading, reload }. Optionally reloads when the window regains focus.
export function useAsync(fn, deps = [], { refetchOnFocus = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async (keepData) => {
    setState((s) => ({ data: keepData ? s.data : null, error: null, loading: !keepData || s.data === null }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ data: keepData ? s.data : null, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await fnRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) setState({ data: null, error, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!refetchOnFocus) return undefined;
    const onFocus = () => run(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchOnFocus, run]);

  return { ...state, reload: () => run(true) };
}
