import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SecondaryButton } from './SecondaryButton';

describe('SecondaryButton', () => {
  it('renders its title and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<SecondaryButton title="Cancel" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<SecondaryButton title="Cancel" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(['outline', 'ghost', 'navy'] as const)('renders the %s variant', async (variant) => {
    await render(<SecondaryButton title="Retry" onPress={jest.fn()} variant={variant} />);

    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('renders a leading icon when provided', async () => {
    await render(<SecondaryButton title="Share" onPress={jest.fn()} icon={<></>} />);

    expect(screen.getByText('Share')).toBeTruthy();
  });
});
