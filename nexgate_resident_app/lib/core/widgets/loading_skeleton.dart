import 'package:flutter/material.dart';

/// Shimmering-like pulsing skeleton container for loading states.
class LoadingSkeleton extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;
  final ShapeBorder? shape;

  const LoadingSkeleton({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
    this.shape,
  });

  const LoadingSkeleton.circle({
    super.key,
    required double size,
  })  : width = size,
        height = size,
        borderRadius = null,
        shape = const CircleBorder();

  @override
  State<LoadingSkeleton> createState() => _LoadingSkeletonState();
}

class _LoadingSkeletonState extends State<LoadingSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.35, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Color.lerp(
              const Color(0xFFE2E8F0),
              const Color(0xFFF1F5F9),
              _animation.value,
            ),
            borderRadius: widget.shape == null
                ? (widget.borderRadius ?? BorderRadius.circular(8))
                : null,
            shape: widget.shape is CircleBorder
                ? BoxShape.circle
                : BoxShape.rectangle,
          ),
        );
      },
    );
  }
}
