import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { messageOf } from '../lib/supabase';

// Cambiar de usuario o de recurso invalida inmediatamente los datos anteriores.
export function useFocusedData<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; data?: T; error?: string }>();
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    load().then(data => { if (active) setResult({ load, revision, data }); })
      .catch(error => { if (active) setResult({ load, revision, error: messageOf(error) }); });
    return () => { active = false; };
  }, [load, revision]));
  const current = result?.load === load && result.revision === revision ? result : undefined;
  return { data: current?.data, error: current?.error, refresh };
}
