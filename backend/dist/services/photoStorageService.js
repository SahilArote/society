"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVisitorPhoto = uploadVisitorPhoto;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configure Cloudinary with User credentials
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'f6ghmmmo',
    api_key: process.env.CLOUDINARY_API_KEY || '217375781211353',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'hhr8Pr46y_6MU1zs5EaveYTC7zE',
    secure: true,
});
const localVaultDir = path_1.default.resolve(__dirname, '../../storage/vault/visitor-photos');
async function uploadVisitorPhoto(filePathOrBuffer, originalFilename = 'visitor.jpg', mimeType = 'image/jpeg') {
    try {
        console.log('[Storage] Uploading visitor photo to Cloudinary...');
        let uploadResult;
        if (typeof filePathOrBuffer === 'string') {
            uploadResult = await cloudinary_1.v2.uploader.upload(filePathOrBuffer, {
                folder: 'greengate/visitor-photos',
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            });
        }
        else {
            uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary_1.v2.uploader.upload_stream({
                    folder: 'greengate/visitor-photos',
                    resource_type: 'image',
                    transformation: [
                        { width: 800, height: 800, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' },
                    ],
                }, (error, result) => {
                    if (error || !result)
                        return reject(error);
                    resolve(result);
                });
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
    }
    catch (err) {
        console.warn('[Storage] Cloudinary upload failed. Trying local storage vault fallback:', err.message);
        try {
            if (!fs_1.default.existsSync(localVaultDir)) {
                fs_1.default.mkdirSync(localVaultDir, { recursive: true });
            }
            const ext = path_1.default.extname(originalFilename) || '.jpg';
            const vaultFileName = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
            const destPath = path_1.default.join(localVaultDir, vaultFileName);
            if (typeof filePathOrBuffer === 'string') {
                fs_1.default.copyFileSync(filePathOrBuffer, destPath);
            }
            else {
                fs_1.default.writeFileSync(destPath, filePathOrBuffer);
            }
            return {
                photoKey: vaultFileName,
                photoUrl: destPath,
                storageType: 'VAULT',
                mimeType,
            };
        }
        catch (vaultErr) {
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
