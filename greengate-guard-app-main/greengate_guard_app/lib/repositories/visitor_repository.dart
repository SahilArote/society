import 'package:flutter/foundation.dart';
import '../models/flat.dart';
import '../models/resident.dart';
import '../models/visitor.dart';
import '../models/visitor_request.dart';
import '../services/storage_service.dart';

class VisitorRepository extends ChangeNotifier {
  final StorageService _storage;

  List<VisitorRequest> _requests = [];

  VisitorRepository(this._storage) {
    _loadRequests();
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
      VisitorRequest(
        id: 'REQ-1002',
        visitor: const Visitor(
          name: 'Swiggy Delivery',
          phoneNumber: '+91 98123 45678',
          type: VisitorType.delivery,
          deliveryCompany: 'Swiggy',
          vehicleNumber: 'DL08-SK-9011',
        ),
        flatNumber: 'A-104',
        buildingWing: 'Tower A',
        residentName: 'Rajesh Rao',
        residentPhone: '+91 98221 44556',
        purpose: 'Food Order Package',
        status: VisitorStatus.pending,
        requestTime: now.subtract(const Duration(minutes: 4)),
      ),
      VisitorRequest(
        id: 'REQ-1003',
        visitor: const Visitor(
          name: 'Amazon Courier',
          phoneNumber: '+91 98234 56789',
          type: VisitorType.delivery,
          deliveryCompany: 'Amazon',
          vehicleNumber: 'MH01-BK-8299',
        ),
        flatNumber: 'C-201',
        buildingWing: 'Tower C',
        residentName: 'Vikas Malhotra',
        residentPhone: '+91 98776 88990',
        purpose: 'Parcel Box Delivery',
        status: VisitorStatus.completed,
        requestTime: now.subtract(const Duration(minutes: 45)),
        decisionTime: now.subtract(const Duration(minutes: 42)),
        decisionBy: 'Vikas Malhotra',
      ),
      VisitorRequest(
        id: 'REQ-1004',
        visitor: const Visitor(
          name: 'Manish Rawat',
          phoneNumber: '+91 98345 67890',
          type: VisitorType.other,
          vehicleNumber: 'DL 3C AB 9102',
        ),
        flatNumber: 'C-102',
        buildingWing: 'Tower C',
        residentName: 'Mrs. Neha Gupta',
        residentPhone: '+91 98110 33921',
        purpose: 'Sales Consultation',
        status: VisitorStatus.rejected,
        requestTime: now.subtract(const Duration(hours: 1, minutes: 10)),
        decisionTime: now.subtract(const Duration(hours: 1, minutes: 8)),
        decisionBy: 'Mrs. Neha Gupta',
        rejectionReason: 'Unknown person / Not expected',
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

  List<VisitorRequest> get enteredRequests => completedRequests; // For backwards compatibility

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

  // Create new visitor request
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
    final newId = 'REQ-${1000 + _requests.length + 1}';
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

  // Complete Entry (Guard confirms visitor has completed entry)
  Future<void> completeEntry(String requestId) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.completed;
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  // Alias for backward compatibility
  Future<void> allowEntry(String requestId) => completeEntry(requestId);

  // Cancel pending request (Visitor left)
  Future<void> cancelRequest(String requestId) async {
    final index = _requests.indexWhere((r) => r.id == requestId);
    if (index != -1) {
      _requests[index].status = VisitorStatus.rejected;
      _requests[index].rejectionReason = 'Cancelled at gate (visitor left)';
      await _storage.saveRequests(_requests);
      notifyListeners();
    }
  }

  // Reset to seed requests (Dev / Test utility)
  Future<void> resetToSeedData() async {
    _requests = _getSeedRequests();
    await _storage.saveRequests(_requests);
    notifyListeners();
  }

  // Search & Filter for History (Search by visitor name and flat number only)
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
