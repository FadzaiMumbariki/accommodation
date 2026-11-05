import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { AvailabilityBadge } from './AvailabilityBadge';

describe('AvailabilityBadge', () => {
  it('shows Available now for available properties', async () => {
    await render(<AvailabilityBadge status="available_now" />);

    expect(screen.getByText('Available now')).toBeTruthy();
  });

  it('shows the date when the property becomes available', async () => {
    await render(<AvailabilityBadge status="available_from" availableFromDate="1 March" />);

    expect(screen.getByText('Available from 1 March')).toBeTruthy();
  });

  it('falls back to Available soon without a date', async () => {
    await render(<AvailabilityBadge status="available_from" />);

    expect(screen.getByText('Available soon')).toBeTruthy();
  });

  it('shows Occupied for unavailable properties', async () => {
    await render(<AvailabilityBadge status="occupied" size="large" />);

    expect(screen.getByText('Occupied')).toBeTruthy();
  });
});
