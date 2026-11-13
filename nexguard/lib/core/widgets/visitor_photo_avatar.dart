import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_colors.dart';
import '../../services/api_service.dart';

/// Standard, resilient visitor photo avatar for GreenGate Guard App.
/// Reliably resolves:
/// 1. Local Camera file paths (/data/user/0/... on device) - CHECKED FIRST!
/// 2. Cloudinary / Public HTTPS URLs
/// 3. Bundled asset paths (assets/images/...)
/// 4. Relative API endpoints (/api/visitor-requests/:id/photo) with safe redirect & Guard Bearer Auth
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

    // 2. Local device file path (Freshly captured camera photo on phone - MUST BE CHECKED BEFORE startsWith('/'))
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

    // 3. Direct HTTPS / HTTP URL (e.g. Cloudinary, Unsplash CDN)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return Image.network(
        trimmed,
        width: size,
        height: size,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(size),
      );
    }

    // 4. Relative API Path (e.g. /api/visitor-requests/REQ-.../photo)
    if (trimmed.startsWith('/api/') || trimmed.startsWith('api/') || trimmed.startsWith('/visitor-requests/')) {
      var apiEndpoint = trimmed;
      if (!apiEndpoint.startsWith('/')) {
        apiEndpoint = '/$apiEndpoint';
      }
      final baseHost = ApiService.baseUrl.replaceAll(RegExp(r'/api/?$'), '');
      final fullUrl = '$baseHost$apiEndpoint';

      return _AuthenticatedImage(
        url: fullUrl,
        size: size,
        fit: fit,
      );
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

/// Secure authenticated image loader that gracefully handles Cloudinary CDN redirects
/// without leaking Authorization headers to public CDN endpoints.
class _AuthenticatedImage extends StatefulWidget {
  final String url;
  final double? size;
  final BoxFit fit;

  const _AuthenticatedImage({
    required this.url,
    this.size,
    required this.fit,
  });

  @override
  State<_AuthenticatedImage> createState() => _AuthenticatedImageState();
}

class _AuthenticatedImageState extends State<_AuthenticatedImage> {
  static final Map<String, Uint8List> _imageCache = {};
  Uint8List? _bytes;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void didUpdateWidget(covariant _AuthenticatedImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    if (_imageCache.containsKey(widget.url)) {
      if (mounted) {
        setState(() {
          _bytes = _imageCache[widget.url];
          _isLoading = false;
        });
      }
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final token = await ApiService.ensureAuthToken();
      final client = http.Client();

      // Step 1: Follow manual redirect so Authorization header isn't leaked to Cloudinary CDN
      final request = http.Request('GET', Uri.parse(widget.url));
      request.followRedirects = false;
      if (token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      final response = await client.send(request).timeout(const Duration(seconds: 10));

      // Handle redirect (e.g. 301, 302, 307, 308 to Cloudinary CDN)
      if (response.statusCode == 301 ||
          response.statusCode == 302 ||
          response.statusCode == 303 ||
          response.statusCode == 307 ||
          response.statusCode == 308) {
        final location = response.headers['location'];
        if (location != null && location.isNotEmpty) {
          final cdnRes = await http.get(Uri.parse(location)).timeout(const Duration(seconds: 10));
          if (cdnRes.statusCode == 200) {
            _imageCache[widget.url] = cdnRes.bodyBytes;
            if (mounted) {
              setState(() {
                _bytes = cdnRes.bodyBytes;
                _isLoading = false;
              });
            }
            return;
          }
        }
      } else if (response.statusCode == 200) {
        final bytes = await response.stream.toBytes();
        _imageCache[widget.url] = bytes;
        if (mounted) {
          setState(() {
            _bytes = bytes;
            _isLoading = false;
          });
        }
        return;
      }

      // Fallback: direct GET
      final directRes = await http.get(
        Uri.parse(widget.url),
        headers: token.isNotEmpty ? {'Authorization': 'Bearer $token'} : null,
      ).timeout(const Duration(seconds: 10));

      if (directRes.statusCode == 200) {
        _imageCache[widget.url] = directRes.bodyBytes;
        if (mounted) {
          setState(() {
            _bytes = directRes.bodyBytes;
            _isLoading = false;
          });
        }
        return;
      }

      if (mounted) {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('[_AuthenticatedImage] Error loading photo from ${widget.url}: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_bytes != null) {
      return Image.memory(
        _bytes!,
        width: widget.size,
        height: widget.size,
        fit: widget.fit,
        errorBuilder: (_, __, ___) => VisitorPhotoAvatar._buildFallback(widget.size),
      );
    }

    if (_isLoading) {
      return Container(
        width: widget.size,
        height: widget.size,
        color: const Color(0xFFF1F5F9),
        alignment: Alignment.center,
        child: SizedBox(
          width: (widget.size != null && widget.size! > 40) ? 20 : 12,
          height: (widget.size != null && widget.size! > 40) ? 20 : 12,
          child: const CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      );
    }

    return VisitorPhotoAvatar._buildFallback(widget.size);
  }
}