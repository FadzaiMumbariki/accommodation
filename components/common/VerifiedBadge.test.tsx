import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { VerifiedBadge } from './VerifiedBadge';

describe('VerifiedBadge', () => {
  it('renders the default label', async () => {
    await render(<VerifiedBadge />);

    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('renders a custom label', async () => {
    await render(<VerifiedBadge label="ID checked" size="medium" />);

    expect(screen.getByText('ID checked')).toBeTruthy();
  });
});
