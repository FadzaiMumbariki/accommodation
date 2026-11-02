import { describe, expect, it, jest } from '@jest/globals';

import { aiUnavailableMessage, describeAiError, hasRealAiSession } from './aiAvailability';
import { hasRealSession } from './session';

jest.mock('./session', () => ({ hasRealSession: jest.fn() }));

const hasRealSessionMock = hasRealSession as unknown as jest.Mock<() => Promise<boolean>>;

describe('describeAiError', () => {
  it('classifies 401 and 403 as an auth problem', () => {
    expect(describeAiError({ context: { status: 401 } })).toBe('auth');
    expect(describeAiError({ context: { status: 403 } })).toBe('auth');
  });

  it('classifies 429 as a rate limit', () => {
    expect(describeAiError({ context: { status: 429 } })).toBe('limit');
  });

  it('classifies anything else, including missing status, as an outage', () => {
    expect(describeAiError({ context: { status: 500 } })).toBe('outage');
    expect(describeAiError({})).toBe('outage');
    expect(describeAiError(undefined)).toBe('outage');
    expect(describeAiError(new Error('boom'))).toBe('outage');
  });
});

describe('aiUnavailableMessage', () => {
  it('returns a sign-in prompt for auth, a limit message for limit and a generic message otherwise', () => {
    expect(aiUnavailableMessage('auth')).toMatch(/sign in/i);
    expect(aiUnavailableMessage('limit')).toMatch(/limit/i);
    expect(aiUnavailableMessage('outage')).toMatch(/temporarily unavailable/i);
  });
});

describe('hasRealAiSession', () => {
  it('mirrors the real-session check', async () => {
    hasRealSessionMock.mockResolvedValue(true);
    await expect(hasRealAiSession()).resolves.toBe(true);

    hasRealSessionMock.mockResolvedValue(false);
    await expect(hasRealAiSession()).resolves.toBe(false);
  });
});
