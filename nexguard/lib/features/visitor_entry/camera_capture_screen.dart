import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/image_compress_service.dart';
import 'visitor_details_screen.dart';

/// Full-screen native-style camera screen for taking visitor photos.
/// Features full viewfinder, face guide, circular shutter button,
/// front/rear camera flip, flash control, and instant photo review.
class CameraCaptureScreen extends StatefulWidget {
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const CameraCaptureScreen({
    super.key,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen> {
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  int _selectedCameraIndex = 0;
  bool _isCameraInitialized = false;
  String? _capturedImagePath;
  bool _isProcessing = false;
  FlashMode _flashMode = FlashMode.off;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera([int cameraIndex = 0]) async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isNotEmpty) {
        final targetIndex = cameraIndex % _cameras.length;
        final oldController = _cameraController;
        if (oldController != null) {
          await oldController.dispose();
        }

        final controller = CameraController(
          _cameras[targetIndex],
          ResolutionPreset.high,
          enableAudio: false,
          imageFormatGroup: ImageFormatGroup.jpeg,
        );

        await controller.initialize();
        if (!mounted) {
          await controller.dispose();
          return;
        }

        // Strictly ensure torch / flash is turned OFF upon camera opening
        try {
          await controller.setFlashMode(FlashMode.off);
        } catch (_) {}

        setState(() {
          _cameraController = controller;
          _selectedCameraIndex = targetIndex;
          _isCameraInitialized = true;
          _flashMode = FlashMode.off;
        });
      } else {
        if (mounted) setState(() => _isCameraInitialized = false);
      }
    } catch (e) {
      debugPrint('Camera init error: $e');
      if (mounted) setState(() => _isCameraInitialized = false);
    }
  }

  @override
  void dispose() {
    try {
      _cameraController?.setFlashMode(FlashMode.off);
    } catch (_) {}
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2 || _isProcessing) return;
    final nextIndex = (_selectedCameraIndex + 1) % _cameras.length;
    await _initCamera(nextIndex);
  }

  Future<void> _toggleFlash() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }
    try {
      // Toggle strictly between Torch ON and Torch OFF
      final nextMode =
          _flashMode == FlashMode.torch ? FlashMode.off : FlashMode.torch;
      await _cameraController!.setFlashMode(nextMode);
      if (mounted) setState(() => _flashMode = nextMode);
    } catch (e) {
      debugPrint('Flash toggle error: $e');
    }
  }

  Future<void> _takePhoto() async {
    if (_isProcessing) return;

    if (_cameraController != null && _cameraController!.value.isInitialized) {
      try {
        setState(() => _isProcessing = true);
        final file = await _cameraController!.takePicture();
        final compressed = await ImageCompressService.compress(file.path);
        if (!mounted) return;
        setState(() {
          _capturedImagePath = compressed;
          _isProcessing = false;
        });
        return;
      } catch (e) {
        debugPrint('Error taking picture: $e');
      }
    }

    // Fallback using ImagePicker
    try {
      setState(() => _isProcessing = true);
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 70,
      );
      if (!mounted) return;
      if (photo != null) {
        final compressed = await ImageCompressService.compress(photo.path);
        setState(() {
          _capturedImagePath = compressed;
          _isProcessing = false;
        });
      } else {
        setState(() => _isProcessing = false);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _capturedImagePath = 'assets/images/guest_portrait.png';
        _isProcessing = false;
      });
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.gallery);
      if (photo != null && mounted) {
        setState(() => _capturedImagePath = photo.path);
      }
    } catch (e) {
      debugPrint('Gallery pick error: $e');
    }
  }

  void _retakePhoto() {
    setState(() => _capturedImagePath = null);
  }

  void _confirmAndProceed() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => VisitorDetailsScreen(
          photoPath: _capturedImagePath ?? 'assets/images/guest_portrait.png',
          visitorRepo: widget.visitorRepo,
          guardRepo: widget.guardRepo,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Live Camera Preview or Captured Review Image
          if (_capturedImagePath != null)
            _buildReviewImage(_capturedImagePath!)
          else
            _buildCameraViewfinder(),

          // 2. Face Alignment Guide (Only during live camera)
          if (_capturedImagePath == null && _isCameraInitialized)
            _buildFaceGuide(),

          // 3. Top Navigation & Flash Controls Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildTopBar(),
          ),

          // 4. Bottom Controls Bar (Shutter button or Review buttons)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _capturedImagePath != null
                ? _buildReviewBottomBar()
                : _buildShutterBottomBar(),
          ),
        ],
      ),
    );
  }

  Widget _buildCameraViewfinder() {
    if (_isCameraInitialized && _cameraController != null) {
      final size = MediaQuery.of(context).size;
      final deviceRatio = size.width / size.height;
      final cameraRatio = _cameraController!.value.aspectRatio;

      double scale = (1 / cameraRatio) / deviceRatio;
      if (scale < 1) scale = 1 / scale;

      return ClipRect(
        child: Transform.scale(
          scale: scale,
          child: Center(
            child: CameraPreview(_cameraController!),
          ),
        ),
      );
    }

    return _buildCameraPlaceholder();
  }

  Widget _buildCameraPlaceholder() {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.camera_alt_outlined,
                size: 40,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Camera Not Ready',
              style: TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Hardware camera is initializing or not available on this device.',
              style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 12,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _takePhoto,
                  icon: const Icon(Icons.photo_camera_rounded, size: 18),
                  label: const Text('Open System Camera'),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white38),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _pickFromGallery,
                  icon: const Icon(Icons.photo_library_rounded, size: 18),
                  label: const Text('Choose Photo'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewImage(String path) {
    if (path.startsWith('assets/')) {
      return Image.asset(path, fit: BoxFit.cover);
    }
    return Image.file(File(path), fit: BoxFit.cover);
  }

  Widget _buildFaceGuide() {
    return IgnorePointer(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 220,
              height: 280,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(110),
                border: Border.all(
                  color: Colors.white.withOpacity(0.45),
                  width: 2.0,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.55),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text(
                'Align visitor face within frame',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    final bool isReviewing = _capturedImagePath != null;

    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 8,
        16,
        12,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.black.withOpacity(0.75), Colors.transparent],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Flash toggle (or back icon during review)
          if (!isReviewing && _isCameraInitialized)
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _toggleFlash,
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white24, width: 1),
                  ),
                  child: Icon(
                    _flashMode == FlashMode.torch
                        ? Icons.flashlight_on_rounded
                        : Icons.flashlight_off_rounded,
                    color: _flashMode == FlashMode.torch
                        ? const Color(0xFFFBBF24)
                        : Colors.white,
                    size: 20,
                  ),
                ),
              ),
            )
          else
            const SizedBox(width: 44),

          // Center Title Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.45),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white24, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isReviewing ? Icons.check_circle_rounded : Icons.face_rounded,
                  color: isReviewing ? const Color(0xFF22C55E) : Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  isReviewing ? 'Photo Captured' : 'Take Visitor Photo',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),

          // Right: Close Button
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => Navigator.of(context).pop(),
              borderRadius: BorderRadius.circular(22),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.4),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24, width: 1),
                ),
                child: const Icon(
                  Icons.close_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShutterBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.transparent, Colors.black.withOpacity(0.85)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Gallery / Cancel button
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _pickFromGallery,
              borderRadius: BorderRadius.circular(25),
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24, width: 1),
                ),
                child: const Icon(
                  Icons.photo_library_outlined,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),

          // Center: Authentic Native Camera Shutter Button
          GestureDetector(
            onTap: _isProcessing ? null : _takePhoto,
            child: Container(
              width: 78,
              height: 78,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3.5),
              ),
              padding: const EdgeInsets.all(4),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: _isProcessing
                    ? const Center(
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      )
                    : null,
              ),
            ),
          ),

          // Right: Flip Camera Button (Front/Rear)
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _cameras.length > 1 ? _switchCamera : null,
              borderRadius: BorderRadius.circular(25),
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24, width: 1),
                ),
                child: const Icon(
                  Icons.flip_camera_ios_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        18,
        20,
        MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.transparent, Colors.black.withOpacity(0.9)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        children: [
          // Retake button
          Expanded(
            child: SizedBox(
              height: 54,
              child: OutlinedButton.icon(
                onPressed: _retakePhoto,
                icon: const Icon(Icons.replay_rounded, size: 20),
                label: const Text(
                  'RETAKE',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white70, width: 1.5),
                  backgroundColor: Colors.white.withOpacity(0.12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          // Confirm button
          Expanded(
            flex: 2,
            child: SizedBox(
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _confirmAndProceed,
                icon: const Icon(Icons.check_circle_rounded, size: 20),
                label: const Text(
                  'USE PHOTO',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: const Color(0xFF16A34A),
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
