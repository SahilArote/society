import 'dart:io';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/safe_image.dart';
import 'visitor_details_screen.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';

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
  bool _isCameraInitialized = false;
  String? _capturedImagePath;
  Uint8List? _capturedImageBytes;
  bool _isProcessing = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isNotEmpty) {
        _cameraController = CameraController(
          _cameras.first,
          ResolutionPreset.medium,
          enableAudio: false,
        );
        await _cameraController!.initialize();
        if (mounted) {
          setState(() => _isCameraInitialized = true);
        }
      }
    } catch (e) {
      debugPrint('Camera init error: $e');
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    if (_isProcessing) return;

    if (_cameraController != null && _cameraController!.value.isInitialized) {
      try {
        setState(() => _isProcessing = true);
        final file = await _cameraController!.takePicture();
        Uint8List? bytes;
        try {
          bytes = await file.readAsBytes();
        } catch (e) {
          debugPrint('Error reading picture bytes: $e');
        }
        if (bytes == null || bytes.isEmpty) {
          try {
            final byteData = await rootBundle.load('assets/images/guest_portrait.png');
            bytes = byteData.buffer.asUint8List();
          } catch (_) {}
        }
        setState(() {
          _capturedImagePath = file.path;
          _capturedImageBytes = bytes;
          _isProcessing = false;
        });
        return;
      } catch (e) {
        debugPrint('Error taking picture: $e');
      }
    }

    // Fallback: Use ImagePicker
    try {
      setState(() => _isProcessing = true);
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
      if (photo != null) {
        Uint8List? bytes;
        try {
          bytes = await photo.readAsBytes();
        } catch (_) {}
        if (bytes == null || bytes.isEmpty) {
          try {
            final byteData = await rootBundle.load('assets/images/guest_portrait.png');
            bytes = byteData.buffer.asUint8List();
          } catch (_) {}
        }
        setState(() {
          _capturedImagePath = photo.path;
          _capturedImageBytes = bytes;
          _isProcessing = false;
        });
      } else {
        setState(() => _isProcessing = false);
      }
    } catch (_) {
      Uint8List? fallbackBytes;
      try {
        final byteData = await rootBundle.load('assets/images/guest_portrait.png');
        fallbackBytes = byteData.buffer.asUint8List();
      } catch (_) {}
      setState(() {
        _capturedImagePath = 'assets/images/guest_portrait.png';
        _capturedImageBytes = fallbackBytes;
        _isProcessing = false;
      });
    }
  }

  void _retakePhoto() {
    setState(() {
      _capturedImagePath = null;
      _capturedImageBytes = null;
    });
  }

  void _confirmAndProceed() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => VisitorDetailsScreen(
          photoPath: _capturedImagePath ?? 'assets/images/guest_portrait.png',
          photoBytes: _capturedImageBytes,
          visitorRepo: widget.visitorRepo,
          guardRepo: widget.guardRepo,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Take Visitor Photo'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 26),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // Clean Instruction Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedMd,
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primary, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _capturedImagePath == null
                            ? 'Point camera at visitor face and tap TAKE PHOTO'
                            : 'Review photo. Tap Confirm Photo to proceed.',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Camera Preview Frame
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: AppDimensions.roundedXl,
                    border: Border.all(color: AppColors.border, width: 2.0),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      if (_capturedImagePath != null)
                        _buildPreviewImage(_capturedImagePath!)
                      else if (_isCameraInitialized && _cameraController != null)
                        CameraPreview(_cameraController!)
                      else
                        _buildPlaceholderPreview(),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Operational Action Buttons (Large, high contrast, 60px minimum)
              if (_capturedImagePath == null) ...[
                CustomButton(
                  text: 'TAKE PHOTO',
                  icon: Icons.camera_alt,
                  height: 64,
                  isLoading: _isProcessing,
                  onPressed: _takePhoto,
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      child: CustomButton(
                        text: 'RETAKE',
                        icon: Icons.replay,
                        variant: CustomButtonVariant.outline,
                        height: 60,
                        onPressed: _retakePhoto,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: CustomButton(
                        text: 'CONFIRM PHOTO',
                        icon: Icons.check,
                        variant: CustomButtonVariant.primary,
                        height: 60,
                        onPressed: _confirmAndProceed,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewImage(String path) {
    return SafeImage(
      path: path,
      bytes: _capturedImageBytes,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
    );
  }

  Widget _buildPlaceholderPreview() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.camera_front, size: 72, color: Colors.white70),
        const SizedBox(height: 16),
        const Text(
          'Gate Camera Active',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        const Text(
          'Tap TAKE PHOTO below',
          style: TextStyle(color: Colors.white70, fontSize: 14),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white24,
            foregroundColor: Colors.white,
          ),
          onPressed: () => setState(() => _capturedImagePath = 'assets/images/guest_portrait.png'),
          icon: const Icon(Icons.image, size: 18),
          label: const Text('Use Sample Image'),
        ),
      ],
    );
  }
}
