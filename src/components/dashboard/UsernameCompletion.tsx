'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateUsername } from '@/lib/utils/username';

interface UsernameCompletionProps {
  currentUsername?: string | null;
  onCompleted?: (username: string) => void;
}

/**
 * One-time public username for an active account that still has a system placeholder.
 * This does not rename an account that already has a canonical username.
 */
export function UsernameCompletion({ currentUsername, onCompleted }: UsernameCompletionProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const validation = value ? validateUsername(value) : null;
  const inlineError = error || (validation && !validation.ok ? validation.message : '');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validateUsername(value);
    if (!next.ok) {
      setError(next.message);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/auth/complete-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: next.username }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Could not save that username');
        return;
      }
      setSuccess(`Username @${next.username} saved.`);
      setValue('');
      onCompleted?.(next.username);
    } catch {
      setError('Could not save that username');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Choose your username</h2>
        <p className="mt-1 text-sm text-gray-700">
          Your profile URL is still a temporary placeholder
          {currentUsername ? ` (@${currentUsername})` : ''}. Pick a public username to finish setup.
          This can be saved once.
        </p>
      </div>
      <Input
        label="Username"
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError('');
          setSuccess('');
        }}
        placeholder="YourStudio"
        error={inlineError}
        helperText="3-20 characters: letters, numbers, and underscores"
      />
      {success && <p className="text-sm text-green-700">{success}</p>}
      <Button type="submit" disabled={saving || !validation?.ok} loading={saving}>
        Save username
      </Button>
    </form>
  );
}
