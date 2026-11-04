#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// 1. Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
let anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...vals] = trimmed.split('=');
    const val = vals.join('=').trim();
    if (key.trim() === 'EXPO_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if (key.trim() === 'EXPO_PUBLIC_SUPABASE_ANON_KEY' && !anonKey) anonKey = val;
  }
}

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

console.log('====================================================');
console.log('Testing Supabase Connection for ImbaFind');
console.log('Project URL:', supabaseUrl);
console.log('Anon Key Present:', anonKey.slice(0, 15) + '...' + anonKey.slice(-6));
console.log('====================================================\n');

async function testConnection() {
  const results = [];

  // Check 1: Auth Health
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    const data = await res.json().catch(() => null);
    results.push({
      test: 'Auth Service (/auth/v1/health)',
      status: res.ok ? '✅ OK' : `⚠️ Status ${res.status}`,
      details: data ? JSON.stringify(data) : `HTTP ${res.status}`,
    });
  } catch (err) {
    results.push({ test: 'Auth Service', status: '❌ Failed', details: err.message });
  }

  // Check 2: REST API - Properties Table
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/properties?select=id,title,city,price,available&limit=3`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      results.push({
        test: 'Database Table: properties',
        status: '✅ OK',
        details: `Found ${data.length} sample property rows (e.g. "${data[0]?.title || 'None'}" in ${data[0]?.city || 'N/A'})`,
      });
    } else {
      const text = await res.text();
      results.push({
        test: 'Database Table: properties',
        status: `❌ HTTP ${res.status}`,
        details: text.slice(0, 100),
      });
    }
  } catch (err) {
    results.push({ test: 'Database Table: properties', status: '❌ Failed', details: err.message });
  }

  // Check 3: REST API - Profiles Table
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,role&limit=2`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      results.push({
        test: 'Database Table: profiles (RLS Protected)',
        status: '✅ OK',
        details: `Accessible under RLS (${data.length} rows returned)`,
      });
    } else {
      const text = await res.text();
      results.push({
        test: 'Database Table: profiles',
        status: `⚠️ HTTP ${res.status}`,
        details: text.slice(0, 100),
      });
    }
  } catch (err) {
    results.push({ test: 'Database Table: profiles', status: '❌ Failed', details: err.message });
  }

  // Check 4: Storage Buckets
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const bucketNames = Array.isArray(data) ? data.map(b => b.name).join(', ') : 'None';
      results.push({
        test: 'Storage Buckets (/storage/v1/bucket)',
        status: '✅ OK',
        details: `Buckets: ${bucketNames || 'None created yet'}`,
      });
    } else {
      results.push({
        test: 'Storage Buckets',
        status: `⚠️ HTTP ${res.status}`,
        details: `Status ${res.status}`,
      });
    }
  } catch (err) {
    results.push({ test: 'Storage Buckets', status: '❌ Failed', details: err.message });
  }

  // Check 5: Edge Function: ai-search
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ query: 'cottage in avondale under $500' }),
    });
    if (res.ok) {
      const data = await res.json();
      results.push({
        test: 'Edge Function: ai-search',
        status: '✅ OK',
        details: `Model responded with summary: "${data?.summary || 'Valid JSON'}" (Fallback: ${data?.fallback ?? false})`,
      });
    } else {
      const text = await res.text();
      results.push({
        test: 'Edge Function: ai-search',
        status: `⚠️ HTTP ${res.status}`,
        details: text.slice(0, 120),
      });
    }
  } catch (err) {
    results.push({ test: 'Edge Function: ai-search', status: '❌ Failed', details: err.message });
  }

  // Print Summary Table
  console.log('RESULTS:');
  for (const r of results) {
    console.log(`${r.status.padEnd(8)} | ${r.test.padEnd(40)} | ${r.details}`);
  }
  console.log('\n====================================================');
}

testConnection();
