import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class ImageCompressService {
  static const MethodChannel _channel =
      MethodChannel('com.nexbuild.nexguard/image_compress');

  /// Compresses and downscales image via Android native hardware JPEG pipeline.
  /// Converts multi-megabyte photos to crisp ~30-50KB JPEGs in 10-20ms.
  static Future<String> compress(
    String path, {
    int maxWidth = 600,
    int quality = 70,
  }) async {
    try {
      if (path.isEmpty || path.startsWith('assets/')) return path;

      final file = File(path);
      if (!await file.exists()) return path;

      final size = await file.length();
      // Already small (under 90 KB), no need to compress further
      if (size <= 90 * 1024) return path;

      final result = await _channel.invokeMethod<String>('compressImage', {
        'path': path,
        'maxWidth': maxWidth,
        'quality': quality,
      });

      if (result != null && result.isNotEmpty) {
        final compressedFile = File(result);
        if (await compressedFile.exists()) {
          final compSize = await compressedFile.length();
          debugPrint(
              '[ImageCompressService] Compressed $size bytes -> $compSize bytes in $result');
          return result;
        }
      }
      return path;
    } catch (e) {
      debugPrint('[ImageCompressService] Compression bypass/fallback: $e');
      return path;
    }
  }
}

