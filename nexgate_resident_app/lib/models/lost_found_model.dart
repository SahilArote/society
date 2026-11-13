class LostFoundModel {
  final String id;
  final String societyId;
  final String authorId;
  final String authorName;
  final String authorFlat;
  final String? authorPhone;
  final String type; // LOST, FOUND
  final String title;
  final String description;
  final String category;
  final String location;
  final DateTime incidentDate;
  final String? imageUrl;
  final String status; // ACTIVE, RESOLVED, CLOSED
  final DateTime createdAt;

  const LostFoundModel({
    required this.id,
    required this.societyId,
    required this.authorId,
    required this.authorName,
    required this.authorFlat,
    this.authorPhone,
    required this.type,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.incidentDate,
    this.imageUrl,
    this.status = 'ACTIVE',
    required this.createdAt,
  });

  bool get isLost => type.toUpperCase() == 'LOST';
  bool get isFound => type.toUpperCase() == 'FOUND';
  bool get isResolved => status.toUpperCase() == 'RESOLVED';
  bool get isActive => status.toUpperCase() == 'ACTIVE';

  factory LostFoundModel.fromJson(Map<String, dynamic> json) {
    return LostFoundModel(
      id: json['id']?.toString() ?? '',
      societyId: json['societyId']?.toString() ?? json['society_id']?.toString() ?? '',
      authorId: json['authorId']?.toString() ?? json['author_id']?.toString() ?? '',
      authorName: json['authorName']?.toString() ?? json['author_name']?.toString() ?? 'Resident',
      authorFlat: json['authorFlat']?.toString() ?? json['author_flat']?.toString() ?? '',
      authorPhone: json['authorPhone']?.toString() ?? json['author_phone']?.toString(),
      type: json['type']?.toString().toUpperCase() ?? 'LOST',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      location: json['location']?.toString() ?? '',
      incidentDate: json['incidentDate'] != null 
          ? DateTime.tryParse(json['incidentDate'].toString()) ?? DateTime.now()
          : (json['incident_date'] != null ? DateTime.tryParse(json['incident_date'].toString()) ?? DateTime.now() : DateTime.now()),
      imageUrl: json['imageUrl']?.toString() ?? json['image_url']?.toString(),
      status: json['status']?.toString().toUpperCase() ?? 'ACTIVE',
      createdAt: json['createdAt'] != null 
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : (json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now()),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'societyId': societyId,
    'authorId': authorId,
    'authorName': authorName,
    'authorFlat': authorFlat,
    'authorPhone': authorPhone,
    'type': type,
    'title': title,
    'description': description,
    'category': category,
    'location': location,
    'incidentDate': incidentDate.toIso8601String(),
    'imageUrl': imageUrl,
    'status': status,
    'createdAt': createdAt.toIso8601String(),
  };
}

