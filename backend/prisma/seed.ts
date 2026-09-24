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

interface SeedUser {
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
}

const SEED_USERS: SeedUser[] = [
  { email: 'owner@maison.co', fullName: 'Maya Chen', role: 'owner' },
  { email: 'admin@maison.co', fullName: 'Jon Bell', role: 'admin' },
  { email: 'agent@maison.co', fullName: 'Sam Rivera', role: 'agent' },
  { email: 'viewer@maison.co', fullName: 'Ana Moreau', role: 'viewer' },
];


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

    for (const seed of SEED_USERS) {
      const email = seed.email.toLowerCase();
      const passwordHash = await hashPassword(SEED_PASSWORD);
      const fields = {
        fullName: seed.fullName,
        role: seed.role,
        orgId: SEED_ORG_ID,
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

      console.log(`  ${user.role.padEnd(6)}  ${user.email.padEnd(20)}  ${user.id}`);
    }

    console.log(`\nSeeded ${SEED_USERS.length} users in org ${SEED_ORG_ID}.`);
    console.log(`Password for all of them: ${SEED_PASSWORD}`);

    assertSeedPropertiesValid();

    for (const seed of SEED_PROPERTIES) {
      // Undo a soft delete too, so `db:seed` always restores the full portfolio.
      const fields = { ...seed, orgId: SEED_ORG_ID, deletedAt: null };
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
  const slugs = new Set(SEED_PROPERTIES.map((seed) => seed.slug));
  if (slugs.size !== SEED_PROPERTIES.length) {
    throw new Error('SEED_PROPERTIES contains duplicate slugs');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
