import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { ConversationSkeleton, PropertyCardSkeleton, Skeleton } from './Skeleton';

describe('Skeleton', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('renders a plain skeleton without crashing', async () => {
    await render(<Skeleton width={80} height={20} />);

    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders the property card placeholder', async () => {
    await render(<PropertyCardSkeleton />);

    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders the conversation placeholder', async () => {
    await render(<ConversationSkeleton />);

    expect(screen.toJSON()).not.toBeNull();
  });
});
