import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from './PrimaryButton';

describe('PrimaryButton', () => {
  it('renders its title and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Save changes" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Save changes'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Save changes" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByText('Save changes'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('swaps the title for a spinner while loading and stays disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton testID="primary-button" title="Saving" onPress={onPress} loading />);

    expect(screen.queryByText('Saving')).toBeNull();

    await fireEvent.press(screen.getByTestId('primary-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
