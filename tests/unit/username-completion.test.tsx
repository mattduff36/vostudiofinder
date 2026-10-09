import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UsernameCompletion } from '@/components/dashboard/UsernameCompletion';
import { UsernameSelectionForm } from '@/components/auth/UsernameSelectionForm';

jest.mock('@/hooks/usePreventBackNavigation', () => ({
  usePreventBackNavigation: () => undefined,
}));

describe('username completion UI', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows an inline error and does not submit a malformed username', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<UsernameCompletion currentUsername="temp_abc123" />);
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'PaulBerry-MirikaMedia' },
    });

    expect(screen.getByText(/letters, numbers, underscores only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save username' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves a valid username through the authenticated repair endpoint', async () => {
    const onCompleted = jest.fn();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { username: 'PaulBerry' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<UsernameCompletion currentUsername="temp_abc123" onCompleted={onCompleted} />);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'PaulBerry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save username' }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledWith('PaulBerry');
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/complete-username', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'PaulBerry' }),
    }));
  });
});

describe('username selection step', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('blocks continue when the proposed username is invalid', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('check-signup-status')) {
        return {
          ok: true,
          json: async () => ({
            canResume: true,
            hasUsername: false,
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              display_name: 'PaulBerry-MirikaMedia',
              username: null,
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ suggestions: [{ username: 'PaulberryMirikamedia', available: true }] }),
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <UsernameSelectionForm
        initialEmail="owner@example.com"
        initialDisplayName="PaulBerry-MirikaMedia"
      />
    );

    fireEvent.change(await screen.findByLabelText('Custom Username'), {
      target: { value: 'bad-name' },
    });

    expect(screen.getByText(/letters, numbers, underscores only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Membership' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/auth/reserve-username',
      expect.anything()
    );
  });
});
