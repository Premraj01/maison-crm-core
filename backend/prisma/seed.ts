import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { hashPassword } from '../src/common/crypto/password';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  LISTING_TYPES,
  PROPERTY_KINDS,
  type ListingType,
  type PropertyKind,
} from '../src/modules/properties/properties.types';
import { USER_ROLES, type UserRole } from '../src/modules/users/users.types';

/**
 * Development seed — one signed-in-able account per role, so every branch of
 * the permission matrix can be exercised by actually signing in.
 *
 * Idempotent: re-running updates the existing rows rather than failing on the
 * unique email, and rewrites the password so a forgotten seed login is always
 * recoverable with `npm run db:seed`.
 *
 * Also seeds the portfolio the public beacon-estates website renders. Those
 * rows are keyed by `slug`, so re-running restores a listing edited in the CRM
 * back to its published copy rather than duplicating it.
 */

/** Shared across the seeded accounts; overridable for a shared dev database. */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Maison!2026';

/** A single fixed org, so the seeded users share realtime rooms and org-scoped queries. */
const SEED_ORG_ID = process.env.SEED_ORG_ID ?? '00000000-0000-4000-8000-000000000001';

/**
 * Two regions, each with a full team, so region isolation can be checked by
 * signing in: a West Coast account must never see an East Coast listing, lead
 * or person. Fixed ids because `regions` has no other unique column to upsert on.
 */
const SEED_REGIONS = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    name: 'West Coast',
    code: 'WC',
    description: 'California — Malibu to Napa.',
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    name: 'East Coast',
    code: 'EC',
    description: 'New York City, the Hudson Valley and Long Island.',
  },
] as const;

type SeedRegionCode = (typeof SEED_REGIONS)[number]['code'];

interface SeedUser {
  email: string;
  fullName: string;
  role: UserRole;
  /** Omitted for the global roles, which belong to no region. */
  region?: SeedRegionCode;
  isActive?: boolean;
}

const SEED_USERS: SeedUser[] = [
  { email: 'sysadmin@maison.co', fullName: 'Rhea Kapoor', role: 'system_admin' },
  { email: 'owner@maison.co', fullName: 'Maya Chen', role: 'owner' },
  { email: 'region@maison.co', fullName: 'Jon Bell', role: 'region_head', region: 'WC' },
  { email: 'sdr@maison.co', fullName: 'Ana Moreau', role: 'sales_development_rep', region: 'WC' },
  { email: 'advisor@maison.co', fullName: 'Sam Rivera', role: 'property_advisor', region: 'WC' },
  { email: 'coordinator@maison.co', fullName: 'Tobias Reyes', role: 'transaction_coordinator', region: 'WC' },
  { email: 'east.region@maison.co', fullName: 'Nadia Okafor', role: 'region_head', region: 'EC' },
  { email: 'east.sdr@maison.co', fullName: 'Leo Hart', role: 'sales_development_rep', region: 'EC' },
  { email: 'east.advisor@maison.co', fullName: 'Iris Novak', role: 'property_advisor', region: 'EC' },
  { email: 'east.coordinator@maison.co', fullName: 'Owen Price', role: 'transaction_coordinator', region: 'EC' },
];

/** Which region sells each seeded listing, by slug. */
const PROPERTY_REGIONS: Record<string, SeedRegionCode> = {
  'casa-solana': 'WC',
  'villa-aster': 'WC',
  'hilltop-farmhouse': 'WC',
  'palm-court-residence': 'WC',
  'the-foundry-loft': 'WC',
  'cypress-court-villa': 'WC',
  'the-meridian-loft': 'EC',
  'the-larch-house': 'EC',
  'the-dune-house': 'EC',
};

function regionIdFor(code: SeedRegionCode | undefined): string | null {
  return code ? (SEED_REGIONS.find((region) => region.code === code)?.id ?? null) : null;
}


interface SeedProperty {
  slug: string;
  name: string;
  address: string;
  kind: PropertyKind;
  listing: ListingType;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  details: string;
  features: string[];
  images: string[];
  /** Presentation, rendered by the public website. */
  tag?: 'Signature' | 'New';
  portrait?: boolean;
  featured?: boolean;
}

/**
 * The nine residences the beacon-estates website launched with. Photographs
 * live in that site's `public/listings/`, so `images` holds site-relative
 * paths rather than anything this database serves.
 */
const SEED_PROPERTIES: SeedProperty[] = [
    {
      "slug": "casa-solana",
      "tag": "Signature",
      "portrait": true,
      "featured": true,
      "name": "Casa Solana",
      "address": "Malibu",
      "kind": "House",
      "listing": "Sale",
      "price": 4800000,
      "bedrooms": 5,
      "bathrooms": 4,
      "area": 4800,
      "details": "Perched above the Pacific on a private bluff, Casa Solana is a study in glass and golden light. Floor-to-ceiling glazing wraps the main level, dissolving the line between the living spaces and the horizon. Evenings end on the cantilevered terrace as the sun drops into the sea.",
      "features": [
        "Cantilevered ocean terrace",
        "Floor-to-ceiling glass walls",
        "Heated limestone floors",
        "Private beach path",
        "Chef's kitchen with oak cabinetry",
        "Two-car garage and motor court"
      ],
      "images": [
        "/listings/casa-solana.jpg"
      ]
    },
    {
      "slug": "villa-aster",
      "tag": "New",
      "portrait": true,
      "featured": true,
      "name": "Villa Aster",
      "address": "Sonoma",
      "kind": "Villa",
      "listing": "Sale",
      "price": 3200000,
      "bedrooms": 4,
      "bathrooms": 3,
      "area": 3600,
      "details": "A stone villa in the heart of wine country, Villa Aster pairs old-world materiality with a quietly modern plan. Cypress trees line the approach, and evenings gather around the courtyard fountain as the hills turn amber.",
      "features": [
        "Hand-cut stone facade",
        "Courtyard with fountain",
        "Cypress-lined drive",
        "Vineyard views",
        "Wine cellar",
        "Guest annex"
      ],
      "images": [
        "/listings/villa-aster.jpg"
      ]
    },
    {
      "slug": "the-meridian-loft",
      "portrait": true,
      "featured": true,
      "name": "The Meridian Loft",
      "address": "Tribeca",
      "kind": "Apartment",
      "listing": "Sale",
      "price": 2100000,
      "bedrooms": 2,
      "bathrooms": 2,
      "area": 1900,
      "details": "Inside a converted 1912 warehouse, the Meridian Loft holds sixteen-foot ceilings, arched steel windows and walls washed in warm terracotta plaster. Brass fixtures catch the afternoon light that pours across the polished concrete floor.",
      "features": [
        "16-ft vaulted ceilings",
        "Arched industrial windows",
        "Terracotta plaster walls",
        "Brass fixtures throughout",
        "Keyed elevator entry",
        "Original timber beams"
      ],
      "images": [
        "/listings/the-meridian-loft.jpg"
      ]
    },
    {
      "slug": "hilltop-farmhouse",
      "name": "Hilltop Farmhouse",
      "address": "Napa",
      "kind": "Villa",
      "listing": "Sale",
      "price": 1600000,
      "bedrooms": 3,
      "bathrooms": 2,
      "area": 2900,
      "details": "Set on a gentle rise above the valley, this farmhouse keeps its cream cabinetry, terracotta tile and slow mornings intact. The kitchen opens to a herb garden, and every window frames a row of vines.",
      "features": [
        "Terracotta tile floors",
        "Farmhouse kitchen",
        "Wrap-around porch",
        "Herb and kitchen garden",
        "Barn workshop",
        "Valley views"
      ],
      "images": [
        "/listings/hilltop-farmhouse.jpg"
      ]
    },
    {
      "slug": "the-larch-house",
      "name": "The Larch House",
      "address": "Hudson Valley",
      "kind": "Villa",
      "listing": "Sale",
      "price": 2400000,
      "bedrooms": 4,
      "bathrooms": 3,
      "area": 3400,
      "details": "Named for the larches that ring it, this warm-plastered house is built for readers and slow Sundays. A sunlit nook anchors every floor, and the plaster walls hold the day's light long after dusk.",
      "features": [
        "Warm plaster interiors",
        "Reading nook on every floor",
        "Linen-draped windows",
        "Wood-burning stove",
        "Mature larch grove",
        "Detached studio"
      ],
      "images": [
        "/listings/the-larch-house.jpg"
      ]
    },
    {
      "slug": "palm-court-residence",
      "name": "Palm Court Residence",
      "address": "Palm Springs",
      "kind": "Villa",
      "listing": "Sale",
      "price": 3900000,
      "bedrooms": 5,
      "bathrooms": 4,
      "area": 4100,
      "details": "A desert-modern courtyard house arranged around a single olive tree and a still, clear pool. Concrete planes, deep shade and long water make the heat feel like a feature, not a condition.",
      "features": [
        "Central pool courtyard",
        "Desert-modern plan",
        "Polished concrete terraces",
        "Olive tree courtyard",
        "Outdoor shower",
        "Mountain views"
      ],
      "images": [
        "/listings/palm-court-residence.jpg"
      ]
    },
    {
      "slug": "the-dune-house",
      "tag": "New",
      "name": "The Dune House",
      "address": "Montauk",
      "kind": "House",
      "listing": "Sale",
      "price": 2900000,
      "bedrooms": 3,
      "bathrooms": 2,
      "area": 2100,
      "details": "Weathered cedar and dune grass, ten steps from the sand. The Dune House wears its salt air honestly — silvered shingles, deep window seats, and a porch made for watching weather roll in.",
      "features": [
        "Direct beach access",
        "Weathered cedar siding",
        "Window seats throughout",
        "Outdoor shower",
        "Dune-top porch",
        "Fireplace"
      ],
      "images": [
        "/listings/the-dune-house.jpg"
      ]
    },
    {
      "slug": "the-foundry-loft",
      "name": "The Foundry Loft",
      "address": "Oakland",
      "kind": "Apartment",
      "listing": "Sale",
      "price": 1900000,
      "bedrooms": 2,
      "bathrooms": 2,
      "area": 1650,
      "details": "Exposed brick, steel-framed windows and a century of patina. The Foundry Loft keeps its industrial bones and layers them with warm linen, oak and soft late-afternoon light.",
      "features": [
        "Exposed brick walls",
        "Steel-framed windows",
        "Concrete floors",
        "Open sleeping mezzanine",
        "Freight elevator",
        "Roof deck rights"
      ],
      "images": [
        "/listings/the-foundry-loft.jpg"
      ]
    },
    {
      "slug": "cypress-court-villa",
      "tag": "Signature",
      "name": "Cypress Court Villa",
      "address": "Santa Barbara",
      "kind": "Villa",
      "listing": "Sale",
      "price": 5600000,
      "bedrooms": 6,
      "bathrooms": 5,
      "area": 5600,
      "details": "A Mediterranean estate organised around a grand fountain court, where cypress columns rise against warm stone. Loggias, balconies and shaded arcades make the outdoors live like another wing of the house.",
      "features": [
        "Grand fountain courtyard",
        "Stone loggias and arcades",
        "Six en-suite bedrooms",
        "Olive and citrus gardens",
        "Pool and spa terrace",
        "Three-car garage"
      ],
      "images": [
        "/listings/cypress-court-villa.jpg"
      ]
    }
  ];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set — copy .env.example to .env');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    assertEveryRoleCovered();

    for (const region of SEED_REGIONS) {
      const fields = { ...region, orgId: SEED_ORG_ID, deletedAt: null };
      await prisma.region.upsert({ where: { id: region.id }, create: fields, update: fields });
      console.log(`  ${region.code.padEnd(6)}  ${region.name}`);
    }
    console.log(`\nSeeded ${SEED_REGIONS.length} regions.\n`);

    for (const seed of SEED_USERS) {
      const email = seed.email.toLowerCase();
      const passwordHash = await hashPassword(SEED_PASSWORD);
      const fields = {
        fullName: seed.fullName,
        role: seed.role,
        orgId: SEED_ORG_ID,
        regionId: regionIdFor(seed.region),
        isActive: seed.isActive ?? true,
        passwordHash,
        // Undo a soft delete, so a seeded account can always be brought back.
        deletedAt: null,
      };

      const user = await prisma.user.upsert({
        where: { email },
        create: { email, ...fields },
        update: fields,
        select: { id: true, email: true, role: true },
      });

      console.log(`  ${user.role.padEnd(23)}  ${user.email.padEnd(26)}  ${seed.region ?? 'all'}`);
    }

    console.log(`\nSeeded ${SEED_USERS.length} users in org ${SEED_ORG_ID}.`);
    console.log(`Password for all of them: ${SEED_PASSWORD}`);

    assertSeedPropertiesValid();

    for (const seed of SEED_PROPERTIES) {
      // Undo a soft delete too, so `db:seed` always restores the full portfolio.
      const fields = {
        ...seed,
        orgId: SEED_ORG_ID,
        regionId: regionIdFor(PROPERTY_REGIONS[seed.slug]),
        deletedAt: null,
      };
      const property = await prisma.property.upsert({
        where: { slug: seed.slug },
        create: fields,
        update: fields,
        select: { slug: true, listing: true, price: true },
      });
      const price = property.price === null ? 'on request' : `$${property.price.toLocaleString()}`;
      console.log(`  ${property.listing.padEnd(4)}  ${property.slug.padEnd(22)}  ${price}`);
    }

    const trio = SEED_PROPERTIES.filter((seed) => seed.featured).length;
    console.log(`\nSeeded ${SEED_PROPERTIES.length} properties (${trio} featured).`);

    // Leads follow their listing's region. The API keeps that true as listings
    // move; the upserts above bypass it, so enquiries already captured against
    // a seeded listing are brought into line here.
    const moved = await prisma.$executeRaw`
      UPDATE "leads" AS l SET "regionId" = p."regionId"
      FROM "properties" AS p
      WHERE l."propertyId" = p."id" AND l."regionId" IS DISTINCT FROM p."regionId"`;
    if (moved > 0) console.log(`Placed ${moved} existing lead(s) in their listing's region.`);
  } finally {
    await prisma.$disconnect();
  }
}

/** Guards the promise in the file header: adding a role must add an account. */
function assertEveryRoleCovered(): void {
  const seeded = new Set(SEED_USERS.map((user) => user.role));
  const missing = USER_ROLES.filter((role) => !seeded.has(role));
  if (missing.length > 0) {
    throw new Error(`No seed user for role(s): ${missing.join(', ')} — add one to SEED_USERS.`);
  }
}

/** Guards the varchar columns: a typo here would only fail at read time. */
function assertSeedPropertiesValid(): void {
  for (const seed of SEED_PROPERTIES) {
    if (!(PROPERTY_KINDS as readonly string[]).includes(seed.kind)) {
      throw new Error(`Property "${seed.slug}" has unknown kind "${seed.kind}"`);
    }
    if (!(LISTING_TYPES as readonly string[]).includes(seed.listing)) {
      throw new Error(`Property "${seed.slug}" has unknown listing type "${seed.listing}"`);
    }
  }
  for (const slug of Object.keys(PROPERTY_REGIONS)) {
    if (!SEED_PROPERTIES.some((seed) => seed.slug === slug)) {
      throw new Error(`PROPERTY_REGIONS names unknown slug "${slug}"`);
    }
  }
  const slugs = new Set(SEED_PROPERTIES.map((seed) => seed.slug));
  if (slugs.size !== SEED_PROPERTIES.length) {
    throw new Error('SEED_PROPERTIES contains duplicate slugs');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
