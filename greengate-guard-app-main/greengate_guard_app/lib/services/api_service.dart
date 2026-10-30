import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ApiService {
  // Base URL configuration (AWS Lightsail - Strictly HTTPS)
  static String baseUrl = 'https://dazclothess.com/api';
  static String? _authToken;

  /// Global strict 15-second timeout duration for all HTTP requests
  static const Duration timeoutDuration = Duration(seconds: 15);

  /// Callback dispatched when the server rejects authentication (401 Unauthorized)
  static VoidCallback? onUnauthorized;

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

  static void _handle401() {
    print('[ApiService] 401 Unauthorized received. Evicting session and logging out.');
    _authToken = null;
    onUnauthorized?.call();
  }

  static Future<String> ensureAuthToken() async {
    if (_authToken != null && _authToken!.isNotEmpty) {
      return _authToken!;
    }
    throw Exception('Authentication required. Guard login needed.');
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
      ).timeout(timeoutDuration);

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
    } on TimeoutException {
      print('[ApiService] Login request timed out after 15 seconds.');
      throw Exception('Connection timed out. Please check your internet connection.');
    } catch (e) {
      print('Exception during guard login: $e');
      rethrow;
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
      ).timeout(timeoutDuration);

      if (response.statusCode == 401) {
        _handle401();
        return null;
      }

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['data'];
      } else {
        print('Error fetching directory [${response.statusCode}]: ${response.body}');
      }
    } on TimeoutException {
      print('[ApiService] Fetch directory timed out after 15 seconds.');
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

      request.fields['name'] = name.trim();
      if (phoneNumber != null && phoneNumber.trim().isNotEmpty) {
        request.fields['mobile'] = phoneNumber.trim();
      }
      request.fields['purpose'] = purpose.trim();
      request.fields['visitorType'] = visitorType.trim();
      request.fields['buildingWing'] = buildingWing.trim();
      request.fields['flatNumber'] = flatNumber.trim();
      request.fields['residentName'] = residentName.trim();
      request.fields['residentPhone'] = residentPhone.trim();
      if (vehicleNumber != null && vehicleNumber.trim().isNotEmpty) {
        request.fields['vehicleNumber'] = vehicleNumber.trim();
      }
      if (deliveryCompany != null && deliveryCompany.trim().isNotEmpty) {
        request.fields['deliveryCompany'] = deliveryCompany.trim();
      }

      if (photoPath != null && photoPath.isNotEmpty) {
        final file = File(photoPath);
        if (await file.exists()) {
          final ext = photoPath.split('.').last.toLowerCase();
          final String subType;
          if (ext == 'png') {
            subType = 'png';
          } else if (ext == 'webp') {
            subType = 'webp';
          } else if (ext == 'heic') {
            subType = 'heic';
          } else if (ext == 'heif') {
            subType = 'heif';
          } else {
            subType = 'jpeg';
          }

          request.files.add(
            await http.MultipartFile.fromPath(
              'photo',
              photoPath,
              contentType: MediaType('image', subType),
            ),
          );
        }
      }

      final streamedResponse = await request.send().timeout(timeoutDuration);
      final response = await http.Response.fromStream(streamedResponse).timeout(timeoutDuration);

      if (response.statusCode == 401) {
        _handle401();
        throw Exception('Session expired (401). Please log in again.');
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body);
        return json['data'];
      } else {
        print('API Error [${response.statusCode}]: ${response.body}');
        try {
          final json = jsonDecode(response.body);
          if (json is Map<String, dynamic> && json['error'] != null) {
            final msg = json['error']['message'] ?? json['error']['code'];
            if (msg != null) {
              throw Exception(msg.toString());
            }
          }
        } on Exception {
          rethrow;
        } catch (_) {}

        if (response.statusCode == 404) {
          throw Exception('Backend API endpoint not found [HTTP 404]. Please verify backend server.');
        } else if (response.statusCode == 413) {
          throw Exception('Photo exceeds the maximum allowed size of 10MB.');
        } else if (response.statusCode >= 500) {
          throw Exception('Backend server error [HTTP ${response.statusCode}]. Please try again.');
        }
        throw Exception('Failed to submit visitor request [HTTP ${response.statusCode}].');
      }
    } on TimeoutException {
      print('[ApiService] Submit visitor request timed out after 15 seconds.');
      throw Exception('Request timed out after 15 seconds. Please try again.');
    } catch (e) {
      print('Network/API exception during visitor submission: $e');
      rethrow;
    }
  }

  // Fetch Requests (History / Poll Status)
  static Future<List<dynamic>?> fetchVisitorRequests() async {
    try {
      await ensureAuthToken();
      final response = await http.get(
        Uri.parse('$baseUrl/visitor-requests'),
        headers: {'Authorization': 'Bearer $authToken'},
      ).timeout(timeoutDuration);

      if (response.statusCode == 401) {
        _handle401();
        return null;
      }

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return json['data'];
      }
    } on TimeoutException {
      print('[ApiService] Fetch visitor requests timed out after 15 seconds.');
    } catch (e) {
      print('Error fetching requests: $e');
    }
    return null;
  }
}
