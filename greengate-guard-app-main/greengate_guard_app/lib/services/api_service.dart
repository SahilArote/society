import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL configuration (Supports Localhost, LAN IP, or Cloud domain)
  static String baseUrl = 'https://society-d521.onrender.com/api';
  static String? _authToken;

  static void setBaseUrl(String url) {
    var clean = url.trim();
    while (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (clean.isNotEmpty && !clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    if (clean.isNotEmpty) {
      baseUrl = clean;
    }
  }

  static void setAuthToken(String token) {
    _authToken = token;
  }

  static String get authToken => _authToken ?? 'guard_token';

  static Map<String, dynamic>? _safeParseJson(String body) {
    final trimmed = body.trim();
    if (trimmed.isEmpty || trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      return null;
    }
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<String> ensureAuthToken() async {
    if (_authToken != null && _authToken!.isNotEmpty && _authToken != 'guard_token') {
      return _authToken!;
    }
    // Auto-login to obtain live backend JWT token
    await loginGuard(guardIdOrPhone: 'guard_ramesh', pin: '1234');
    return _authToken ?? 'guard_token';
  }

  // Guard Login with Backend Authentication
  static Future<Map<String, dynamic>?> loginGuard({
    required String guardIdOrPhone,
    required String pin,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/guard/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'guardIdOrMobile': guardIdOrPhone.trim(),
          'guardId': guardIdOrPhone.trim(),
          'mobile': guardIdOrPhone.trim(),
          'pin': pin.trim(),
        }),
      );

      if (response.statusCode == 200) {
        final json = _safeParseJson(response.body);
        if (json != null) {
          final token = json['token'] ?? json['data']?['token'];
          if (json['success'] == true && token != null) {
            setAuthToken(token.toString());
            return json;
          }
        }
      } else {
        print('Guard Login Failed [${response.statusCode}]: ${response.body}');
      }
    } catch (e) {
      print('Exception during guard login: $e');
    }
    return null;
  }

  // Fetch Directory (Wings & Flats)
  static Future<Map<String, dynamic>?> fetchDirectory() async {
    try {
      await ensureAuthToken();
      final response = await http.get(
        Uri.parse('$baseUrl/visitor-requests/directory'),
        headers: {'Authorization': 'Bearer $authToken'},
      );
      if (response.statusCode == 200) {
        final json = _safeParseJson(response.body);
        return json?['data'];
      } else {
        print('Error fetching directory [${response.statusCode}]: ${response.body}');
      }
    } catch (e) {
      print('Error fetching directory: $e');
    }
    return null;
  }

  // Submit Visitor Entry with Photo Upload
  static Future<Map<String, dynamic>?> submitVisitorRequest({
    required String name,
    String? phoneNumber,
    String? photoPath,
    required String purpose,
    required String visitorType,
    required String buildingWing,
    required String flatNumber,
    required String residentName,
    required String residentPhone,
    String? vehicleNumber,
    String? deliveryCompany,
  }) async {
    try {
      await ensureAuthToken();
      final uri = Uri.parse('$baseUrl/visitor-requests');
      final request = http.MultipartRequest('POST', uri);

      request.headers['Authorization'] = 'Bearer $authToken';

      request.fields['name'] = name;
      if (phoneNumber != null && phoneNumber.isNotEmpty) request.fields['mobile'] = phoneNumber;
      request.fields['purpose'] = purpose;
      request.fields['visitorType'] = visitorType;
      request.fields['buildingWing'] = buildingWing;
      request.fields['flatNumber'] = flatNumber;
      request.fields['residentName'] = residentName;
      request.fields['residentPhone'] = residentPhone;
      if (vehicleNumber != null && vehicleNumber.isNotEmpty) request.fields['vehicleNumber'] = vehicleNumber;
      if (deliveryCompany != null && deliveryCompany.isNotEmpty) request.fields['deliveryCompany'] = deliveryCompany;

      // Attach Photo File if present
      if (photoPath != null && photoPath.isNotEmpty) {
        final file = File(photoPath);
        if (await file.exists()) {
          request.files.add(
            await http.MultipartFile.fromPath('photo', photoPath),
          );
        }
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = _safeParseJson(response.body);
        if (json != null && json['data'] != null) {
          return json['data'];
        }
        return {'id': 'REQ-${DateTime.now().millisecondsSinceEpoch}'};
      } else {
        print('API Error [${response.statusCode}]: ${response.body}');
        final json = _safeParseJson(response.body);
        if (json != null && json['error'] != null && json['error']['message'] != null) {
          throw Exception(json['error']['message']);
        }
        if (response.body.trim().startsWith('<') || response.statusCode == 404) {
          throw Exception('Backend API endpoint error [HTTP ${response.statusCode}]. Please check backend URL.');
        }
        throw Exception('Failed to submit visitor request [HTTP ${response.statusCode}]');
      }
    } catch (e) {
      print('Network/API exception during visitor submission: $e');
      rethrow;
    }
  }

  // Fetch Requests (History / Poll Status)
  static Future<List<dynamic>?> fetchVisitorRequests() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/visitor-requests'),
        headers: {'Authorization': 'Bearer $authToken'},
      );

      if (response.statusCode == 200) {
        final json = _safeParseJson(response.body);
        return json?['data'];
      }
    } catch (e) {
      print('Error fetching requests: $e');
    }
    return null;
  }
}
