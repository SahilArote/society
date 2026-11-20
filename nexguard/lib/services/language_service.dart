import 'package:flutter/material.dart';
import 'storage_service.dart';

enum AppLang {
  en('en', 'English', 'English'),
  hi('hi', 'हिंदी', 'Hindi'),
  mr('mr', 'मराठी', 'Marathi');

  final String code;
  final String label;
  final String englishLabel;

  const AppLang(this.code, this.label, this.englishLabel);

  static AppLang fromCode(String? code) {
    if (code == 'hi') return AppLang.hi;
    if (code == 'mr') return AppLang.mr;
    return AppLang.en;
  }
}

class LanguageService extends ChangeNotifier {
  static final LanguageService instance = LanguageService._internal();
  LanguageService._internal();

  AppLang _currentLang = AppLang.en;
  AppLang get currentLang => _currentLang;
  String get code => _currentLang.code;

  void init(StorageService storage) {
    final savedCode = storage.getLanguage();
    _currentLang = AppLang.fromCode(savedCode);
  }

  Future<void> setLanguage(AppLang lang, StorageService storage) async {
    if (_currentLang == lang) return;
    _currentLang = lang;
    await storage.setLanguage(lang.code);
    notifyListeners();
  }

  static const Map<String, Map<String, String>> _strings = {
    // Navigation
    'navHome': {
      'en': 'Home',
      'hi': 'होम',
      'mr': 'मुख्यपृष्ठ',
    },
    'navVisitors': {
      'en': 'Visitors',
      'hi': 'आगंतुक',
      'mr': 'व्हिजिटर',
    },
    'navLogs': {
      'en': 'Logs',
      'hi': 'लॉग्स',
      'mr': 'नोंदवही',
    },
    'navProfile': {
      'en': 'Profile',
      'hi': 'प्रोफ़ाइल',
      'mr': 'प्रोफाइल',
    },

    // Kiosk & Header
    'kioskMode': {
      'en': 'KIOSK MODE',
      'hi': 'कियोस्क मोड',
      'mr': 'कियोस्क मोड',
    },
    'onDuty': {
      'en': 'ON DUTY',
      'hi': 'ड्यूटी पर',
      'mr': 'ड्युटीवर',
    },
    'verified': {
      'en': 'Verified',
      'hi': 'सत्यापित',
      'mr': 'सत्यापित',
    },

    // Dashboard Screen
    'welcomeBack': {
      'en': 'Welcome Back',
      'hi': 'स्वागत है',
      'mr': 'स्वागत आहे',
    },
    'goodMorning': {
      'en': 'Good morning',
      'hi': 'शुभ प्रभात',
      'mr': 'शुभ सकाळ',
    },
    'goodAfternoon': {
      'en': 'Good afternoon',
      'hi': 'शुभ दोपहर',
      'mr': 'शुभ दुपार',
    },
    'goodEvening': {
      'en': 'Good evening',
      'hi': 'शुभ संध्या',
      'mr': 'शुभ संध्याकाळ',
    },
    'newVisitor': {
      'en': 'New Visitor',
      'hi': 'नया आगंतुक',
      'mr': 'नवीन व्हिजिटर',
    },
    'registerCheckIn': {
      'en': 'Register check-in',
      'hi': 'चेक-इन दर्ज करें',
      'mr': 'चेक-इन नोंदवा',
    },
    'verifyPass': {
      'en': 'Verify Pass',
      'hi': 'पास जांचें',
      'mr': 'पास तपासा',
    },
    'scanPreApproved': {
      'en': 'Scan pre-approved code',
      'hi': 'स्वीकृत कोड स्कैन करें',
      'mr': 'मंजूर कोड स्कॅन करा',
    },
    'pendingApproval': {
      'en': 'Pending Approval',
      'hi': 'स्वीकृति बाकी',
      'mr': 'मंजुरी बाकी',
    },
    'approvedToday': {
      'en': 'Approved Today',
      'hi': 'आज स्वीकृत',
      'mr': 'आज मंजूर',
    },
    'rejectedToday': {
      'en': 'Rejected Today',
      'hi': 'आज अस्वीकृत',
      'mr': 'आज नाकारले',
    },
    'recentActivity': {
      'en': 'Recent Activity',
      'hi': 'हाल की गतिविधि',
      'mr': 'अलीकडील हालचाली',
    },
    'viewAll': {
      'en': 'View All',
      'hi': 'सभी देखें',
      'mr': 'सर्व पहा',
    },
    'captureVisitorPhoto': {
      'en': 'Capture Visitor Photo',
      'hi': 'आगंतुक की फोटो लें',
      'mr': 'व्हिजिटरचा फोटो घ्या',
    },
    'capturePhotoDesc': {
      'en': 'Take a photo with camera or choose from gallery',
      'hi': 'कैमरे से फोटो लें या गैलरी से चुनें',
      'mr': 'कॅमेऱ्याने फोटो घ्या किंवा गॅलरीतून निवडा',
    },
    'takePhoto': {
      'en': 'Take Photo',
      'hi': 'कैमरा (फोटो)',
      'mr': 'कॅमेरा (फोटो)',
    },
    'gallery': {
      'en': 'Gallery',
      'hi': 'गैलरी',
      'mr': 'गॅलरी',
    },
    'noVisitorsYet': {
      'en': 'No visitors yet',
      'hi': 'अभी कोई आगंतुक नहीं है',
      'mr': 'अद्याप कोणी व्हिजिटर नाही',
    },
    'closeUpper': {
      'en': 'CLOSE',
      'hi': 'बंद करें',
      'mr': 'बंद करा',
    },

    // Visitors 3-Bucket Screen
    'visitorsTitle': {
      'en': 'Gate Visitors',
      'hi': 'गेट आगंतुक',
      'mr': 'गेट व्हिजिटर',
    },
    'visitorsSubtitle': {
      'en': 'Live visitor checkpoint list',
      'hi': 'लाइव आगंतुक चेकपॉइंट सूची',
      'mr': 'थेट व्हिजिटर चेकपॉईंट यादी',
    },
    'tabPending': {
      'en': 'Pending',
      'hi': 'प्रतीक्षारत',
      'mr': 'प्रलंबित',
    },
    'tabAtGate': {
      'en': 'At Gate',
      'hi': 'गेट पर',
      'mr': 'गेटवर',
    },
    'tabInside': {
      'en': 'Inside',
      'hi': 'अंदर',
      'mr': 'आत',
    },
    'waitingForResidentApproval': {
      'en': 'Pending resident approval',
      'hi': 'निवासी की स्वीकृति बाकी है',
      'mr': 'रहिवाशांच्या मंजुरीची प्रतीक्षा आहे',
    },
    'approvedByResidentReady': {
      'en': 'Approved by resident · Ready for gate entry',
      'hi': 'निवासी द्वारा स्वीकृत · गेट प्रवेश के लिए तैयार',
      'mr': 'रहिवाशांकडून मंजूर · गेट प्रवेशासाठी सज्ज',
    },
    'deniedAtGate': {
      'en': 'Denied at gate',
      'hi': 'गेट पर रोका गया',
      'mr': 'गेटवर रोखले',
    },
    'checkedOutSociety': {
      'en': 'Checked out from society',
      'hi': 'सोसायटी से बाहर जा चुके हैं',
      'mr': 'सोसायटीबाहेर गेले आहेत',
    },
    'allowGateEntry': {
      'en': 'Allow Gate Entry',
      'hi': 'गेट प्रवेश दें',
      'mr': 'गेट प्रवेश द्या',
    },
    'logVisitorExit': {
      'en': 'Log Visitor Exit',
      'hi': 'प्रस्थान दर्ज करें',
      'mr': 'बाहेर पडल्याची नोंद करा',
    },
    'approve': {
      'en': 'Approve',
      'hi': 'मंजूर करें',
      'mr': 'मंजूर करा',
    },
    'reject': {
      'en': 'Reject',
      'hi': 'मना करें',
      'mr': 'नाकारा',
    },
    'noPendingVisitors': {
      'en': 'No pending visitors',
      'hi': 'कोई प्रतीक्षारत आगंतुक नहीं',
      'mr': 'प्रलंबित व्हिजिटर नाहीत',
    },
    'noVisitorsAtGate': {
      'en': 'No visitors waiting at gate',
      'hi': 'गेट पर कोई आगंतुक नहीं है',
      'mr': 'गेटवर कोणी व्हिजिटर नाही',
    },
    'noVisitorsInside': {
      'en': 'No visitors inside currently',
      'hi': 'अभी अंदर कोई आगंतुक नहीं है',
      'mr': 'सध्या आत कोणी व्हिजिटर नाही',
    },
    'allClearDesc': {
      'en': 'All visitor entries have been processed.',
      'hi': 'सभी आगंतुकों का कार्य पूर्ण हो चुका है।',
      'mr': 'सर्व व्हिजिटर्सची नोंद पूर्ण झाली आहे.',
    },

    // Visitor Logs Screen
    'logsTitle': {
      'en': 'Visitor Logs',
      'hi': 'विज़िटर लॉग्स',
      'mr': 'व्हिजिटर नोंदवही',
    },
    'logsSubtitle': {
      'en': 'Gate checkpoint records',
      'hi': 'गेट चेकपॉइंट रिकॉर्ड',
      'mr': 'गेट नोंदणी नोंदी',
    },
    'searchPlaceholder': {
      'en': 'Search name, flat, phone...',
      'hi': 'नाम, फ्लैट, फोन नंबर खोजें...',
      'mr': 'नाव, फ्लॅट, फोन नंबर शोधा...',
    },
    'today': {
      'en': 'Today',
      'hi': 'आज',
      'mr': 'आज',
    },
    'yesterday': {
      'en': 'Yesterday',
      'hi': 'कल',
      'mr': 'काल',
    },
    'allDates': {
      'en': 'All Dates',
      'hi': 'सभी तारीखें',
      'mr': 'सर्व तारखा',
    },
    'selectDate': {
      'en': 'Calendar',
      'hi': 'कैलेंडर',
      'mr': 'कॅलेंडर',
    },

    // Status Filters
    'statusAll': {
      'en': 'All',
      'hi': 'सभी',
      'mr': 'सर्व',
    },
    'statusApproved': {
      'en': 'Approved',
      'hi': 'स्वीकृत',
      'mr': 'मंजूर',
    },
    'statusEntered': {
      'en': 'Entered',
      'hi': 'अंदर आए',
      'mr': 'आत आले',
    },
    'statusExited': {
      'en': 'Exited',
      'hi': 'बाहर गए',
      'mr': 'बाहेर गेले',
    },
    'statusPending': {
      'en': 'Pending',
      'hi': 'प्रतीक्षारत',
      'mr': 'प्रलंबित',
    },
    'statusRejected': {
      'en': 'Rejected',
      'hi': 'अस्वीकृत',
      'mr': 'नाकारले',
    },
    'statusInside': {
      'en': 'Inside',
      'hi': 'अंदर',
      'mr': 'आत',
    },
    'waiting': {
      'en': 'Pending',
      'hi': 'प्रतीक्षारत',
      'mr': 'प्रलंबित',
    },
    'entryDeniedAtGate': {
      'en': 'Entry denied at gate',
      'hi': 'गेट पर प्रवेश रोका गया',
      'mr': 'गेटवर प्रवेश रोखला',
    },
    'entryRejected': {
      'en': 'Visitor Rejected',
      'hi': 'प्रवेश अस्वीकृत',
      'mr': 'प्रवेश नाकारला',
    },
    'entryApproved': {
      'en': 'Visitor Approved',
      'hi': 'प्रवेश स्वीकृत',
      'mr': 'प्रवेश मंजूर',
    },
    'returnToDashboard': {
      'en': 'Return to Dashboard',
      'hi': 'डैशबोर्ड पर वापस जाएं',
      'mr': 'डॅशबोर्डवर परत जा',
    },
    'exitedAt': {
      'en': 'Exited at',
      'hi': 'प्रस्थान समय',
      'mr': 'बाहेर पडण्याची वेळ',
    },

    // Counts & Empty state
    'showing': {
      'en': 'Showing',
      'hi': 'दिखा रहे हैं',
      'mr': 'दाखवत आहे',
    },
    'entries': {
      'en': 'entries',
      'hi': 'रिकॉर्ड',
      'mr': 'नोंदी',
    },
    'entry': {
      'en': 'entry',
      'hi': 'रिकॉर्ड',
      'mr': 'नोंद',
    },
    'forFilter': {
      'en': 'for',
      'hi': 'हेतु',
      'mr': 'साठी',
    },
    'newestFirst': {
      'en': 'Newest first',
      'hi': 'नए पहले',
      'mr': 'नवीनतम प्रथम',
    },
    'noRecordsTitle': {
      'en': 'No records found',
      'hi': 'कोई रिकॉर्ड नहीं मिला',
      'mr': 'कोणतीही नोंद सापडली नाही',
    },
    'noRecordsDesc': {
      'en': 'No visitors found for the selected date or filters.',
      'hi': 'चुनी गई तारीख या फ़िल्टर के लिए कोई विज़िटर नहीं मिला।',
      'mr': 'निवडलेल्या तारखेसाठी किंवा फिल्टरसाठी कोणताही व्हिजिटर सापडला नाही.',
    },
    'resetFilters': {
      'en': 'Reset Filters',
      'hi': 'फ़िल्टर हटाएं',
      'mr': 'फिल्टर काढा',
    },

    // Card & Modal Details
    'flat': {
      'en': 'Flat',
      'hi': 'फ्लैट',
      'mr': 'फ्लॅट',
    },
    'host': {
      'en': 'Host',
      'hi': 'निवासी',
      'mr': 'रहिवासी',
    },
    'visitorDetails': {
      'en': 'Visitor Details',
      'hi': 'आगंतुक विवरण',
      'mr': 'व्हिजिटर तपशील',
    },
    'flatAndWing': {
      'en': 'Flat & Wing',
      'hi': 'फ्लैट और विंग',
      'mr': 'फ्लॅट आणि विंग',
    },
    'resident': {
      'en': 'Resident',
      'hi': 'निवासी',
      'mr': 'रहिवासी',
    },
    'purpose': {
      'en': 'Purpose',
      'hi': 'आने का कारण',
      'mr': 'येण्याचे कारण',
    },
    'company': {
      'en': 'Company',
      'hi': 'कंपनी',
      'mr': 'कंपनी',
    },
    'vehicle': {
      'en': 'Vehicle',
      'hi': 'वाहन नंबर',
      'mr': 'गाडी क्रमांक',
    },
    'requestTime': {
      'en': 'Arrival Time',
      'hi': 'पहुंचने का समय',
      'mr': 'पोहोचण्याची वेळ',
    },
    'decisionTime': {
      'en': 'Decision Time',
      'hi': 'निर्णय समय',
      'mr': 'निर्णयाची वेळ',
    },
    'approvalTime': {
      'en': 'Approval Time',
      'hi': 'स्वीकृति समय',
      'mr': 'मंजूरी वेळ',
    },
    'rejectionTime': {
      'en': 'Rejection Time',
      'hi': 'अस्वीकृति समय',
      'mr': 'नाकारलेली वेळ',
    },
    'entryTime': {
      'en': 'Entry Time',
      'hi': 'गेट प्रवेश समय',
      'mr': 'गेट प्रवेश वेळ',
    },
    'exitTime': {
      'en': 'Exit Time',
      'hi': 'प्रस्थान समय',
      'mr': 'बाहेर पडण्याची वेळ',
    },
    'actionBy': {
      'en': 'Action By',
      'hi': 'किसने किया',
      'mr': 'कृती कोणी केली',
    },
    'rejectionReason': {
      'en': 'Rejection Reason',
      'hi': 'मना करने का कारण',
      'mr': 'नाकारण्याचे कारण',
    },
    'callResident': {
      'en': 'Call Resident',
      'hi': 'निवासी को कॉल करें',
      'mr': 'रहिवाशांना कॉल करा',
    },
    'close': {
      'en': 'Close',
      'hi': 'बंद करें',
      'mr': 'बंद करा',
    },
    'pinchToZoom': {
      'en': 'Pinch to zoom in / out',
      'hi': 'फ़ोटो ज़ूम करने के लिए पिंच करें',
      'mr': 'फोटो झूम करण्यासाठी पिंच करा',
    },
    'inTime': {
      'en': 'In',
      'hi': 'अंदर',
      'mr': 'आत',
    },
    'outTime': {
      'en': 'Out',
      'hi': 'बाहर',
      'mr': 'बाहेर',
    },

    // Profile Screen
    'appLanguage': {
      'en': 'APP LANGUAGE / भाषा',
      'hi': 'ऐप की भाषा / LANGUAGE',
      'mr': 'अॅपची भाषा / LANGUAGE',
    },
    'languageDesc': {
      'en': 'Select preferred language for easy reading',
      'hi': 'आसान उपयोग के लिए अपनी भाषा चुनें',
      'mr': 'सुलभ वापरासाठी तुमची भाषा निवडा',
    },
    'stationAssignment': {
      'en': 'STATION ASSIGNMENT',
      'hi': 'तैनाती स्थल (स्टेशन)',
      'mr': 'ड्युटी ठिकाण (स्टेशन)',
    },
    'societyComplex': {
      'en': 'Society complex',
      'hi': 'सोसायटी परिसर',
      'mr': 'सोसायटी परिसर',
    },
    'gateCheckpoint': {
      'en': 'Gate checkpoint',
      'hi': 'गेट चेकपॉइंट',
      'mr': 'गेट चेकपॉईंट',
    },
    'shiftHours': {
      'en': 'Shift hours',
      'hi': 'शिफ्ट समय',
      'mr': 'शिफ्ट वेळ',
    },
    'badgeId': {
      'en': 'BADGE ID',
      'hi': 'बैज आईडी',
      'mr': 'बॅज आयडी',
    },
    'securityOfficer': {
      'en': 'Security Officer',
      'hi': 'सुरक्षा अधिकारी',
      'mr': 'सुरक्षा रक्षक',
    },
    'changePin': {
      'en': 'Change Security PIN',
      'hi': 'सुरक्षा पिन बदलें',
      'mr': 'सुरक्षा पिन बदला',
    },
    'logout': {
      'en': 'Logout',
      'hi': 'लॉग आउट',
      'mr': 'लॉग आउट',
    },
  };

  String tr(String key) {
    final entry = _strings[key];
    if (entry == null) return key;
    return entry[_currentLang.code] ?? entry['en'] ?? key;
  }
}

// Convenient global helper
String tr(String key) => LanguageService.instance.tr(key);
