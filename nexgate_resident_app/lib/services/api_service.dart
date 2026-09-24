import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants/api_endpoints.dart';
import '../models/family_member_model.dart';
import '../models/notification_model.dart';
import '../models/registration_model.dart';
import '../models/user_model.dart';
import '../models/vehicle_model.dart';
import '../models/visitor_model.dart';
import 'storage_service.dart';

class ApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;
  final dynamic data;

  ApiException(this.message, {this.code, this.statusCode, this.data});

  @override
  String toString() => message;
}

/// Centralized HTTP API client for NexGate Resident Mobile App.
class ApiService {
  ApiService._();

  static Map<String, String> _headers({bool withAuth = true}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (withAuth) {
      final token = StorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static dynamic _handleResponse(http.Response response) {
    dynamic json;
    try {
      json = jsonDecode(response.body);
    } catch (_) {
      json = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (json is Map<String, dynamic> && json['success'] == false) {
        final err = json['error'] as Map<String, dynamic>?;
        throw ApiException(
          err?['message']?.toString() ?? json['message']?.toString() ?? 'Operation failed',
          code: err?['code']?.toString(),
          statusCode: response.statusCode,
          data: err?['data'],
        );
      }
      return json;
    }

    final err = json is Map<String, dynamic> ? json['error'] as Map<String, dynamic>? : null;
    final message = err?['message']?.toString() ??
        json?['message']?.toString() ??
        'Request failed with status ${response.statusCode}';
    final code = err?['code']?.toString() ?? (response.statusCode == 404 ? 'NOT_FOUND' : 'API_ERROR');

    throw ApiException(
      message,
      code: code,
      statusCode: response.statusCode,
      data: err?['data'],
    );
  }

  // ==========================================================
  // AUTH & REGISTRATION
  // ==========================================================

  static Future<Map<String, dynamic>> sendOtp(String mobile) async {
    final clean = mobile.replaceAll(RegExp(r'\D'), '');
    final response = await http.post(
      Uri.parse(ApiEndpoints.sendOtp),
      headers: _headers(withAuth: false),
      body: jsonEncode({'mobile': clean}),
    );
    final json = _handleResponse(response);
    return json is Map<String, dynamic> ? json : {};
  }

  static Future<Map<String, dynamic>> verifyOtp(String mobile, String otp) async {
    final clean = mobile.replaceAll(RegExp(r'\D'), '');
    final response = await http.post(
      Uri.parse(ApiEndpoints.verifyOtp),
      headers: _headers(withAuth: false),
      body: jsonEncode({'mobile': clean, 'otp': otp.trim()}),
    );
    final json = _handleResponse(response);
    return json is Map<String, dynamic> ? json : {};
  }

  static Future<FlatsHierarchy> fetchRegistrationFlats({String societyId = 'soc_greengate'}) async {
    final response = await http.get(
      Uri.parse('${ApiEndpoints.registrationFlats}?societyId=$societyId'),
      headers: _headers(withAuth: false),
    );
    final json = _handleResponse(response);
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return FlatsHierarchy.fromJson(data);
  }

  static Future<RegistrationStatusData> checkRegistrationStatus(String mobile) async {
    final clean = mobile.replaceAll(RegExp(r'\D'), '');
    final clean10 = clean.length >= 10 ? clean.substring(clean.length - 10) : clean;
    final response = await http.get(
      Uri.parse('${ApiEndpoints.registrationStatus}?mobile=$clean10'),
      headers: _headers(withAuth: false),
    );
    final json = _handleResponse(response);
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return RegistrationStatusData.fromJson(data);
  }

  static Future<Map<String, dynamic>> submitRegistration({
    required String mobile,
    required String wing,
    required int floor,
    required String flatNumber,
    String? flatId,
    String? name,
    String societyId = 'soc_greengate',
  }) async {
    final clean = mobile.replaceAll(RegExp(r'\D'), '');
    final payload = <String, dynamic>{
      'mobile': clean,
      'wing': wing,
      'floor': floor,
      'flatNumber': flatNumber,
      'societyId': societyId,
    };
    if (flatId != null) payload['flatId'] = flatId;
    if (name != null) payload['name'] = name;

    final response = await http.post(
      Uri.parse(ApiEndpoints.registrationSubmit),
      headers: _headers(withAuth: false),
      body: jsonEncode(payload),
    );
    final json = _handleResponse(response);
    return json is Map<String, dynamic> ? json : {};
  }

  static Future<UserModel?> fetchCurrentUser() async {
    try {
      final response = await http.get(
        Uri.parse(ApiEndpoints.me),
        headers: _headers(),
      );
      final json = _handleResponse(response);
      final data = json['data'] as Map<String, dynamic>?;
      if (data == null) return null;
      return UserModel.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  // ==========================================================
  // VISITOR MANAGEMENT
  // ==========================================================

  static Future<List<VisitorModel>> fetchVisitorRequests() async {
    final response = await http.get(
      Uri.parse(ApiEndpoints.visitorRequests),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    final list = json['data'] as List<dynamic>? ?? [];
    return list.map((item) => VisitorModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<VisitorModel?> fetchVisitorRequestById(String id) async {
    try {
      final response = await http.get(
        Uri.parse(ApiEndpoints.visitorRequestDetail(id)),
        headers: _headers(),
      );
      final json = _handleResponse(response);
      final data = json['data'] as Map<String, dynamic>?;
      if (data == null) return null;
      return VisitorModel.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  static Future<bool> approveVisitorRequest(String id) async {
    final response = await http.post(
      Uri.parse(ApiEndpoints.approveVisitor(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  static Future<bool> rejectVisitorRequest(String id, {String reason = 'Denied by resident'}) async {
    final response = await http.post(
      Uri.parse(ApiEndpoints.rejectVisitor(id)),
      headers: _headers(),
      body: jsonEncode({'reason': reason}),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  static String getSecurePhotoUrl(String? rawPath) {
    if (rawPath == null || rawPath.isEmpty) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return rawPath;
    }
    final token = StorageService.getToken();
    final clean = rawPath.startsWith('/') ? rawPath : '/$rawPath';
    final base = ApiEndpoints.baseUrl.replaceAll(RegExp(r'/api$'), '');
    return token != null && token.isNotEmpty
        ? '$base$clean?token=$token'
        : '$base$clean';
  }

  // ==========================================================
  // HOUSEHOLD & VEHICLES
  // ==========================================================

  static Future<List<FamilyMemberModel>> fetchFamilyMembers() async {
    try {
      final response = await http.get(
        Uri.parse(ApiEndpoints.familyMembers),
        headers: _headers(),
      );
      final json = _handleResponse(response);
      final list = json['data'] as List<dynamic>? ?? [];
      return list.map((item) => FamilyMemberModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<FamilyMemberModel> addFamilyMember({
    required String name,
    required String relationship,
    String? phone,
  }) async {
    final response = await http.post(
      Uri.parse(ApiEndpoints.familyMembers),
      headers: _headers(),
      body: jsonEncode({
        'name': name.trim(),
        'relationship': relationship.trim().toLowerCase(),
        if (phone != null && phone.isNotEmpty) 'phone': phone.trim(),
      }),
    );
    final json = _handleResponse(response);
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return FamilyMemberModel.fromJson(data);
  }

  static Future<bool> deleteFamilyMember(String id) async {
    final response = await http.delete(
      Uri.parse(ApiEndpoints.deleteFamilyMember(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  static Future<List<VehicleModel>> fetchVehicles() async {
    try {
      final response = await http.get(
        Uri.parse(ApiEndpoints.vehicles),
        headers: _headers(),
      );
      final json = _handleResponse(response);
      final list = json['data'] as List<dynamic>? ?? [];
      return list.map((item) => VehicleModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<VehicleModel> addVehicle({
    required String number,
    required String type,
    String? brand,
    String? model,
    String? color,
  }) async {
    final response = await http.post(
      Uri.parse(ApiEndpoints.vehicles),
      headers: _headers(),
      body: jsonEncode({
        'number': number.trim().toUpperCase(),
        'type': type.trim().toLowerCase(),
        'brand': brand?.trim() ?? '',
        'model': model?.trim() ?? '',
        'color': color ?? '#000000',
      }),
    );
    final json = _handleResponse(response);
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return VehicleModel.fromJson(data);
  }

  static Future<bool> deleteVehicle(String id) async {
    final response = await http.delete(
      Uri.parse(ApiEndpoints.deleteVehicle(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  static Future<List<NotificationModel>> fetchNotifications() async {
    try {
      final response = await http.get(
        Uri.parse(ApiEndpoints.notifications),
        headers: _headers(),
      );
      final json = _handleResponse(response);
      final list = json['data'] as List<dynamic>? ?? [];
      return list.map((item) => NotificationModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}
