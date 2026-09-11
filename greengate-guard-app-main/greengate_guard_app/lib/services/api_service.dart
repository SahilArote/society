import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL configuration (Supports Localhost, Android Emulator 10.0.2.2, or LAN IP)
  static String baseUrl = 'http://localhost:5000/api';
  static String? _authToken;

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static void setAuthToken(String token) {
    _authToken = token;
  }

  static String get authToken => _authToken ?? 'demo_guard_token';

  // Guard Login with Guard ID / Mobile and 4-digit PIN
  static Future<Map<String, dynamic>?> login({
    required String guardIdOrPhone,
    required String pin,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/auth/login');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'guardId': guardIdOrPhone,
          'pin': pin,
          'role': 'GUARD',
        }),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final data = json['data'];
        if (data != null && data['token'] != null) {
          setAuthToken(data['token']);
        }
        return data;
      } else {
        print('Guard Login Error [${response.statusCode}]: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Network exception during guard login: $e');
      return null;
    }
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
        return null;
      }
    } catch (e) {
      print('Network exception during visitor submission: $e');
      return null;
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

  // Complete Visitor Entry (Mark as COMPLETED after resident approval)
  static Future<bool> completeVisitorRequest(String requestId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/visitor-requests/$requestId/complete'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        print('Complete Entry Error [${response.statusCode}]: ${response.body}');
        return false;
      }
    } catch (e) {
      print('Network exception during complete entry: $e');
      return false;
    }
  }

  // Fetch Society Wings and Flats Directory
  static Future<Map<String, dynamic>?> fetchDirectory() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/directory/wings-flats'),
        headers: {'Authorization': 'Bearer $authToken'},
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['data'];
      }
    } catch (e) {
      print('Error fetching directory: $e');
    }
    return null;
  }
}
