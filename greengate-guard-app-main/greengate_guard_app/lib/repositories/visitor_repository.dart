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

      final index = _requests.indexWhere((r) => r.id == id);
      final newStatus = VisitorStatus.fromString(map['status']?.toString());

      if (index != -1) {
        final currentReq = _requests[index];

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
                (newStatus == VisitorStatus.rejected
                    ? 'Entry denied by resident'
                    : currentReq.rejectionReason);

        if (newStatus != currentReq.status ||
            decisionBy != currentReq.decisionBy ||
            rejectionReason != currentReq.rejectionReason) {
          _requests[index] = VisitorRequest(
            id: currentReq.id,
            visitor: currentReq.visitor,
            flatNumber: currentReq.flatNumber,
            buildingWing: currentReq.buildingWing,
            residentName: currentReq.residentName,
            residentPhone: currentReq.residentPhone,
            purpose: currentReq.purpose,
            status: newStatus,
            requestTime: currentReq.requestTime,
            decisionTime: decisionTime,
            decisionBy: decisionBy,
            rejectionReason: rejectionReason,
          );
          updated = true;
        }
      } else {
        // Request exists on backend but not in local cache (e.g. after logout/login or shift change)
        try {
          final serverReq = VisitorRequest.fromJson(map);
          _requests.add(serverReq);
          updated = true;
        } catch (e) {
          debugPrint(
              '[VisitorRepository] Error parsing server request $id: $e');
        }
      }
    }

    if (updated) {
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
    final stored = _storage.getRequests();
    if (stored != null && stored.isNotEmpty) {
      // Filter out any previous mock seed requests
      _requests = stored
          .where((r) =>
              !r.id.startsWith('REQ-1001') && r.visitor.name != 'Rahul Verma')
          .toList();
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

  List<VisitorRequest> get enteredRequests => completedRequests;

  int get pendingCount => pendingRequests.length;
  int get approvedTodayCount => _requests
      .where((r) =>
          r.status == VisitorStatus.approved ||
          r.status == VisitorStatus.completed)
      .length;
  int get rejectedTodayCount => rejectedRequests.length;
  int get completedTodayCount => completedRequests.length;
  int get totalTodayCount => _requests.length;

  List<VisitorRequest> get recentActivity {
    final list = List<VisitorRequest>.from(_requests);
    list.sort((a, b) => b.requestTime.compareTo(a.requestTime));
    return list.take(10).toList();
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

    final request = VisitorRequest(
      id: newId,
      visitor: Visitor(
        name: name,
        phoneNumber: phoneNumber,
        photoPath: photoPath,
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

    _requests.insert(0, request);
    await _storage.saveRequests(_requests);
    notifyListeners();
    return request;
  }

  // Complete Entry
  Future<void> completeEntry(String requestId) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.completed;
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  Future<void> allowEntry(String requestId) => completeEntry(requestId);

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

  // Simulate Resident decision for testing/demo
  Future<void> simulateResidentDecision({
    required String requestId,
    required bool isApproved,
    String? reason,
  }) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status =
          isApproved ? VisitorStatus.approved : VisitorStatus.rejected;
      if (!isApproved && reason != null) {
        _requests[index].rejectionReason = reason;
      }
      _requests[index].decisionTime = DateTime.now();
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
