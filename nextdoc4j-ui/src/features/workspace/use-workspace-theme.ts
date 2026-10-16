import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { getSystemDarkMode } from './browser-preferences';

/** Owns system theme observation and root view-transition cleanup.
 * @param themePreference Current saved light, dark or system preference.
 * @returns Resolved colors, system state and a transition callback for preference changes.
 */
export function useWorkspaceTheme(themePreference: 'light' | 'dark' | 'system') {
  const [systemDarkMode, setSystemDarkMode] = useState(getSystemDarkMode);
  const preferenceRef = useRef(themePreference);
  useLayoutEffect(() => {
    preferenceRef.current = themePreference;
  }, [themePreference]);
  const activeThemeTransitionRef = useRef<ViewTransition | undefined>(undefined);
  const darkMode = themePreference === 'dark' || (themePreference === 'system' && systemDarkMode);
  /**
   * Applies a light or dark state change through one root snapshot transition.
   *
   * @param nextDarkMode Whether the updated workspace should use the dark palette.
   * @param update State update that produces the next theme and related control state.
   * @returns Nothing; starts a directional reveal or a lightweight supported fallback.
   */
  const runThemeTransition = useCallback((nextDarkMode: boolean, update: () => void) => {
    const root = globalThis.document.documentElement;
    const currentDarkMode = root.classList.contains('dark');
    if (currentDarkMode === nextDarkMode) {
      update();
      return;
    }

    const reduceMotion =
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    /**
     * Commits the requested state before the browser captures the new theme snapshot.
     *
     * @param None; reads the current component state and DOM references.
     * @returns Nothing; flushes React state and synchronizes the root theme class.
     */
    const applyUpdate = () => {
      flushSync(update);
      root.classList.toggle('dark', nextDarkMode);
    };
    if (
      typeof globalThis.document.startViewTransition !== 'function' ||
      reduceMotion ||
      globalThis.document.visibilityState === 'hidden'
    ) {
      applyUpdate();
      if (!reduceMotion && globalThis.document.visibilityState !== 'hidden') {
        globalThis.document.body.animate([{ opacity: 0.86 }, { opacity: 1 }], {
          duration: 180,
          easing: 'linear',
        });
      }
      return;
    }

    activeThemeTransitionRef.current?.skipTransition();
    root.dataset.themeTransition = nextDarkMode ? 'to-dark' : 'to-light';
    const transition = globalThis.document.startViewTransition(applyUpdate);
    activeThemeTransitionRef.current = transition;

    /**
     * Releases transition state after completion, cancellation, or an update failure.
     *
     * @param None; reads the current component state and DOM references.
     * @returns Nothing; clears only the transition that is still active.
     */
    const finishTransition = () => {
      if (activeThemeTransitionRef.current !== transition) return;
      delete root.dataset.themeTransition;
      activeThemeTransitionRef.current = undefined;
    };
    void transition.finished.then(finishTransition, finishTransition);
  }, []);

  useLayoutEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.dataset.themePreference = themePreference;
  }, [darkMode, themePreference]);
  useEffect(() => {
    const mediaQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;
    /** Synchronizes the operating-system palette without overriding an explicit user theme.
     * @param event Updated system media preference.
     * @returns Nothing; applies a transition only when system mode is selected.
     */
    const syncSystemTheme = (event: MediaQueryListEvent) => {
      if (preferenceRef.current === 'system') {
        runThemeTransition(event.matches, () => setSystemDarkMode(event.matches));
        return;
      }
      setSystemDarkMode(event.matches);
    };
    setSystemDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', syncSystemTheme);
    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, [runThemeTransition]);
  useEffect(
    () => () => {
      activeThemeTransitionRef.current?.skipTransition();
    },
    [],
  );

  return { darkMode, systemDarkMode, runThemeTransition };
}
