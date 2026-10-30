/**
 * Regression Tests for LoginPage / UserLogin component
 * Matching tests specified in TODO.md 6.2 Frontend tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserLogin from '../userlogin/UserLogin';
import * as authApi from '../userlogin/authApi';

vi.mock('../userlogin/authApi');

describe('LoginPage / UserLogin regression suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.checkAuthStatus.mockResolvedValue(null);
  });

  // 1. renders_sign_in_and_logout_options
  it('renders_sign_in_and_logout_options', () => {
    render(<UserLogin />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /logout all/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/e\.g\. shadow hackers/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /enter the house/i })).toBeDefined();
  });

  // 2. sign_in_disables_button_while_pending
  it('sign_in_disables_button_while_pending', async () => {
    let resolveLogin;
    authApi.loginTeam.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));

    render(<UserLogin />);
    const teamInput = screen.getByPlaceholderText(/e\.g\. shadow hackers/i);
    const passInput = screen.getByPlaceholderText(/••••••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /enter the house/i });

    fireEvent.change(teamInput, { target: { value: 'Team Cipher' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/verifying ritual\.\.\./i)).toBeDefined();
    expect(screen.getByRole('button', { name: /verifying ritual\.\.\./i }).disabled).toBe(true);

    resolveLogin({ ok: true, team: { name: 'Team Cipher' }, message: 'Success' });
  });

  // 3. sign_in_shows_generic_error_on_bad_credentials
  it('sign_in_shows_generic_error_on_bad_credentials', async () => {
    const error = new Error('Team name or password is wrong');
    error.code = 'BAD_CREDENTIALS';
    authApi.loginTeam.mockRejectedValue(error);

    render(<UserLogin />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. shadow hackers/i), { target: { value: 'Team Cipher' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /enter the house/i }));

    await waitFor(() => {
      expect(screen.getByText('Team name or password is wrong')).toBeDefined();
    });
  });

  // 4. session_limit_shows_logout_everywhere_button & prefill
  it('session_limit_shows_logout_everywhere_button_and_switches_tab', async () => {
    const error = new Error('Your team is already signed in on 2 devices.');
    error.code = 'SESSION_LIMIT';
    error.detail = {
      code: 'SESSION_LIMIT',
      message: 'Your team is already signed in on 2 devices.',
      active_sessions: 2,
      devices: ['Browser on Laptop', 'Browser on Mobile']
    };
    authApi.loginTeam.mockRejectedValue(error);

    render(<UserLogin />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. shadow hackers/i), { target: { value: 'Team Cipher' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /enter the house/i }));

    await waitFor(() => {
      expect(screen.getByText(/your team is already signed in on 2 devices/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /log out this team everywhere/i })).toBeDefined();
    });

    // Clicking switches to logout all
    fireEvent.click(screen.getByRole('button', { name: /log out this team everywhere/i }));
    expect(screen.getByRole('button', { name: /log out this team/i })).toBeDefined();
  });

  // 5. logout_success_shows_sessions_ended_and_returns_to_sign_in
  it('logout_success_shows_sessions_ended_and_returns_to_sign_in', async () => {
    authApi.logoutAllDevices.mockResolvedValue({
      ok: true,
      sessions_ended: 2,
      message: '2 session(s) ended. You can sign in now.'
    });

    render(<UserLogin />);
    fireEvent.click(screen.getByRole('button', { name: /logout all/i }));

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. shadow hackers/i), { target: { value: 'Team Cipher' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log out this team/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 session\(s\) ended\. you can sign in now\./i)).toBeDefined();
      // Switches back to sign in
      expect(screen.getByRole('button', { name: /enter the house/i })).toBeDefined();
      // Team name kept
      expect(screen.getByPlaceholderText(/e\.g\. shadow hackers/i).value).toBe('Team Cipher');
      // Password cleared
      expect(screen.getByPlaceholderText(/••••••••••••/i).value).toBe('');
    });
  });

  // 6. password_toggle_shows_and_hides
  it('password_toggle_shows_and_hides', () => {
    render(<UserLogin />);
    const passInput = screen.getByPlaceholderText(/••••••••••••/i);
    expect(passInput.type).toBe('password');

    const toggleBtn = screen.getByTitle(/show password/i);
    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe('text');

    const hideBtn = screen.getByTitle(/hide password/i);
    fireEvent.click(hideBtn);
    expect(passInput.type).toBe('password');
  });

  // 7. direct_login_does_not_redirect
  it('direct_login_does_not_redirect_and_shows_logged_in_status', async () => {
    authApi.loginTeam.mockResolvedValue({
      ok: true,
      team: { id: 1, name: 'Team Cipher' },
      message: 'Welcome, Team Cipher! Authenticated successfully.'
    });

    render(<UserLogin />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. shadow hackers/i), { target: { value: 'Team Cipher' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /enter the house/i }));

    await waitFor(() => {
      expect(screen.getByText(/logged in as/i)).toBeDefined();
      expect(screen.getByText('Team Cipher')).toBeDefined();
    });
  });
});
