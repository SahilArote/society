import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/flat.dart';
import '../models/resident.dart';
import '../models/visitor.dart';
import '../models/visitor_request.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

class VisitorRepository extends ChangeNotifier {
  final StorageService _storage;
  Timer? _pollingTimer;

  List<VisitorRequest> _requests = [];
  Set<String> _completedEntryIds = {};
  Set<String> _exitedEntryIds = {};
  final Set<String> _guardApprovedIds = {};
  final Set<String> _guardRejectedIds = {};

  VisitorRepository(this._storage) {
    _loadRequests();
    fetchDirectoryFromBackend();
    _startStatusPolling();
    // Immediate initial sync from backend
    _pollBackendStatus();
  }

  void _startStatusPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _pollBackendStatus();
    });
  }

  Future<void> fetchRecentRequests() => _pollBackendStatus();

  Future<void> _pollBackendStatus() async {
    final apiData = await ApiService.fetchVisitorRequests();
    if (apiData == null || apiData.isEmpty) return;

    bool updated = false;
    for (var item in apiData) {
      if (item is! Map) continue;
      final map = Map<String, dynamic>.from(item);
      final String? id = map['id']?.toString();
      if (id == null || id.isEmpty) continue;
      // Skip local-only temp IDs — they haven't reached the server yet
      if (id.startsWith('local_')) continue;

      final index = _requests.indexWhere((r) => r.id == id);
      final rawStatus = VisitorStatus.fromString(map['status']?.toString());
      final isCompletedLocally = _completedEntryIds.contains(id);
      final isExitedLocally = _exitedEntryIds.contains(id);

      final isGuardApproved = _guardApprovedIds.contains(id);
      final isGuardRejected = _guardRejectedIds.contains(id);

      // Prioritize local lifecycle (exited > entered/completed > server response > guard simulation)
      final newStatus = isExitedLocally
          ? VisitorStatus.exited
          : ((isCompletedLocally && rawStatus != VisitorStatus.rejected)
              ? VisitorStatus.completed
              : (rawStatus == VisitorStatus.approved
                  ? VisitorStatus.approved
                  : (rawStatus == VisitorStatus.rejected
                      ? VisitorStatus.rejected
                      : (isGuardApproved
                          ? VisitorStatus.approved
                          : (isGuardRejected
                              ? VisitorStatus.rejected
                              : rawStatus)))));

      if (index != -1) {
        final currentReq = _requests[index];

        final effectiveStatus = (currentReq.status == VisitorStatus.exited)
            ? VisitorStatus.exited
            : ((currentReq.status == VisitorStatus.completed &&
                    newStatus != VisitorStatus.rejected)
                ? VisitorStatus.completed
                : newStatus);

        final decisionTime = map['respondedAt'] != null
            ? DateTime.tryParse(map['respondedAt'].toString())?.toLocal()
            : (map['decisionTime'] != null
                ? DateTime.tryParse(map['decisionTime'].toString())?.toLocal()
                : currentReq.decisionTime);

        final decisionBy =
            (map['responseBy'] ?? map['decisionBy'])?.toString() ??
                currentReq.decisionBy;
        final rejectionReason =
            (map['rejectionReason'] ?? map['reason'])?.toString() ??
                (effectiveStatus == VisitorStatus.rejected
                    ? 'Entry denied by resident'
                    : currentReq.rejectionReason);

        final serverVisitor = map['visitor'];
        final serverPhoto = (serverVisitor is Map ? serverVisitor['photoUrl'] : null) ?? map['photoUrl'];
        String? updatedPhoto = currentReq.visitor.photoPath;
        if (serverPhoto != null &&
            (serverPhoto.toString().startsWith('http://') ||
                serverPhoto.toString().startsWith('https://'))) {
          updatedPhoto = serverPhoto.toString();
        }

        final photoChanged = updatedPhoto != null && updatedPhoto != currentReq.visitor.photoPath;

        if (effectiveStatus != currentReq.status ||
            decisionBy != currentReq.decisionBy ||
            rejectionReason != currentReq.rejectionReason ||
            photoChanged) {
          _requests[index] = VisitorRequest(
            id: currentReq.id,
            visitor: photoChanged
                ? currentReq.visitor.copyWith(photoPath: updatedPhoto)
                : currentReq.visitor,
            flatNumber: currentReq.flatNumber,
            buildingWing: currentReq.buildingWing,
            residentName: currentReq.residentName,
            residentPhone: currentReq.residentPhone,
            purpose: currentReq.purpose,
            status: effectiveStatus,
            requestTime: currentReq.requestTime,
            decisionTime: decisionTime,
            exitTime: currentReq.exitTime,
            decisionBy: decisionBy,
            rejectionReason: rejectionReason,
          );
          updated = true;
        }

        // Clean up any lingering local temp requests for this visitor
        _requests.removeWhere((r) =>
            r.id.startsWith('local_') &&
            r.visitor.name.toLowerCase() == currentReq.visitor.name.toLowerCase() &&
            r.flatNumber == currentReq.flatNumber);
      } else {
        // Request exists on backend but not in local cache (e.g. after logout/login or shift change)
        try {
          final serverReq = VisitorRequest.fromJson(map);
          if (_exitedEntryIds.contains(serverReq.id)) {
            serverReq.status = VisitorStatus.exited;
          } else if (_completedEntryIds.contains(serverReq.id) &&
              serverReq.status != VisitorStatus.rejected) {
            serverReq.status = VisitorStatus.completed;
          } else if (_guardApprovedIds.contains(serverReq.id) &&
              serverReq.status == VisitorStatus.pending) {
            serverReq.status = VisitorStatus.approved;
          } else if (_guardRejectedIds.contains(serverReq.id) &&
              serverReq.status == VisitorStatus.pending) {
            serverReq.status = VisitorStatus.rejected;
          }

          // Clean up any local request matching this server request
          _requests.removeWhere((r) =>
              r.id.startsWith('local_') &&
              r.visitor.name.toLowerCase() == serverReq.visitor.name.toLowerCase() &&
              r.flatNumber == serverReq.flatNumber);

          _requests.add(serverReq);
          updated = true;
        } catch (e) {
          debugPrint(
              '[VisitorRepository] Error parsing server request $id: $e');
        }
      }
    }

    if (updated) {
      // Deduplicate requests strictly by ID
      final seenIds = <String>{};
      _requests.retainWhere((r) => seenIds.add(r.id));

      // Sort newest requests first
      _requests.sort((a, b) => b.requestTime.compareTo(a.requestTime));
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  Future<void> refreshStatus() async {
    await _pollBackendStatus();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  // Directory Data - Strictly Dynamic from Database
  List<String> wings = [];
  Map<String, List<Flat>> wingFlats = {};

  Future<void> fetchDirectoryFromBackend() async {
    try {
      final data = await ApiService.fetchDirectory();
      if (data != null && data['wings'] != null && data['wingFlats'] != null) {
        final List<String> loadedWings = List<String>.from(data['wings']);
        final Map<String, dynamic> rawMap =
            Map<String, dynamic>.from(data['wingFlats']);
        final Map<String, List<Flat>> loadedWingFlats = {};

        rawMap.forEach((wingName, flatList) {
          if (flatList is List) {
            loadedWingFlats[wingName] = flatList.map((f) {
              final residentsList = (f['residents'] as List? ?? [])
                  .map((r) => Resident(
                        id: r['id'] ?? '',
                        name: r['name'] ?? '',
                        phoneNumber: r['phoneNumber'] ?? '',
                        flatNumber: r['flatNumber'] ?? '',
                        buildingWing: r['buildingWing'] ?? '',
                      ))
                  .toList();

              return Flat(
                flatNumber: f['flatNumber'] ?? '',
                buildingWing: f['buildingWing'] ?? wingName,
                floor: f['floor'] ?? '',
                residents: residentsList,
              );
            }).toList();
          }
        });

        if (loadedWings.isNotEmpty) {
          wings = loadedWings;
          wingFlats = loadedWingFlats;
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Notice: Could not refresh dynamic directory from API: $e');
    }
  }

  void _loadRequests() {
    _completedEntryIds = _storage.getCompletedEntryIds();
    _exitedEntryIds = _storage.getExitedEntryIds();
    _guardApprovedIds.addAll(_storage.getGuardApprovedIds());
    _guardRejectedIds.addAll(_storage.getGuardRejectedIds());

    final stored = _storage.getRequests();
    if (stored != null && stored.isNotEmpty) {
      // Filter out mock seed requests and old unsynced local temporary requests
      _requests = stored
          .where((r) =>
              !r.id.startsWith('REQ-1001') &&
              r.visitor.name != 'Rahul Verma' &&
              !r.id.startsWith('local_'))
          .toList();

      for (var r in _requests) {
        if (_exitedEntryIds.contains(r.id)) {
          r.status = VisitorStatus.exited;
        } else if (_completedEntryIds.contains(r.id) &&
            r.status != VisitorStatus.rejected) {
          r.status = VisitorStatus.completed;
        } else if (_guardApprovedIds.contains(r.id) &&
            r.status == VisitorStatus.pending) {
          r.status = VisitorStatus.approved;
        } else if (_guardRejectedIds.contains(r.id) &&
            r.status == VisitorStatus.pending) {
          r.status = VisitorStatus.rejected;
        }
      }
      _requests.sort((a, b) => b.requestTime.compareTo(a.requestTime));
    } else {
      _requests = [];
    }
  }

  // Getters
  List<VisitorRequest> get allRequests => List.unmodifiable(_requests);

  List<VisitorRequest> get pendingRequests =>
      _requests.where((r) => r.status == VisitorStatus.pending).toList();

  List<VisitorRequest> get approvedRequests =>
      _requests.where((r) => r.status == VisitorStatus.approved).toList();

  List<VisitorRequest> get rejectedRequests =>
      _requests.where((r) => r.status == VisitorStatus.rejected).toList();

  List<VisitorRequest> get completedRequests =>
      _requests.where((r) => r.status == VisitorStatus.completed).toList();

  List<VisitorRequest> get exitedRequests =>
      _requests.where((r) => r.status == VisitorStatus.exited).toList();

  List<VisitorRequest> get enteredRequests => completedRequests;

  int get pendingCount => pendingRequests.length;
  int get approvedTodayCount => _requests
      .where((r) =>
          r.status == VisitorStatus.approved ||
          r.status == VisitorStatus.completed ||
          r.status == VisitorStatus.exited)
      .length;
  int get rejectedTodayCount => rejectedRequests.length;
  int get completedTodayCount => completedRequests.length;
  int get exitedTodayCount => exitedRequests.length;
  int get totalTodayCount => _requests.length;

  List<VisitorRequest> get recentActivity {
    final list = List<VisitorRequest>.from(_requests);
    list.sort((a, b) => b.requestTime.compareTo(a.requestTime));
    return list.take(10).toList();
  }

  // ---------------------------------------------------------------------------
  // OPTIMISTIC INSTANT TRANSITION SUPPORT
  // ---------------------------------------------------------------------------

  /// Add a local-only pending request immediately (before server responds).
  void addLocalPendingRequest(VisitorRequest localReq) {
    // Remove any previous duplicate with same localId
    _requests.removeWhere((r) => r.id == localReq.id);
    _requests.insert(0, localReq);
    notifyListeners();
  }

  /// Replace a local temp request (by localId) with real server data.
  Future<void> upgradeLocalRequest(
      String localId, VisitorRequest serverReq) async {
    final index = _requests.indexWhere((r) => r.id == localId);
    if (index != -1) {
      _requests[index] = serverReq;
    } else {
      final exists = _requests.any((r) => r.id == serverReq.id);
      if (!exists) {
        _requests.insert(0, serverReq);
      }
    }
    // Deduplicate by ID
    final seen = <String>{};
    _requests.retainWhere((r) => seen.add(r.id));
    await _storage.saveRequests(_requests);
    notifyListeners();
  }

  /// Mark a local request as failed so WaitingApprovalScreen can show retry.
  void markLocalRequestFailed(String localId) {
    final index = _requests.indexWhere((r) => r.id == localId);
    if (index != -1) {
      _requests[index].rejectionReason = '__upload_failed__';
      notifyListeners();
    }
  }

  // Create new visitor request with API submission
  Future<VisitorRequest> createVisitorRequest({
    required String name,
    String? phoneNumber,
    String? photoPath,
    required VisitorType type,
    String? deliveryCompany,
    String? vehicleNumber,
    required String buildingWing,
    required String flatNumber,
    required String residentName,
    required String residentPhone,
    required String purpose,
  }) async {
    // 1. Submit to Backend API with photo file upload
    final apiResult = await ApiService.submitVisitorRequest(
      name: name,
      phoneNumber: phoneNumber,
      photoPath: photoPath,
      purpose: purpose,
      visitorType: type.name,
      buildingWing: buildingWing,
      flatNumber: flatNumber,
      residentName: residentName,
      residentPhone: residentPhone,
      vehicleNumber: vehicleNumber,
      deliveryCompany: deliveryCompany,
    );

    if (apiResult == null || apiResult['id'] == null) {
      throw Exception(
          'Backend server rejected the request or network is unavailable. Please ensure valid flat and credentials.');
    }

    final newId = apiResult['id'];

    String? resolvedPhoto = photoPath;
    final serverVisitor = apiResult['visitor'];
    final serverPhoto = (serverVisitor is Map ? serverVisitor['photoUrl'] : null) ?? apiResult['photoUrl'];
    if (serverPhoto != null &&
        (serverPhoto.toString().startsWith('http://') ||
            serverPhoto.toString().startsWith('https://'))) {
      resolvedPhoto = serverPhoto.toString();
    }

    final request = VisitorRequest(
      id: newId,
      visitor: Visitor(
        name: name,
        phoneNumber: phoneNumber,
        photoPath: resolvedPhoto,
        type: type,
        deliveryCompany: deliveryCompany,
        vehicleNumber: vehicleNumber,
      ),
      flatNumber: flatNumber,
      buildingWing: buildingWing,
      residentName: residentName,
      residentPhone: residentPhone,
      purpose: purpose.isNotEmpty ? purpose : 'Visit to $flatNumber',
      status: VisitorStatus.pending,
      requestTime: apiResult['requestedAt'] != null
          ? (DateTime.tryParse(apiResult['requestedAt'].toString())
                  ?.toLocal() ??
              DateTime.now())
          : DateTime.now(),
    );

    // Replace any local temp request for this visitor or add to top
    final localIndex = _requests.indexWhere((r) =>
        r.id.startsWith('local_') &&
        r.visitor.name.toLowerCase() == name.toLowerCase() &&
        r.flatNumber == flatNumber);
    if (localIndex != -1) {
      _requests[localIndex] = request;
    } else {
      _requests.removeWhere((r) => r.id == newId);
      _requests.insert(0, request);
    }

    // Deduplicate
    final seen = <String>{};
    _requests.retainWhere((r) => seen.add(r.id));

    await _storage.saveRequests(_requests);
    notifyListeners();
    return request;
  }

  // Complete Entry (Allow Gate Entry)
  Future<void> completeEntry(String requestId) async {
    _completedEntryIds.add(requestId);
    await _storage.markEntryCompleted(requestId);

    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.completed;
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  Future<void> allowEntry(String requestId) => completeEntry(requestId);

  // Mark Exit (Visitor Leaves Society Gate)
  Future<void> markExit(String requestId) async {
    _exitedEntryIds.add(requestId);
    await _storage.markEntryExited(requestId);

    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.exited;
      _requests[index].exitTime = DateTime.now();
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  // Cancel pending request
  Future<void> cancelRequest(String requestId) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.rejected;
      _requests[index].rejectionReason = 'Cancelled at gate (visitor left)';
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  // Guard / Resident decision
  Future<void> simulateResidentDecision({
    required String requestId,
    required bool isApproved,
    String? reason,
  }) async {
    if (isApproved) {
      _guardApprovedIds.add(requestId);
      _guardRejectedIds.remove(requestId);
    } else {
      _guardRejectedIds.add(requestId);
      _guardApprovedIds.remove(requestId);
    }
    await _storage.saveGuardApprovedIds(_guardApprovedIds);
    await _storage.saveGuardRejectedIds(_guardRejectedIds);

    int index = _requests.indexWhere((r) => r.id == requestId);
    // If not found by exact ID, fallback to match any recent matching local or server request
    if (index == -1) {
      index = _requests.indexWhere((r) => r.status == VisitorStatus.pending);
    }
    if (index != -1) {
      final actualId = _requests[index].id;
      if (isApproved) {
        _guardApprovedIds.add(actualId);
      } else {
        _guardRejectedIds.add(actualId);
      }
      await _storage.saveGuardApprovedIds(_guardApprovedIds);
      await _storage.saveGuardRejectedIds(_guardRejectedIds);

      _requests[index].status =
          isApproved ? VisitorStatus.approved : VisitorStatus.rejected;
      if (!isApproved && reason != null) {
        _requests[index].rejectionReason = reason;
      }
      _requests[index].decisionTime = DateTime.now();
      _requests[index].decisionBy = 'Security Guard';
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  // Reset requests
  Future<void> resetToSeedData() async {
    _requests = [];
    await _storage.saveRequests(_requests);
    notifyListeners();
  }

  // Search & Filter
  List<VisitorRequest> filterHistory({
    String query = '',
    VisitorStatus? status,
  }) {
    return _requests.where((r) {
      final matchesQuery = query.isEmpty ||
          r.visitor.name.toLowerCase().contains(query.toLowerCase()) ||
          r.flatNumber.toLowerCase().contains(query.toLowerCase());

      final matchesStatus = status == null || r.status == status;

      return matchesQuery && matchesStatus;
    }).toList();
  }
}