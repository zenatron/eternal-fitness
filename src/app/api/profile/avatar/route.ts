import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Custom profile avatar: upload, serve and remove.
 *
 * The image is always re-encoded server-side rather than stored as uploaded.
 * That is deliberate — it is the only way to be sure what lands in the database
 * is actually an image, strips any EXIF (including GPS coordinates from a phone
 * camera), and bounds the stored size regardless of what was sent.
 *
 * Stored as base64 on the users row. At 256px lossy WebP that is ~10-20KB, so
 * it needs no volume, survives restarts, and is captured by a normal DB dump.
 */

/** Hard cap on the upload. Anything larger is rejected before decoding. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Output edge length. Displayed at 40-96px, so 256 covers 3x screens. */
const AVATAR_SIZE = 256;

/** WebP quality — visually clean at avatar size, roughly 12KB. */
const AVATAR_QUALITY = 80;

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('avatar');

    if (!(file instanceof File)) {
      return errorResponse('No image supplied', 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse('Image must be 10MB or smaller', 413);
    }
    // The declared type is a hint only; sharp below is the real gate.
    if (file.type && !ACCEPTED.includes(file.type)) {
      return errorResponse('Unsupported image format', 415);
    }

    const input = Buffer.from(await file.arrayBuffer());

    let output: Buffer;
    try {
      output = await sharp(input, { animated: false })
        .rotate() // apply EXIF orientation before stripping metadata
        .resize(AVATAR_SIZE, AVATAR_SIZE, {
          fit: 'cover',
          position: 'attention', // crop toward the most salient region — usually the face
        })
        .webp({ quality: AVATAR_QUALITY })
        .toBuffer();
    } catch {
      // Reaching here means the bytes were not a decodable image, whatever the
      // Content-Type claimed.
      return errorResponse('That file could not be read as an image', 400);
    }

    const encoded = `data:image/webp;base64,${output.toString('base64')}`;

    await db
      .update(users)
      .set({ avatarData: encoded, avatarUpdatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({
      data: {
        // Cache-busted so the <img> refreshes immediately after upload.
        url: `/api/profile/avatar?v=${Date.now()}`,
        bytes: output.length,
      },
    });
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return errorResponse('Could not save that image', 500);
  }
}

/** Serves the caller's stored avatar. */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const [row] = await db
      .select({ avatarData: users.avatarData, avatarUpdatedAt: users.avatarUpdatedAt })
      .from(users)
      .where(eq(users.id, userId));

    if (!row?.avatarData) return new NextResponse(null, { status: 404 });

    const base64 = row.avatarData.split(',')[1] ?? '';
    const bytes = Buffer.from(base64, 'base64');

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(bytes.length),
        // Private: this is per-user content behind auth, so it must never be
        // held by a shared cache. The ETag lets the browser revalidate cheaply.
        'Cache-Control': 'private, max-age=60, must-revalidate',
        ETag: `"${row.avatarUpdatedAt?.getTime() ?? 0}"`,
      },
    });
  } catch (error) {
    console.error('Avatar fetch failed:', error);
    return errorResponse('Could not load avatar', 500);
  }
}

/** Removes the custom avatar, falling back to the PocketID picture. */
export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    await db
      .update(users)
      .set({ avatarData: null, avatarUpdatedAt: null })
      .where(eq(users.id, userId));

    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    console.error('Avatar delete failed:', error);
    return errorResponse('Could not remove avatar', 500);
  }
}
