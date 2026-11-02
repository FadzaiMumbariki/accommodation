import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { ErrorBoundary } from './ErrorBoundary';

function Boom(): ReactElement {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders its children while nothing throws', async () => {
    await render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('shows the recovery screen when a child throws', async () => {
    // React logs the caught render error and the boundary logs it again via
    // console.error; silence both so the run stays readable.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('kaboom')).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('prefers a custom fallback over the built-in screen', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(
        <ErrorBoundary fallback={<Text>Custom fallback</Text>}>
          <Boom />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom fallback')).toBeTruthy();
      expect(screen.queryByText('Something went wrong')).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});
