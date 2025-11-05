export interface AmenityDefinition {
  key: string;
  code: number;
  labelKey: string;
  icon: string;
  defaultAvailable?: boolean | null;
  relatedOfferField?: 'internet_included' | 'utilities_included' | 'furnished';
  defaultSelected?: boolean;
  formLabelKey?: string;
}

const AMENITY_DEFINITIONS_INTERNAL: AmenityDefinition[] = [
  {
    key: 'wifi',
    code: 101,
    labelKey: 'ROOM.DETAILS.AMENITIES.WIFI',
    icon: 'wifi-outline',
    relatedOfferField: 'internet_included'
  },
  {
    key: 'utilities',
    code: 102,
    labelKey: 'ROOM.DETAILS.AMENITIES.UTILITIES',
    icon: 'flash-outline',
    relatedOfferField: 'utilities_included'
  },
  {
    key: 'furnished',
    code: 103,
    labelKey: 'ROOM.DETAILS.AMENITIES.FURNISHED',
    icon: 'bed-outline',
    relatedOfferField: 'furnished'
  },
  {
    key: 'heating',
    code: 104,
    labelKey: 'ROOM.DETAILS.AMENITIES.HEATING',
    icon: 'flame-outline',
    formLabelKey: 'ROOM.FORM.HEATING'
  },
  {
    key: 'parking',
    code: 105,
    labelKey: 'ROOM.DETAILS.AMENITIES.PARKING',
    icon: 'car-outline',
    formLabelKey: 'ROOM.FORM.PARKING'
  },
  {
    key: 'kitchen',
    code: 106,
    labelKey: 'ROOM.DETAILS.AMENITIES.KITCHEN',
    icon: 'restaurant-outline',
    defaultAvailable: true,
    defaultSelected: true,
    formLabelKey: 'ROOM.FORM.KITCHEN'
  },
  {
    key: 'tv',
    code: 107,
    labelKey: 'ROOM.DETAILS.AMENITIES.TV',
    icon: 'tv-outline',
    formLabelKey: 'ROOM.FORM.TV'
  },
  {
    key: 'security',
    code: 108,
    labelKey: 'ROOM.DETAILS.AMENITIES.SECURITY',
    icon: 'shield-checkmark-outline',
    formLabelKey: 'ROOM.FORM.SECURITY'
  },
  {
    key: 'balcony',
    code: 109,
    labelKey: 'ROOM.DETAILS.AMENITIES.BALCONY',
    icon: 'home-outline',
    formLabelKey: 'ROOM.FORM.BALCONY'
  }
];

export const AMENITY_DEFINITIONS: AmenityDefinition[] = AMENITY_DEFINITIONS_INTERNAL;

export const AMENITY_DEFINITIONS_BY_KEY: Record<string, AmenityDefinition> =
  AMENITY_DEFINITIONS_INTERNAL.reduce((accumulator, definition) => {
    accumulator[definition.key.toLowerCase()] = definition;
    return accumulator;
  }, {} as Record<string, AmenityDefinition>);

export const AMENITY_DEFINITIONS_BY_CODE: Record<string, AmenityDefinition> =
  AMENITY_DEFINITIONS_INTERNAL.reduce((accumulator, definition) => {
    accumulator[String(definition.code)] = definition;
    return accumulator;
  }, {} as Record<string, AmenityDefinition>);

export const AMENITY_KEY_TO_CODE: Record<string, number> = AMENITY_DEFINITIONS_INTERNAL.reduce(
  (accumulator, definition) => {
    accumulator[definition.key.toLowerCase()] = definition.code;
    return accumulator;
  },
  {} as Record<string, number>
);

export const AMENITY_CODE_TO_KEY: Record<string, string> = AMENITY_DEFINITIONS_INTERNAL.reduce(
  (accumulator, definition) => {
    accumulator[String(definition.code)] = definition.key;
    return accumulator;
  },
  {} as Record<string, string>
);

export const ADDITIONAL_AMENITIES: AmenityDefinition[] = AMENITY_DEFINITIONS_INTERNAL.filter(
  (definition) => !!definition.formLabelKey
);
