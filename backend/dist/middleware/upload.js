"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVisitorPhoto = exports.FileValidationError = void 0;
exports.isValidImageBuffer = isValidImageBuffer;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Memory storage for direct streaming to Cloudinary or Vault
const storage = multer_1.default.memoryStorage();
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);
const ALLOWED_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
]);
const GENERIC_MIME_TYPES = new Set([
    'application/octet-stream',
    'application/binary',
    'binary/octet-stream',
    '',
]);
class FileValidationError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.name = 'FileValidationError';
        this.code = code;
        this.status = status;
    }
}
exports.FileValidationError = FileValidationError;
/**
 * Validates image buffer headers (magic bytes) to ensure file authenticity
 */
function isValidImageBuffer(buffer) {
    if (!buffer || buffer.length < 4)
        return false;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return true;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
        return true;
    // WebP: RIFF .... WEBP
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return true;
    }
    // HEIC / HEIF / ISO Media: offset 4 ftyp
    if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
        return true;
    }
    return false;
}
exports.uploadVisitorPhoto = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB maximum production limit
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        // 1. Explicit match against recognized image MIME types
        if (ALLOWED_MIME_TYPES.has(mime)) {
            return cb(null, true);
        }
        // 2. Fallback for mobile / Android camera streams sending generic MIME types
        if (GENERIC_MIME_TYPES.has(mime) || mime.startsWith('image/')) {
            if (ALLOWED_EXTENSIONS.has(ext)) {
                return cb(null, true);
            }
        }
        // 3. Fallback: if filename extension is a known image format
        if (ALLOWED_EXTENSIONS.has(ext)) {
            return cb(null, true);
        }
        // 4. Reject genuinely invalid files
        return cb(new FileValidationError('INVALID_FILE_TYPE', 'Invalid file type. Only JPG, JPEG, PNG, WebP, and HEIC images are allowed.'));
    },
});
