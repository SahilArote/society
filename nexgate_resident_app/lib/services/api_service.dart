import 'dart:async';

import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'package:http/http.dart' as http;

import '../core/constants/api_endpoints.dart';

import '../models/family_member_model.dart';

import '../models/notification_model.dart';

import '../models/registration_model.dart';

import '../models/user_model.dart';

import '../models/vehicle_model.dart';

import '../models/visitor_model.dart';
import '../models/invite_model.dart';
import '../models/society_service_model.dart';
import '../models/lost_found_model.dart';
import '../models/society_event_model.dart';

import 'auth_service.dart';

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



  /// Global strict 15-second timeout duration for all network calls

  static const Duration timeoutDuration = Duration(seconds: 15);



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



  static Future<http.Response> _get(Uri uri, {Map<String, String>? headers}) {

    return http.get(uri, headers: headers).timeout(

      timeoutDuration,

      onTimeout: () => throw ApiException(

        'Request timed out after 15 seconds. Please check your network connection.',

        code: 'TIMEOUT',

        statusCode: 408,

      ),

    );

  }



  static Future<http.Response> _post(Uri uri, {Map<String, String>? headers, Object? body}) {

    return http.post(uri, headers: headers, body: body).timeout(

      timeoutDuration,

      onTimeout: () => throw ApiException(

        'Request timed out after 15 seconds. Please check your network connection.',

        code: 'TIMEOUT',

        statusCode: 408,

      ),

    );

  }



  static Future<http.Response> _patch(Uri uri, {Map<String, String>? headers, Object? body}) {
    return http.patch(uri, headers: headers, body: body).timeout(
      timeoutDuration,
      onTimeout: () => throw ApiException(
        'Request timed out after 15 seconds. Please check your network connection.',
        code: 'TIMEOUT',
        statusCode: 408,
      ),
    );
  }

  static Future<http.Response> _delete(Uri uri, {Map<String, String>? headers, Object? body}) {

    return http.delete(uri, headers: headers, body: body).timeout(

      timeoutDuration,

      onTimeout: () => throw ApiException(

        'Request timed out after 15 seconds. Please check your network connection.',

        code: 'TIMEOUT',

        statusCode: 408,

      ),

    );

  }



  static dynamic _handleResponse(http.Response response) {

    // If token is rejected (401 Unauthorized), immediately evict cached session

    if (response.statusCode == 401) {

      AuthService.handleUnauthorized();

      throw ApiException(

        'Session expired or unauthorized (401). Please log in again.',

        code: 'UNAUTHORIZED',

        statusCode: 401,

      );

    }



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

    final response = await _post(

      Uri.parse(ApiEndpoints.sendOtp),

      headers: _headers(withAuth: false),

      body: jsonEncode({'mobile': clean}),

    );

    final json = _handleResponse(response);

    return json is Map<String, dynamic> ? json : {};

  }



  static Future<Map<String, dynamic>> verifyOtp(String mobile, String otp) async {

    final clean = mobile.replaceAll(RegExp(r'\D'), '');

    final response = await _post(

      Uri.parse(ApiEndpoints.verifyOtp),

      headers: _headers(withAuth: false),

      body: jsonEncode({'mobile': clean, 'otp': otp.trim()}),

    );

    final json = _handleResponse(response);

    return json is Map<String, dynamic> ? json : {};

  }



  static Future<FlatsHierarchy> fetchRegistrationFlats({String? societyId}) async {

    final response = await _get(

      (societyId != null && societyId.isNotEmpty)
          ? Uri.parse('${ApiEndpoints.registrationFlats}?societyId=$societyId')
          : Uri.parse(ApiEndpoints.registrationFlats),

      headers: _headers(withAuth: false),

    );

    final json = _handleResponse(response);

    final data = json['data'] as Map<String, dynamic>? ?? {};

    return FlatsHierarchy.fromJson(data);

  }



  static Future<RegistrationStatusData> checkRegistrationStatus(String mobile) async {

    final clean = mobile.replaceAll(RegExp(r'\D'), '');

    final clean10 = clean.length >= 10 ? clean.substring(clean.length - 10) : clean;

    final response = await _get(

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

    String? societyId,

  }) async {

    final clean = mobile.replaceAll(RegExp(r'\D'), '');

    final payload = <String, dynamic>{

      'mobile': clean,

      'wing': wing,

      'floor': floor,

      'flatNumber': flatNumber,

      if (societyId != null && societyId.isNotEmpty) 'societyId': societyId,

    };

    if (flatId != null) payload['flatId'] = flatId;

    if (name != null) payload['name'] = name;



    final response = await _post(

      Uri.parse(ApiEndpoints.registrationSubmit),

      headers: _headers(withAuth: false),

      body: jsonEncode(payload),

    );

    final json = _handleResponse(response);

    return json is Map<String, dynamic> ? json : {};

  }



  static Future<UserModel?> fetchCurrentUser() async {

    try {

      final response = await _get(

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

    final response = await _get(

      Uri.parse(ApiEndpoints.visitorRequests),

      headers: _headers(),

    );

    final json = _handleResponse(response);

    final list = json['data'] as List<dynamic>? ?? [];

    return list.map((item) => VisitorModel.fromJson(item as Map<String, dynamic>)).toList();

  }



  static Future<VisitorModel?> fetchVisitorRequestById(String id) async {

    try {

      final response = await _get(

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

    final response = await _post(

      Uri.parse(ApiEndpoints.approveVisitor(id)),

      headers: _headers(),

    );

    final json = _handleResponse(response);

    return json['success'] == true;

  }



  static Future<bool> rejectVisitorRequest(String id, {String reason = 'Denied by resident'}) async {

    final response = await _post(

      Uri.parse(ApiEndpoints.rejectVisitor(id)),

      headers: _headers(),

      body: jsonEncode({'reason': reason}),

    );

    final json = _handleResponse(response);

    return json['success'] == true;

  }



  static Map<String, String> getAuthHeaders() {
    final token = StorageService.getToken();
    if (token != null && token.isNotEmpty) {
      return {'Authorization': 'Bearer $token'};
    }
    return {};
  }

  static String getSecurePhotoUrl(String? rawPath) {
    if (rawPath == null || rawPath.isEmpty) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return rawPath;
    }
    final clean = rawPath.startsWith('/') ? rawPath : '/$rawPath';
    final base = ApiEndpoints.baseUrl.replaceAll(RegExp(r'/api$'), '');
    return base + clean;
  }



  // ==========================================================

  // HOUSEHOLD & VEHICLES

  // ==========================================================



  static Future<List<FamilyMemberModel>> fetchFamilyMembers() async {

    try {

      final response = await _get(

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

    final response = await _post(

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

    final response = await _delete(

      Uri.parse(ApiEndpoints.deleteFamilyMember(id)),

      headers: _headers(),

    );

    final json = _handleResponse(response);

    return json['success'] == true;

  }



  static Future<List<VehicleModel>> fetchVehicles() async {

    try {

      final response = await _get(

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

    final response = await _post(

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

    final response = await _delete(

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

      final response = await _get(

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



  static Future<bool> registerFcmToken(String fcmToken) async {

    try {

      final token = StorageService.getToken();

      if (token == null || token.isEmpty) return false;



      final response = await _post(

        Uri.parse('${ApiEndpoints.baseUrl}/notifications/fcm-token'),

        headers: _headers(),

        body: jsonEncode({

          'token': fcmToken.trim(),

          'deviceType': 'android',

        }),

      );

      final json = jsonDecode(response.body);

      return json['success'] == true;

    } catch (e) {

      debugPrint('[ApiService] Error registering FCM token: $e');

      return false;

    }

  }

  static Future<bool> unregisterFcmToken(String fcmToken) async {
    try {
      final token = StorageService.getToken();
      if (token == null || token.isEmpty) return false;

      final response = await _delete(
        Uri.parse('${ApiEndpoints.baseUrl}/notifications/fcm-token'),
        headers: _headers(),
        body: jsonEncode({
          'token': fcmToken.trim(),
        }),
      );
      final json = jsonDecode(response.body);
      return json['success'] == true;
    } catch (e) {
      debugPrint('[ApiService] Error unregistering FCM token: $e');
      return false;
    }
  }



  // ==========================================================

  // ACCOUNT DELETION (Google Play Policy Compliance)

  // ==========================================================



  static Future<bool> deleteAccount() async {

    final response = await _delete(

      Uri.parse(ApiEndpoints.deleteAccount),

      headers: _headers(),

    );

    final json = _handleResponse(response);

    return json['success'] == true;

  }


  // ==========================================================
  // PRE-APPROVED VISITOR PASSES (INVITES)
  // ==========================================================

  static Future<InviteModel> createInvite({
    required String visitorName,
    String? visitorPhone,
    String purpose = 'guest',
    String? validDate,
    String? validTime,
    String? notes,
  }) async {
    final response = await _post(
      Uri.parse(ApiEndpoints.invites),
      headers: _headers(),
      body: jsonEncode({
        'visitorName': visitorName.trim(),
        'visitorPhone': visitorPhone?.trim(),
        'purpose': purpose.trim().toLowerCase(),
        'validDate': validDate,
        'validTime': validTime,
        'notes': notes?.trim(),
      }),
    );

    final json = _handleResponse(response);
    final data = json['data'] as Map<String, dynamic>;
    return InviteModel.fromJson(data);
  }

  static Future<List<InviteModel>> fetchInvites() async {
    final response = await _get(
      Uri.parse(ApiEndpoints.invites),
      headers: _headers(),
    );

    final json = _handleResponse(response);
    final list = json['data'] as List<dynamic>? ?? [];
    return list.map((item) => InviteModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<bool> cancelInvite(String id) async {
    final response = await _delete(
      Uri.parse(ApiEndpoints.cancelInvite(id)),
      headers: _headers(),
    );

    final json = _handleResponse(response);
    return json['success'] == true;
  }

  // ==========================================================
  // SERVICES (VENDORS, UTILITIES, STAFF)
  // ==========================================================

  static Future<List<SocietyServiceModel>> fetchServices({
    String? type,
    String? category,
    String? search,
  }) async {
    final queryParams = <String, String>{};
    if (type != null && type.isNotEmpty && type.toLowerCase() != 'all') {
      queryParams['type'] = type;
    }
    if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') {
      queryParams['category'] = category;
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    final uri = Uri.parse(ApiEndpoints.services).replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final response = await _get(uri, headers: _headers());
    final json = _handleResponse(response);
    final list = json['data'] as List<dynamic>? ?? [];
    return list.map((item) => SocietyServiceModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<SocietyServiceModel> fetchServiceDetail(String id) async {
    final response = await _get(
      Uri.parse(ApiEndpoints.serviceDetail(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return SocietyServiceModel.fromJson(json['data'] as Map<String, dynamic>);
  }

  // ==========================================================
  // COMMUNITY: LOST & FOUND
  // ==========================================================

  static Future<List<LostFoundModel>> fetchLostFoundItems({
    String? type,
    String? status,
    String? search,
  }) async {
    final queryParams = <String, String>{};
    if (type != null && type.isNotEmpty && type.toUpperCase() != 'ALL') {
      queryParams['type'] = type.toUpperCase();
    }
    if (status != null && status.isNotEmpty && status.toUpperCase() != 'ALL') {
      queryParams['status'] = status.toUpperCase();
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    final uri = Uri.parse(ApiEndpoints.lostFound).replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final response = await _get(uri, headers: _headers());
    final json = _handleResponse(response);
    final list = json['data'] as List<dynamic>? ?? [];
    return list.map((item) => LostFoundModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<LostFoundModel> fetchLostFoundDetail(String id) async {
    final response = await _get(
      Uri.parse(ApiEndpoints.lostFoundDetail(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return LostFoundModel.fromJson(json['data'] as Map<String, dynamic>);
  }

  static Future<LostFoundModel> createLostFoundItem({
    required String type,
    required String title,
    required String description,
    required String category,
    required String location,
    DateTime? incidentDate,
    String? imageUrl,
  }) async {
    final response = await _post(
      Uri.parse(ApiEndpoints.lostFound),
      headers: _headers(),
      body: jsonEncode({
        'type': type.toUpperCase(),
        'title': title.trim(),
        'description': description.trim(),
        'category': category.trim(),
        'location': location.trim(),
        'incidentDate': (incidentDate ?? DateTime.now()).toIso8601String(),
        'imageUrl': imageUrl,
      }),
    );
    final json = _handleResponse(response);
    return LostFoundModel.fromJson(json['data'] as Map<String, dynamic>);
  }

  static Future<bool> updateLostFoundStatus(String id, String status) async {
    final response = await _patch(
      Uri.parse(ApiEndpoints.lostFoundStatus(id)),
      headers: _headers(),
      body: jsonEncode({'status': status.toUpperCase()}),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  static Future<bool> deleteLostFoundItem(String id) async {
    final response = await _delete(
      Uri.parse(ApiEndpoints.lostFoundDetail(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  // ==========================================================
  // COMMUNITY: EVENTS
  // ==========================================================

  static Future<List<SocietyEventModel>> fetchSocietyEvents({String filter = 'upcoming'}) async {
    final uri = Uri.parse(ApiEndpoints.events).replace(queryParameters: {'filter': filter});
    final response = await _get(uri, headers: _headers());
    final json = _handleResponse(response);
    final list = json['data'] as List<dynamic>? ?? [];
    return list.map((item) => SocietyEventModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<SocietyEventModel> fetchSocietyEventDetail(String id) async {
    final response = await _get(
      Uri.parse(ApiEndpoints.eventDetail(id)),
      headers: _headers(),
    );
    final json = _handleResponse(response);
    return SocietyEventModel.fromJson(json['data'] as Map<String, dynamic>);
  }

  static Future<bool> registerForEvent(String id, {int guestCount = 1}) async {
    final response = await _post(
      Uri.parse(ApiEndpoints.eventRegister(id)),
      headers: _headers(),
      body: jsonEncode({'guestCount': guestCount}),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

  static Future<bool> cancelEventRegistration(String id) async {
    final response = await _post(
      Uri.parse(ApiEndpoints.eventCancel(id)),
      headers: _headers(),
      body: jsonEncode({}),
    );
    final json = _handleResponse(response);
    return json['success'] == true;
  }

}
