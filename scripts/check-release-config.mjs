#!/usr/bin/env node
/**
 * Pre-deploy guard for the web build.
 *
 * The App Links / Universal Links files in `public/.well-known/` ship with
 * placeholder values, and a stale or missing `dist/` silently deploys an old
 * app. This script fails the deploy instead of publishing a broken build.
 *
 * Run directly:
 *   npm run check:release
 *
 * It runs automatically before `npm run deploy:web` via the `predeploy:web`
 * npm lifecycle hook.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const assetLinksPath = 'public/.well-known/assetlinks.json';
const aasaPath = 'public/.well-known/apple-app-site-association';

// 1. Android App Links: real SHA-256 signing certificates, not placeholders.
if (!exists(assetLinksPath)) {
  failures.push(`${assetLinksPath} is missing.`);
} else {
  const assetLinksText = read(assetLinksPath);
  if (assetLinksText.includes('REPLACE_WITH')) {
    failures.push(
      `${assetLinksPath} still contains REPLACE_WITH placeholders. Add the EAS and Play App Signing SHA-256 fingerprints.`,
    );
  } else {
    let assetLinks;
    try {
      assetLinks = JSON.parse(assetLinksText);
    } catch {
      failures.push(`${assetLinksPath} is not valid JSON.`);
    }
    const fingerprints =
      assetLinks?.[0]?.target?.sha256_cert_fingerprints?.filter(
        (value) => typeof value === 'string' && /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/.test(value),
      ) ?? [];
    if (fingerprints.length === 0) {
      failures.push(
        `${assetLinksPath} has no valid SHA-256 fingerprint. Expected colon-separated hex pairs.`,
      );
    }
  }
}

// 2. iOS Universal Links: a real 10-character Apple Team ID.
if (!exists(aasaPath)) {
  failures.push(`${aasaPath} is missing.`);
} else {
  const aasaText = read(aasaPath);
  if (aasaText.includes('REPLACE_WITH')) {
    failures.push(`${aasaPath} still contains REPLACE_WITH placeholders. Add your Apple Team ID.`);
  } else {
    let aasa;
    try {
      aasa = JSON.parse(aasaText);
    } catch {
      failures.push(`${aasaPath} is not valid JSON.`);
    }
    const appIds = aasa?.applinks?.details?.map((detail) => detail.appID) ?? [];
    if (!appIds.some((appId) => /^[A-Z0-9]{10}\.com\.imbafind\.app$/.test(appId))) {
      failures.push(`${aasaPath} has no appID matching <10-character-team-id>.com.imbafind.app.`);
    }
  }
}

// 3. Firebase project mismatch: .firebaserc and google-services.json must agree.
//    This is a warning because Hosting can legitimately live in a different
//    Firebase project from the Android app.
if (exists('.firebaserc') && exists('google-services.json')) {
  try {
    const firebaserc = readJson('.firebaserc');
    const googleServices = readJson('google-services.json');
    const hostingProject = firebaserc?.projects?.default;
    const androidProject = googleServices?.project_info?.project_id;
    if (hostingProject && androidProject && hostingProject !== androidProject) {
      warnings.push(
        `Firebase project mismatch: .firebaserc points at "${hostingProject}" but google-services.json belongs to "${androidProject}". Confirm which project owns https://imbafind.web.app before deploying.`,
      );
    }
  } catch {
    warnings.push('Could not read .firebaserc or google-services.json to compare project IDs.');
  }
}

// 4. EAS rejects empty-string values under build.<profile>.env, which makes
//    commands such as `eas credentials` fail before they even start.
if (exists('eas.json')) {
  try {
    const eas = readJson('eas.json');
    for (const [profileName, profile] of Object.entries(eas?.build ?? {})) {
      for (const [key, value] of Object.entries(profile?.env ?? {})) {
        if (value === '') {
          failures.push(
            `eas.json build.${profileName}.env.${key} is an empty string, which EAS rejects. Remove the key instead.`,
          );
        }
      }
    }
  } catch {
    failures.push('eas.json is not valid JSON.');
  }
}

// 5. The hosting directory must exist and contain the exported entry point.
if (!exists('dist')) {
  failures.push('dist/ is missing. Run `npm run export:web` before deploying.');
} else if (!exists('dist/index.html')) {
  failures.push('dist/index.html is missing. Run `npm run export:web` before deploying.');
}

// 6. Firebase Hosting rewrites every unmatched request to index.html; the
//    well-known files must be copied into the export for App Links to work.
if (exists('dist') && !exists('dist/.well-known/assetlinks.json')) {
  failures.push(
    'dist/.well-known/assetlinks.json is missing. Run `npm run export:web` again so public/.well-known is copied into the build.',
  );
}

// 7. Cloud Android builds need google-services.json, which is gitignored.
if (!exists('google-services.json')) {
  warnings.push(
    'google-services.json is not present. Local Android builds cannot register for push; EAS cloud builds must provide it through a GOOGLE_SERVICES_JSON file environment variable.',
  );
}

for (const warning of warnings) {
  console.warn(`[release-check] warning: ${warning}`);
}

if (failures.length > 0) {
  console.error('\n[release-check] Refusing to deploy:');
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error('\nSee docs/deep-linking-setup.md and README.md for the required values.\n');
  process.exit(1);
}

console.log('[release-check] Release configuration looks ready.');
