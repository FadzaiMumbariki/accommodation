import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Property } from '../../types';
import { buildListingInquiryMessage, openWhatsAppTarget } from '../../lib/formatContact';
import { useSaved } from '../../context/SavedContext';
import { PropertyCard } from './PropertyCard';

jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('../../lib/formatContact', () => ({
  openWhatsAppTarget: jest.fn(),
  buildListingInquiryMessage: jest.fn(() => 'Is this still available?'),
}));
jest.mock('../../lib/coordinates', () => ({
  formatDistance: jest.fn((km: number) => `${km} km away`),
}));
jest.mock('../../context/SavedContext', () => ({ useSaved: jest.fn() }));

const useSavedMock = useSaved as unknown as jest.Mock;
const openWhatsAppMock = openWhatsAppTarget as unknown as jest.Mock;
const buildMessageMock = buildListingInquiryMessage as unknown as jest.Mock;

const toggleSaved = jest.fn();

const baseProperty: Property = {
  id: 'prop-1',
  title: 'Sunny Avondale flat',
  propertyType: 'apartment',
  price: 350,
  city: 'Harare',
  suburb: 'Avondale',
  province: 'Harare',
  bedrooms: 2,
  bathrooms: 1,
  maxOccupants: 3,
  images: [],
  amenities: [],
  description: 'Furnished two bedroom in Avondale',
  available: true,
  availabilityStatus: 'available_now',
  verified: false,
  reviewsCount: 0,
  postedAt: '2026-01-01T00:00:00Z',
  landlord: {
    id: 'landlord-1',
    name: 'Tatenda',
    phone: '+263771234567',
    verified: false,
    responseTime: 'within an hour',
  },
};

describe('PropertyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSavedMock.mockReturnValue({ isSaved: () => false, toggleSaved });
  });

  it('renders the core listing details', async () => {
    await render(<PropertyCard property={baseProperty} onPress={jest.fn()} />);

    expect(screen.getByText('Sunny Avondale flat')).toBeTruthy();
    expect(screen.getByText('350')).toBeTruthy();
    expect(screen.getByText('Avondale, Harare')).toBeTruthy();
    expect(screen.getByText('2 Beds')).toBeTruthy();
    expect(screen.getByText('1 Bath')).toBeTruthy();
    expect(screen.getByText('Max 3')).toBeTruthy();
  });

  it('singularises one bedroom and one bathroom', async () => {
    await render(
      <PropertyCard
        property={{ ...baseProperty, bedrooms: 1, bathrooms: 1 }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('1 Bed')).toBeTruthy();
    expect(screen.getByText('1 Bath')).toBeTruthy();
  });

  it('calls onPress when the card is tapped', async () => {
    const onPress = jest.fn();
    await render(<PropertyCard property={baseProperty} onPress={onPress} />);

    await fireEvent.press(screen.getByText('Sunny Avondale flat'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('saves an unsaved listing', async () => {
    await render(<PropertyCard property={baseProperty} onPress={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Save Sunny Avondale flat'));

    expect(toggleSaved).toHaveBeenCalledWith('prop-1');
  });

  it('unsaves an already saved listing', async () => {
    useSavedMock.mockReturnValue({ isSaved: () => true, toggleSaved });

    await render(<PropertyCard property={baseProperty} onPress={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Remove Sunny Avondale flat from saved listings'));

    expect(toggleSaved).toHaveBeenCalledWith('prop-1');
  });

  it('shows the rating when one is present', async () => {
    await render(<PropertyCard property={{ ...baseProperty, rating: 4.25 }} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Rating 4.3 out of 5')).toBeTruthy();
  });

  it('shows the distance badge when coordinates are resolvable', async () => {
    await render(
      <PropertyCard property={{ ...baseProperty, distanceKm: 2.4 }} onPress={jest.fn()} />,
    );

    expect(screen.getByText('2.4 km away')).toBeTruthy();
  });

  it('renders the Zimbabwe utility pills for matching amenities', async () => {
    await render(
      <PropertyCard
        property={{
          ...baseProperty,
          amenities: ['Borehole', 'Solar Power', 'Fibre internet', 'Durawall', 'Security'],
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Borehole')).toBeTruthy();
    expect(screen.getByText('Solar Power')).toBeTruthy();
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Durawall')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();
  });

  it('renders the water pill when only a water amenity is present', async () => {
    await render(
      <PropertyCard property={{ ...baseProperty, amenities: ['Water'] }} onPress={jest.fn()} />,
    );

    expect(screen.getByText('Water')).toBeTruthy();
  });

  it('hides the utility row when no relevant amenities exist', async () => {
    await render(
      <PropertyCard property={{ ...baseProperty, amenities: ['Parking'] }} onPress={jest.fn()} />,
    );

    expect(screen.queryByText('Borehole')).toBeNull();
    expect(screen.queryByText('Wi-Fi')).toBeNull();
  });

  it('opens the verified explainer from the badge', async () => {
    await render(
      <PropertyCard property={{ ...baseProperty, verified: true }} onPress={jest.fn()} />,
    );

    expect(screen.queryByText('What does Verified mean?')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Verified listing - tap to learn what this means'));

    expect(screen.getByText('What does Verified mean?')).toBeTruthy();
  });

  it('shows the WhatsApp action only when the landlord has a phone', async () => {
    const { rerender } = await render(
      <PropertyCard
        property={{
          ...baseProperty,
          landlord: { ...baseProperty.landlord, phone: '' },
        }}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Chat with landlord on WhatsApp')).toBeNull();

    await rerender(
      <PropertyCard
        property={{
          ...baseProperty,
          landlord: {
            id: 'landlord-1',
            name: 'Tariro',
            phone: '0771234567',
            verified: true,
            responseTime: 'Within 1 hour',
            rating: 5,
            totalListings: 3,
          },
        }}
        onPress={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Chat with landlord on WhatsApp'));

    expect(buildMessageMock).toHaveBeenCalled();
    expect(openWhatsAppMock).toHaveBeenCalledWith({
      phone: '0771234567',
      text: 'Is this still available?',
    });
  });

  it('hides the utility row and footer in horizontal mode', async () => {
    await render(
      <PropertyCard
        horizontal
        property={{
          ...baseProperty,
          amenities: ['Solar'],
          landlord: {
            id: 'l1',
            name: 'T',
            phone: '0770000000',
            verified: false,
            responseTime: 'Fast',
            rating: 5,
            totalListings: 1,
          },
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText('View details')).toBeNull();
    expect(screen.queryByText('Solar Power')).toBeNull();
  });
});
