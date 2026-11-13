/// NexGate API Endpoints Configuration.
class ApiEndpoints {
  ApiEndpoints._();

  // Production Backend URL (AWS Lightsail)
  static const String defaultBaseUrl = 'https://nexgate.co.in/api';
  static const String defaultSocketUrl = 'https://nexgate.co.in';

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
  static String get deleteAccount => '$baseUrl/auth/account';

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

  // Pre-Approved Visitor Passes
  static String get invites => '$baseUrl/invites/resident';
  static String cancelInvite(String id) => '$baseUrl/invites/resident/$id';

  // Society Services (Vendors, Utilities, Staff)
  static String get services => '$baseUrl/resident/services';
  static String serviceDetail(String id) => '$baseUrl/resident/services/$id';

  // Community (Lost & Found, Events)
  static String get lostFound => '$baseUrl/resident/community/lost-found';
  static String lostFoundDetail(String id) => '$baseUrl/resident/community/lost-found/$id';
  static String lostFoundStatus(String id) => '$baseUrl/resident/community/lost-found/$id/status';
  static String get events => '$baseUrl/resident/community/events';
  static String eventDetail(String id) => '$baseUrl/resident/community/events/$id';
  static String eventRegister(String id) => '$baseUrl/resident/community/events/$id/register';
  static String eventCancel(String id) => '$baseUrl/resident/community/events/$id/cancel';

  // Notifications
  static String get notifications => '$baseUrl/notifications';
  static String get health => '$baseUrl/health';
}
