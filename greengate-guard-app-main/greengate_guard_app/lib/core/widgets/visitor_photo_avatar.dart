import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';

/// Standard, resilient visitor photo avatar for GreenGate Guard App.
/// Reliably resolves:
/// 1. Cloudinary / Public HTTPS URLs
/// 2. Relative API endpoints (/api/visitor-requests/:id/photo) with Guard Bearer Auth
/// 3. Local Camera file paths (/data/user/0/... on device)
/// 4. Bundled asset paths (assets/images/...)
/// 5. Graceful fallback for empty or error states
class VisitorPhotoAvatar extends StatelessWidget {
  final String? photoPath;
  final double size;
  final double borderRadius;
  final BoxFit fit;

  const VisitorPhotoAvatar({
    super.key,
    required this.photoPath,
    this.size = 48,
    this.borderRadius = 12,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: size,
        height: size,
        child: buildImageWidget(
          photoPath,
          size: size,
          fit: fit,
        ),
      ),
    );
  }

  /// Static helper widget builder used across all guard screens
  static Widget buildImageWidget(
    String? path, {
    double? size,
    BoxFit fit = BoxFit.cover,
  }) {
    if (path == null || path.trim().isEmpty) {
      return _buildFallback(size);
    }

    final trimmed = path.trim();

    // 1. Asset path
    if (trimmed.startsWith('assets/')) {
      return Image.asset(
        trimmed,
        width: size,
        height: size,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(size),
      );
    }

    // 2. Direct HTTPS / HTTP URL (e.g. Cloudinary, Unsplash CDN)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return Image.network(
        trimmed,
        width: size,
        height: size,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(size),
      );
    }

    // 3. Relative API Path (e.g. /api/visitor-requests/REQ-.../photo)
    if (trimmed.startsWith('/')) {
      final baseHost = ApiService.baseUrl.replaceAll(RegExp(r'/api$'), '');
      final fullUrl = '$baseHost$trimmed';
      final headers = ApiService.authToken.isNotEmpty
          ? {'Authorization': 'Bearer ${ApiService.authToken}'}
          : null;

      return Image.network(
        fullUrl,
        headers: headers,
        width: size,
        height: size,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(size),
      );
    }

    // 4. Local device file path (e.g. freshly taken camera photo)
    if (!kIsWeb) {
      try {
        final file = File(trimmed);
        if (file.existsSync()) {
          return Image.file(
            file,
            width: size,
            height: size,
            fit: fit,
            errorBuilder: (_, __, ___) => _buildFallback(size),
          );
        }
      } catch (_) {}
    }

    return _buildFallback(size);
  }

  static Widget _buildFallback(double? size) {
    final iconSize = (size != null && size > 0) ? size * 0.55 : 28.0;
    return Container(
      width: size,
      height: size,
      color: const Color(0xFFF1F5F9),
      alignment: Alignment.center,
      child: Icon(
        Icons.person_rounded,
        size: iconSize,
        color: const Color(0xFF94A3B8),
      ),
    );
  }
}
