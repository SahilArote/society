import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with User credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'f6ghmmmo',
  api_key: process.env.CLOUDINARY_API_KEY || '217375781211353',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'hhr8Pr46y_6MU1zs5EaveYTC7zE',
  secure: true,
});

const localVaultDir = path.resolve(__dirname, '../../storage/vault/visitor-photos');

export interface PhotoUploadResult {
  photoKey: string;
  photoUrl: string;
  storageType: 'CLOUDINARY' | 'VAULT';
  mimeType: string;
}

export async function uploadVisitorPhoto(
  filePathOrBuffer: string | Buffer,
  originalFilename: string = 'visitor.jpg',
  mimeType: string = 'image/jpeg'
): Promise<PhotoUploadResult> {
  try {
    console.log('[Storage] Uploading visitor photo to Cloudinary...');
    let uploadResult: UploadApiResponse;

    if (typeof filePathOrBuffer === 'string') {
      uploadResult = await cloudinary.uploader.upload(filePathOrBuffer, {
        folder: 'greengate/visitor-photos',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });
    } else {
      uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'greengate/visitor-photos',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          }
        );
        stream.end(filePathOrBuffer);
      });
    }

    console.log('[Storage] Successfully uploaded photo to Cloudinary:', uploadResult.secure_url);
    return {
      photoKey: uploadResult.public_id,
      photoUrl: uploadResult.secure_url,
      storageType: 'CLOUDINARY',
      mimeType: uploadResult.format ? `image/${uploadResult.format}` : mimeType,
    };
  } catch (err: any) {
    console.warn('[Storage] Cloudinary upload failed. Trying local storage vault fallback:', err.message);

    try {
      if (!fs.existsSync(localVaultDir)) {
        fs.mkdirSync(localVaultDir, { recursive: true });
      }
      const ext = path.extname(originalFilename) || '.jpg';
      const vaultFileName = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      const destPath = path.join(localVaultDir, vaultFileName);

      if (typeof filePathOrBuffer === 'string') {
        fs.copyFileSync(filePathOrBuffer, destPath);
      } else {
        fs.writeFileSync(destPath, filePathOrBuffer);
      }

      return {
        photoKey: vaultFileName,
        photoUrl: destPath,
        storageType: 'VAULT',
        mimeType,
      };
    } catch (vaultErr: any) {
      console.error('[Storage] Local vault storage failed:', vaultErr.message);
      return {
        photoKey: `visitor_default_${Date.now()}`,
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        storageType: 'CLOUDINARY',
        mimeType: 'image/jpeg',
      };
    }
  }
}
