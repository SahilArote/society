import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/family_member_model.dart';
import '../../services/api_service.dart';
import 'add_family_member_screen.dart';

/// Screen listing registered household family members.
class FamilyMembersScreen extends StatefulWidget {
  const FamilyMembersScreen({super.key});

  @override
  State<FamilyMembersScreen> createState() => _FamilyMembersScreenState();
}

class _FamilyMembersScreenState extends State<FamilyMembersScreen> {
  List<FamilyMemberModel> _members = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFamily();
  }

  Future<void> _loadFamily() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.fetchFamilyMembers();
      if (!mounted) return;
      setState(() {
        _members = list;
      });
    } catch (e) {
      debugPrint('[Family] Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleDelete(FamilyMemberModel member) async {
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Remove Family Member',
      message: 'Are you sure you want to remove ${member.name} from your household registry?',
      confirmLabel: 'Remove',
      isDestructive: true,
      icon: Icons.person_remove_rounded,
    );

    if (confirmed == true) {
      try {
        await ApiService.deleteFamilyMember(member.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${member.name} removed successfully')),
        );
        _loadFamily();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to remove: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: 'Family Members',
        subtitle: _isLoading ? 'Loading...' : '${_members.length} registered',
        showBack: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadFamily,
          color: AppColors.primaryBlue,
          child: _isLoading
              ? ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: 3,
                  separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                  itemBuilder: (ctx, index) => LoadingSkeleton(
                    width: double.infinity,
                    height: 70,
                    borderRadius: AppDimensions.roundedLarge,
                  ),
                )
              : _members.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 60),
                        EmptyStateWidget(
                          icon: Icons.family_restroom_rounded,
                          title: 'No Family Members',
                          description:
                              'Add your spouse, parents, or children to give them gate access.',
                          buttonLabel: 'Add Member',
                          onButtonPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const AddFamilyMemberScreen(),
                              ),
                            ).then((_) => _loadFamily());
                          },
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      itemCount: _members.length,
                      separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final m = _members[index];
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: AppDimensions.roundedLarge,
                            border: Border.all(color: AppColors.border),
                            boxShadow: AppDimensions.subtleShadow,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: AppColors.lightPurple,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    m.name.isNotEmpty ? m.name[0].toUpperCase() : 'M',
                                    style: AppTypography.titleMedium.copyWith(
                                      color: AppColors.deepPurple,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m.name,
                                      style: AppTypography.bodyLarge.copyWith(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      m.relationship.toUpperCase(),
                                      style: AppTypography.caption.copyWith(
                                        color: AppColors.primaryBlue,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    if (m.phone != null && m.phone!.isNotEmpty) ...[
                                      const SizedBox(height: 1),
                                      Text(
                                        m.phone!,
                                        style: AppTypography.caption.copyWith(
                                          color: AppColors.secondaryText,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded,
                                    color: AppColors.secondaryText, size: 20),
                                onPressed: () => _handleDelete(m),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Member', style: TextStyle(fontWeight: FontWeight.w700)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AddFamilyMemberScreen()),
          ).then((_) => _loadFamily());
        },
      ),
    );
  }
}
