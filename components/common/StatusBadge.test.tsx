import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['confirmed', 'Confirmed'],
    ['completed', 'Completed'],
    ['rejected', 'Rejected'],
    ['declined', 'Rejected'],
    ['cancelled', 'Cancelled'],
    ['paused', 'Paused'],
    ['active', 'Active'],
    ['matched', 'Matched'],
    ['fulfilled', 'Fulfilled'],
    ['closed', 'Closed'],
    ['expired', 'Expired'],
    ['pending', 'Pending'],
  ] as const)('renders the %s status label', async (status, label) => {
    await render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  it('falls back to Pending for an unknown status', async () => {
    await render(<StatusBadge status={'unexpected' as never} />);

    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('renders at medium size', async () => {
    await render(<StatusBadge status="active" size="medium" />);

    expect(screen.getByText('Active')).toBeTruthy();
  });
});
