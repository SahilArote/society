import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class SafeImage extends StatelessWidget {
  final String? path;
  final Uint8List? bytes;
  final BoxFit fit;
  final double? width;
  final double? height;
  final String fallbackAsset;

  const SafeImage({
    super.key,
    this.path,
    this.bytes,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.fallbackAsset = 'assets/images/guest_portrait.png',
  });

  @override
  Widget build(BuildContext context) {
    if (bytes != null && bytes!.isNotEmpty) {
      return Image.memory(
        bytes!,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    }

    final p = path?.trim() ?? '';
    if (p.isEmpty) return _fallback();

    if (p.startsWith('assets/')) {
      return Image.asset(
        p,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    }

    if (kIsWeb || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('blob:')) {
      return Image.network(
        p,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    }

    try {
      return Image.file(
        File(p),
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (_, __, ___) => _fallback(),
      );
    } catch (_) {
      return _fallback();
    }
  }

  Widget _fallback() {
    return Image.asset(
      fallbackAsset,
      fit: fit,
      width: width,
      height: height,
    );
  }
}
