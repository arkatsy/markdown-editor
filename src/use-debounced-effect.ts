import { useEffect, useRef } from "react";

export const useDebouncedEffect = (fn: () => void, deps: readonly unknown[], delay: number) => {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fnRef.current();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the deps are passed by the user of this hook.
  }, [...deps, delay]);
};
