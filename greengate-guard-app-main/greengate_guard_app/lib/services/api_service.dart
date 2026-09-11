import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL configuration (Supports Localhost, Android Emulator 10.0.2.2, or LAN IP)
  static String baseUrl = 'http://localhost:5000/api';
  static const String authToken = 'guard_token';

  static void setBaseUrl(String url) {
    baseUrl = url;
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
}
