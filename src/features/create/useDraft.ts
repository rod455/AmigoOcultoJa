import { useCallback, useEffect, useRef, useState } from 'react';
import { type Draft, emptyDraft, loadDraft, saveDraft } from '@/lib/device';

/**
 * Rascunho do grupo (telas 2–4). Fica salvo localmente: se o organizador sair
 * antes de sortear, volta de onde parou (spec §6.1).
 */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const latest = useRef(draft);

  useEffect(() => {
    let alive = true;
    loadDraft().then((d) => {
      if (!alive) return;
      latest.current = d;
      setDraft(d);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
    const p = typeof patch === 'function' ? patch(latest.current) : patch;
    const next = { ...latest.current, ...p };
    latest.current = next;
    setDraft(next);
    void saveDraft(next);
  }, []);

  return { draft, update, ready };
}
