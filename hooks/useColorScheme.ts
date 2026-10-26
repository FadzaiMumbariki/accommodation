import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Returns 'light' | 'dark' based on the system color scheme.
 * Defaults to 'light' if undefined.
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
