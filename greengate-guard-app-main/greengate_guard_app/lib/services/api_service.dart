import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL configuration (Supports Localhost, LAN IP, or Cloud domain)
  static String baseUrl = 'https://society-d521.onrender.com/api';
  static String? _authToken;


  static void setBaseUrl(String url) {
    String cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = '$cleanUrl/api';
    }
    baseUrl = cleanUrl;
  }

  static void setAuthToken(String token) {
    _authToken = token;
  }

  static String get authToken => _authToken ?? '';

  static Future<String> ensureAuthToken() async {
    if (_authToken != null && _authToken!.isNotEmpty) {
      return _authToken!;
    }
    // Auto-login with guard credentials to obtain live backend JWT token
    final result = await loginGuard(guardIdOrPhone: 'guard_ramesh', pin: '1234');
    if (result == null || _authToken == null || _authToken!.isEmpty) {
      throw Exception('Authentication failed. Guard login required.');
    }
    return _authToken!;
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
        final json = jsonDecode(response.body);
        final token = json['token'] ?? json['data']?['token'];
        if (json['success'] == true && token != null) {
          setAuthToken(token.toString());
          return json;
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
        final json = jsonDecode(response.body);
        return json['data'];
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
      if (phoneNumber != null) request.fields['mobile'] = phoneNumber;
      request.fields['purpose'] = purpose;
      request.fields['visitorType'] = visitorType;
      request.fields['buildingWing'] = buildingWing;
      request.fields['flatNumber'] = flatNumber;
      request.fields['residentName'] = residentName;
      request.fields['residentPhone'] = residentPhone;
      if (vehicleNumber != null) request.fields['vehicleNumber'] = vehicleNumber;
      if (deliveryCompany != null) request.fields['deliveryCompany'] = deliveryCompany;

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
        final json = jsonDecode(response.body);
        return json['data'];
      } else {
        print('API Error [${response.statusCode}]: ${response.body}');
        try {
          final json = jsonDecode(response.body);
          if (json['error'] != null && json['error']['message'] != null) {
            throw Exception(json['error']['message']);
          }
        } on Exception {
          rethrow;
        } catch (_) {}
        return null;
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
        final json = jsonDecode(response.body);
        return json['data'];
      }
    } catch (e) {
      print('Error fetching requests: $e');
    }
    return null;
  }
}

