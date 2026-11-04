/**
 * ImbaFind — Supabase Data Access Layer
 *
 * All database calls go through this module and its submodules under ./db
 * so the rest of the app never imports supabase directly (easier to test/mock).
 */

export * from './db';
