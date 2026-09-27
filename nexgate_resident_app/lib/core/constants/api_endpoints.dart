/// NexGate API Endpoints Configuration.
class ApiEndpoints {
  ApiEndpoints._();

  // Production Backend URL (AWS Lightsail)
  static const String defaultBaseUrl = 'https://dazclothess.com/api';
  static const String defaultSocketUrl = 'https://dazclothess.com';

  // Base URL resolution
  static String baseUrl = defaultBaseUrl;
  static String socketUrl = defaultSocketUrl;

  // Auth & Resident Registration
  static String get sendOtp => '$baseUrl/auth/resident/send-otp';
  static String get verifyOtp => '$baseUrl/auth/resident/verify-otp';
  static String get registrationFlats => '$baseUrl/auth/registration/flats';
  static String get registrationStatus => '$baseUrl/auth/registration/status';
  static String get registrationSubmit => '$baseUrl/auth/registration/submit';
  static String get me => '$baseUrl/auth/me';

  // Visitor Requests
  static String get visitorRequests => '$baseUrl/visitor-requests';
  static String visitorRequestDetail(String id) => '$baseUrl/visitor-requests/$id';
  static String visitorPhoto(String id) => '$baseUrl/visitor-requests/$id/photo';
  static String approveVisitor(String id) => '$baseUrl/visitor-requests/$id/approve';
  static String rejectVisitor(String id) => '$baseUrl/visitor-requests/$id/reject';

  // Household & Vehicles
  static String get familyMembers => '$baseUrl/resident/family-members';
  static String deleteFamilyMember(String id) => '$baseUrl/resident/family-members/$id';
  static String get vehicles => '$baseUrl/resident/vehicles';
  static String deleteVehicle(String id) => '$baseUrl/resident/vehicles/$id';

  // Notifications
  static String get notifications => '$baseUrl/notifications';
  static String get health => '$baseUrl/health';
}
