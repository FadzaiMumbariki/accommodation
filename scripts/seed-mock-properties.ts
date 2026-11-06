/**
 * Seed database with mock properties
 * This copies the MOCK_PROPERTIES into your Supabase database
 *
 * Usage: npx ts-node scripts/seed-mock-properties.ts
 */

import { createClient } from '@supabase/supabase-js';
import { MOCK_PROPERTIES } from '../constants/mockData';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function seedProperties() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log('🌱 Seeding database with mock properties...\n');

  // You'll need to sign in first to get a landlord_id
  console.log('⚠️  IMPORTANT: You need a landlord user ID to seed properties');
  console.log('   1. Create a landlord account in your app');
  console.log('   2. Get the user ID from Supabase Dashboard → Authentication → Users');
  console.log('   3. Set it here:\n');

  const LANDLORD_ID = process.env.SEED_LANDLORD_ID || 'YOUR_LANDLORD_USER_ID_HERE';

  if (LANDLORD_ID === 'YOUR_LANDLORD_USER_ID_HERE') {
    console.error('❌ Please set SEED_LANDLORD_ID environment variable');
    console.log(
      '\nRun with: SEED_LANDLORD_ID=your-uuid npx ts-node scripts/seed-mock-properties.ts\n',
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let inserted = 0;
  let failed = 0;

  for (const property of MOCK_PROPERTIES) {
    try {
      const { error } = await supabase.from('properties').insert({
        landlord_id: LANDLORD_ID,
        title: property.title,
        property_type: property.propertyType,
        price: property.price,
        deposit: property.deposit,
        city: property.city,
        suburb: property.suburb,
        province: property.province,
        address: property.address || `${property.suburb}, ${property.city}`,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        max_occupants: property.maxOccupants,
        images: property.images,
        amenities: property.amenities,
        description: property.description,
        available: property.available,
        availability_status: 'available_now',
        lat: property.coordinates?.lat || null,
        lng: property.coordinates?.lng || null,
      });

      if (error) {
        console.error(`❌ Failed to insert: ${property.title}`);
        console.error(`   Error: ${error.message}\n`);
        failed++;
      } else {
        console.log(`✅ Inserted: ${property.title} (${property.city})`);
        inserted++;
      }
    } catch (err) {
      console.error(`❌ Exception inserting: ${property.title}`);
      console.error(err);
      failed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully inserted: ${inserted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total attempted: ${MOCK_PROPERTIES.length}\n`);

  if (inserted > 0) {
    console.log('✨ Done! Your database now has properties for AI search.\n');
    console.log('Next steps:');
    console.log('1. Restart your Expo dev server');
    console.log('2. Sign in to the app');
    console.log('3. Try AI search for "apartments in Harare"\n');
  }
}

seedProperties().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
