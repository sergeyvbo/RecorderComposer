import { ALLOWED_KEYS } from '@/domain/keys';
import type { Key } from '@/domain/types';
import { useKeyName } from '../useKeyName';

export const keyValue = (k: Key) => `${k.tonic}-${k.mode}`;
export const keyFromValue = (v: string): Key | undefined => ALLOWED_KEYS.find((k) => keyValue(k.key) === v)?.key;

/** Select among keys with up to four sharps or flats; changes signature and spelling only (FR-027). */
export function KeySelectInput({ value, onChange, label }: { value: Key; onChange: (k: Key) => void; label: string }) {
  const keyName = useKeyName();
  return (
    <select aria-label={label} value={keyValue(value)} onChange={(e) => {
      const k = keyFromValue(e.target.value);
      if (k) onChange(k);
    }}>
      {ALLOWED_KEYS.map(({ key }) => (
        <option key={keyValue(key)} value={keyValue(key)}>
          {keyName(key)}
        </option>
      ))}
    </select>
  );
}
