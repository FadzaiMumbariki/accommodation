import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and message', async () => {
    await render(<EmptyState title="No listings yet" message="Try a different suburb." />);

    expect(screen.getByText('No listings yet')).toBeTruthy();
    expect(screen.getByText('Try a different suburb.')).toBeTruthy();
  });

  it('hides the action button when no handler is provided', async () => {
    await render(<EmptyState title="Nothing here" message="Empty." actionTitle="Retry" />);

    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('calls onAction when the action button is pressed', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="Nothing here"
        message="Empty."
        actionTitle="Retry"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByText('Retry'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
