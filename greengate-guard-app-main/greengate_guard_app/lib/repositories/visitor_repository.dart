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
  }

  void _startStatusPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _pollBackendStatus();
    });
  }

  Future<void> _pollBackendStatus() async {
    final pending = pendingRequests;
    if (pending.isEmpty) return;

    final apiData = await ApiService.fetchVisitorRequests();
    if (apiData == null || apiData.isEmpty) return;

    bool updated = false;
    for (var item in apiData) {
      final String id = item['id'];
      final String statusStr = (item['status'] ?? '').toString().toLowerCase();

      final index = _requests.indexWhere((r) => r.id == id);
      if (index != -1) {
        final currentReq = _requests[index];
        VisitorStatus newStatus = currentReq.status;

        if (statusStr == 'approved') {
          newStatus = VisitorStatus.approved;
        } else if (statusStr == 'rejected') {
          newStatus = VisitorStatus.rejected;
        }

        if (newStatus != currentReq.status) {
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
            decisionTime: DateTime.now(),
            decisionBy: currentReq.residentName,
            rejectionReason: item['rejectionReason'] ?? (newStatus == VisitorStatus.rejected ? 'Entry denied by resident' : null),
          );
          updated = true;
        }
      }
    }

    if (updated) {
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
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
        final Map<String, dynamic> rawMap = Map<String, dynamic>.from(data['wingFlats']);
        final Map<String, List<Flat>> loadedWingFlats = {};

        rawMap.forEach((wingName, flatList) {
          if (flatList is List) {
            loadedWingFlats[wingName] = flatList.map((f) {
              final residentsList = (f['residents'] as List? ?? []).map((r) => Resident(
                id: r['id'] ?? '',
                name: r['name'] ?? '',
                phoneNumber: r['phoneNumber'] ?? '',
                flatNumber: r['flatNumber'] ?? '',
                buildingWing: r['buildingWing'] ?? '',
              )).toList();

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
      print('Notice: Could not refresh dynamic directory from API: $e');
    }
  }

  void _loadRequests() {
    final stored = _storage.getRequests();
    if (stored != null && stored.isNotEmpty) {
      // Filter out any previous mock seed requests
      _requests = stored.where((r) => !r.id.startsWith('REQ-1001') && r.visitor.name != 'Rahul Verma').toList();
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
  int get approvedTodayCount =>
      _requests.where((r) => r.status == VisitorStatus.approved || r.status == VisitorStatus.completed).length;
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
      throw Exception('Backend server rejected the request or network is unavailable. Please ensure valid flat and credentials.');
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
      requestTime: DateTime.now(),
    );

    _requests.insert(0, request);
    await _storage.saveRequests(_requests);
    notifyListeners();
    return request;
  }

  // Update status (Approve / Reject simulation)
  Future<void> simulateResidentDecision({
    required String requestId,
    required bool isApproved,
    String? reason,
  }) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      final req = _requests[index];
      req.status = isApproved ? VisitorStatus.approved : VisitorStatus.rejected;
      req.decisionTime = DateTime.now();
      req.decisionBy = req.residentName;
      req.rejectionReason = isApproved ? null : (reason ?? 'Entry denied by resident');
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
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
