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

  // Directory Data
  final List<String> wings = ['Tower A', 'Tower B', 'Tower C', 'Tower D'];

  final Map<String, List<Flat>> wingFlats = {
    'Tower A': [
      Flat(
        flatNumber: 'A-101',
        buildingWing: 'Tower A',
        floor: '1st Floor',
        residents: [
          Resident(
            id: 'res_a101',
            name: 'Priya Sharma',
            phoneNumber: '+91 98101 22334',
            flatNumber: 'A-101',
            buildingWing: 'Tower A',
          ),
        ],
      ),
      Flat(
        flatNumber: 'A-104',
        buildingWing: 'Tower A',
        floor: '1st Floor',
        residents: [
          Resident(
            id: 'res_a104',
            name: 'Rajesh Rao',
            phoneNumber: '+91 98221 44556',
            flatNumber: 'A-104',
            buildingWing: 'Tower A',
          ),
        ],
      ),
      Flat(
        flatNumber: 'A-201',
        buildingWing: 'Tower A',
        floor: '2nd Floor',
        residents: [
          Resident(
            id: 'res_a201',
            name: 'Kavita Patel',
            phoneNumber: '+91 98332 55667',
            flatNumber: 'A-201',
            buildingWing: 'Tower A',
          ),
        ],
      ),
      Flat(
        flatNumber: 'A-402',
        buildingWing: 'Tower A',
        floor: '4th Floor',
        residents: [
          Resident(
            id: 'res_sahil',
            name: 'Sahil Arote',
            phoneNumber: '+91 98765 43210',
            flatNumber: 'A-402',
            buildingWing: 'Tower A',
          ),
        ],
      ),
    ],
    'Tower B': [
      Flat(
        flatNumber: 'B-101',
        buildingWing: 'Tower B',
        floor: '1st Floor',
        residents: [
          Resident(
            id: 'res_b101',
            name: 'Anand Mehta',
            phoneNumber: '+91 98443 66778',
            flatNumber: 'B-101',
            buildingWing: 'Tower B',
          ),
        ],
      ),
      Flat(
        flatNumber: 'B-202',
        buildingWing: 'Tower B',
        floor: '2nd Floor',
        residents: [
          Resident(
            id: 'res_b202',
            name: 'Sunita Joshi',
            phoneNumber: '+91 98554 77889',
            flatNumber: 'B-202',
            buildingWing: 'Tower B',
          ),
        ],
      ),
      Flat(
        flatNumber: 'B-402',
        buildingWing: 'Tower B',
        floor: '4th Floor',
        residents: [
          Resident(
            id: 'res_b402',
            name: 'Dr. Amit Sharma',
            phoneNumber: '+91 98200 44821',
            flatNumber: 'B-402',
            buildingWing: 'Tower B',
          ),
        ],
      ),
    ],
    'Tower C': [
      Flat(
        flatNumber: 'C-102',
        buildingWing: 'Tower C',
        floor: '1st Floor',
        residents: [
          Resident(
            id: 'res_c102',
            name: 'Mrs. Neha Gupta',
            phoneNumber: '+91 98110 33921',
            flatNumber: 'C-102',
            buildingWing: 'Tower C',
          ),
        ],
      ),
      Flat(
        flatNumber: 'C-201',
        buildingWing: 'Tower C',
        floor: '2nd Floor',
        residents: [
          Resident(
            id: 'res_c201',
            name: 'Vikas Malhotra',
            phoneNumber: '+91 98776 88990',
            flatNumber: 'C-201',
            buildingWing: 'Tower C',
          ),
        ],
      ),
    ],
    'Tower D': [
      Flat(
        flatNumber: 'D-101',
        buildingWing: 'Tower D',
        floor: '1st Floor',
        residents: [
          Resident(
            id: 'res_d101',
            name: 'Rohan Verma',
            phoneNumber: '+91 98887 99001',
            flatNumber: 'D-101',
            buildingWing: 'Tower D',
          ),
        ],
      ),
    ],
  };

  void _loadRequests() {
    final stored = _storage.getRequests();
    if (stored != null && stored.isNotEmpty) {
      _requests = stored;
    } else {
      _requests = _getSeedRequests();
      _storage.saveRequests(_requests);
    }
  }

  List<VisitorRequest> _getSeedRequests() {
    final now = DateTime.now();
    return [
      VisitorRequest(
        id: 'REQ-1001',
        visitor: const Visitor(
          name: 'Rahul Verma',
          phoneNumber: '+91 98765 43210',
          type: VisitorType.guest,
          vehicleNumber: 'MH02-CL-4412',
        ),
        flatNumber: 'B-402',
        buildingWing: 'Tower B',
        residentName: 'Dr. Amit Sharma',
        residentPhone: '+91 98200 44821',
        purpose: 'Personal Visit',
        status: VisitorStatus.completed,
        requestTime: now.subtract(const Duration(minutes: 25)),
        decisionTime: now.subtract(const Duration(minutes: 23)),
        decisionBy: 'Dr. Amit Sharma',
      ),
    ];
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

    final newId = apiResult != null ? apiResult['id'] : 'REQ-${1000 + _requests.length + 1}';

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

  // Reset to seed requests
  Future<void> resetToSeedData() async {
    _requests = _getSeedRequests();
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
