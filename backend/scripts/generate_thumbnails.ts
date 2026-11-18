/**
 * ONE-TIME BACKFILL SCRIPT: generate_thumbnails.ts
 *
 * Generates 200x200 JPEG thumbnails for all existing visitor photos
 * that have no thumb_url yet, and updates the MySQL database.
 *
 * Run with:
 *   npx ts-node scripts/generate_thumbnails.ts
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
import { getMysqlPool } from '../src/database/mysql';

dotenv.config();

const THUMBS_DIR = path.resolve(process.cwd(), 'uploads/thumbs');

// Ensure thumbs directory exists
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  console.log(`[Backfill] Created directory: ${THUMBS_DIR}`);
}

/** Fetch a remote URL as a Buffer */
function fetchRemoteBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** Generate a 200x200 thumbnail from a buffer */
async function makeThumbnail(imageBuffer: Buffer, destPath: string): Promise<void> {
  await sharp(imageBuffer)
    .resize(200, 200, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 70 })
    .toFile(destPath);
}

async function run() {
  const pool = await getMysqlPool();
  if (!pool) {
    console.error('[Backfill] ❌ Could not connect to MySQL. Set DATABASE_URL or MYSQL_* env vars.');
    process.exit(1);
  }

  // Find all visitors with a photo_url but no thumb_url
  const [rows]: any = await pool.query(
    `SELECT id, photo_url, photo_key FROM visitors WHERE photo_url IS NOT NULL AND (thumb_url IS NULL OR thumb_url = '')`
  );

  console.log(`[Backfill] Found ${rows.length} visitor(s) needing thumbnails.`);

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const visitorId: string = row.id;
    const photoUrl: string = row.photo_url;
    const thumbFilename = `thumb_${visitorId}.jpg`;
    const thumbDest = path.join(THUMBS_DIR, thumbFilename);
    const thumbUrlRelative = `/uploads/thumbs/${thumbFilename}`;

    try {
      let imageBuffer: Buffer;

      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        // Remote photo (Cloudinary or other CDN)
        imageBuffer = await fetchRemoteBuffer(photoUrl);
      } else if (fs.existsSync(photoUrl)) {
        // Local file on disk
        imageBuffer = fs.readFileSync(photoUrl);
      } else {
        console.warn(`[Backfill] ⚠  Skipping ${visitorId}: photo file not found at "${photoUrl}"`);
        failed++;
        continue;
      }

      await makeThumbnail(imageBuffer, thumbDest);

      await pool.query(
        `UPDATE visitors SET thumb_url = ? WHERE id = ?`,
        [thumbUrlRelative, visitorId]
      );

      console.log(`[Backfill] ✅ ${visitorId} → ${thumbUrlRelative}`);
      success++;
    } catch (err: any) {
      console.error(`[Backfill] ❌ ${visitorId}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[Backfill] Done. ✅ ${success} thumbnails generated, ❌ ${failed} failed.`);
  await pool.end?.();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
