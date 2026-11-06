/**
 * Quick diagnostic script to check properties in Supabase
 * Run this with: npx ts-node scripts/check-db-properties.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load from environment
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function checkProperties() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in environment');
    console.log('Make sure .env.local has:');
    console.log('  EXPO_PUBLIC_SUPABASE_URL=...');
    console.log('  EXPO_PUBLIC_SUPABASE_ANON_KEY=...');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Checking Supabase properties...\n');

  // Check total count
  const { count: totalCount, error: countError } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('available', true);

  if (countError) {
    console.error('❌ Error fetching count:', countError.message);
    process.exit(1);
  }

  console.log(`📊 Total available properties: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('⚠️  No properties found in database!');
    console.log('   This is why AI search returns no results.\n');
    console.log('💡 Solutions:');
    console.log('   1. Add properties via the app (as landlord)');
    console.log('   2. Import data directly into Supabase');
    console.log('   3. Use mock data for testing (sign out of app)\n');
    process.exit(0);
  }

  // Check by city
  console.log('📍 Properties by city:\n');
  const { data: cities, error: citiesError } = await supabase.rpc('get_property_counts_by_city');

  if (citiesError) {
    // Fallback: fetch all and group manually
    const { data: allProps, error: fetchError } = await supabase
      .from('properties')
      .select('city')
      .eq('available', true);

    if (fetchError) {
      console.error('❌ Error fetching cities:', fetchError.message);
    } else if (allProps) {
      const cityMap: Record<string, number> = {};
      allProps.forEach((p) => {
        cityMap[p.city] = (cityMap[p.city] || 0) + 1;
      });

      Object.entries(cityMap)
        .sort(([, a], [, b]) => b - a)
        .forEach(([city, count]) => {
          console.log(`   ${city}: ${count} properties`);
        });
    }
  } else {
    cities?.forEach((c: { city: string; count: number }) => {
      console.log(`   ${c.city}: ${c.count} properties`);
    });
  }

  // Check Harare specifically
  console.log('\n🏠 Harare properties:\n');
  const { data: harareProps, error: harareError } = await supabase
    .from('properties')
    .select('id, title, city, suburb, price, bedrooms, property_type')
    .eq('available', true)
    .ilike('city', '%harare%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (harareError) {
    console.error('❌ Error fetching Harare properties:', harareError.message);
  } else if (harareProps && harareProps.length > 0) {
    harareProps.forEach((p) => {
      console.log(`   • ${p.title}`);
      console.log(`     ${p.property_type} in ${p.suburb}, ${p.city}`);
      console.log(`     $${p.price}/mo, ${p.bedrooms} beds`);
      console.log(`     ID: ${p.id}\n`);
    });
  } else {
    console.log('   ❌ No Harare properties found!');
    console.log('   This is why AI search for Harare returns no results.\n');
  }

  // Check recent properties
  console.log('🕐 Most recent properties:\n');
  const { data: recent, error: recentError } = await supabase
    .from('properties')
    .select('title, city, suburb, price, created_at')
    .eq('available', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('❌ Error fetching recent properties:', recentError.message);
  } else if (recent) {
    recent.forEach((p) => {
      console.log(`   • ${p.title} - ${p.city}, ${p.suburb}`);
      console.log(`     $${p.price}/mo - ${new Date(p.created_at).toLocaleDateString()}\n`);
    });
  }

  console.log('✅ Check complete!\n');
}

checkProperties().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
