class SocietyEventModel {
  final String id;
  final String societyId;
  final String createdBy;
  final String title;
  final String description;
  final String category;
  final DateTime eventDate;
  final DateTime? endDate;
  final String timeStr;
  final String venue;
  final String organizer;
  final String? coverImage;
  final int capacity;
  final int registrationCount;
  final String status; // UPCOMING, ONGOING, COMPLETED, CANCELLED
  final bool isRegistered;
  final int? guestCount;

  const SocietyEventModel({
    required this.id,
    required this.societyId,
    required this.createdBy,
    required this.title,
    required this.description,
    required this.category,
    required this.eventDate,
    this.endDate,
    required this.timeStr,
    required this.venue,
    required this.organizer,
    this.coverImage,
    this.capacity = 0,
    this.registrationCount = 0,
    this.status = 'UPCOMING',
    this.isRegistered = false,
    this.guestCount,
  });

  bool get isUpcoming => status.toUpperCase() == 'UPCOMING';
  bool get isCompleted => status.toUpperCase() == 'COMPLETED';
  bool get isCancelled => status.toUpperCase() == 'CANCELLED';
  bool get isFull => capacity > 0 && registrationCount >= capacity;

  factory SocietyEventModel.fromJson(Map<String, dynamic> json) {
    return SocietyEventModel(
      id: json['id']?.toString() ?? '',
      societyId: json['societyId']?.toString() ?? json['society_id']?.toString() ?? '',
      createdBy: json['createdBy']?.toString() ?? json['created_by']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Celebration',
      eventDate: json['eventDate'] != null
          ? DateTime.tryParse(json['eventDate'].toString()) ?? DateTime.now()
          : (json['event_date'] != null ? DateTime.tryParse(json['event_date'].toString()) ?? DateTime.now() : DateTime.now()),
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'].toString())
          : (json['end_date'] != null ? DateTime.tryParse(json['end_date'].toString()) : null),
      timeStr: json['timeStr']?.toString() ?? json['time_str']?.toString() ?? '',
      venue: json['venue']?.toString() ?? '',
      organizer: json['organizer']?.toString() ?? 'Society Committee',
      coverImage: json['coverImage']?.toString() ?? json['cover_image']?.toString(),
      capacity: (json['capacity'] != null) ? int.tryParse(json['capacity'].toString()) ?? 0 : 0,
      registrationCount: (json['registrationCount'] != null)
          ? int.tryParse(json['registrationCount'].toString()) ?? 0
          : (json['registration_count'] != null ? int.tryParse(json['registration_count'].toString()) ?? 0 : 0),
      status: json['status']?.toString().toUpperCase() ?? 'UPCOMING',
      isRegistered: json['isRegistered'] == true || json['is_user_registered'] == 1 || json['is_user_registered'] == true,
      guestCount: json['guestCount'] != null ? int.tryParse(json['guestCount'].toString()) : (json['user_guest_count'] != null ? int.tryParse(json['user_guest_count'].toString()) : null),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'societyId': societyId,
    'createdBy': createdBy,
    'title': title,
    'description': description,
    'category': category,
    'eventDate': eventDate.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'timeStr': timeStr,
    'venue': venue,
    'organizer': organizer,
    'coverImage': coverImage,
    'capacity': capacity,
    'registrationCount': registrationCount,
    'status': status,
    'isRegistered': isRegistered,
    'guestCount': guestCount,
  };
}

