# GreenGate Resident PWA — Complete Technical & Functional Documentation

> **Project Name:** GreenGate Resident PWA  
> **Type:** Mobile-First Progressive Web Application (PWA)  
> **Target Platform:** Mobile (Android Chrome, iOS Safari), Tablet, Desktop  
> **Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS, Lucide Icons, React Router 7  

---

## 📌 Executive Overview / प्रोजेक्ट का सारांश

**GreenGate Resident PWA** एक आधुनिक, सुरक्षित और हाई-परफॉरमेंस रेजिडेंशियल सोसाइटी मैनेजमेंट वेब एप्लिकेशन है, जिसे **Progressive Web App (PWA)** के रूप में डिज़ाइन और डेवलप किया गया है। 

यह ऐप मोबाइल ब्राउज़र (Chrome, Safari, Edge) पर एक सामान्य वेबसाइट की तरह नहीं, बल्कि **इंस्टॉल होने के बाद एक असली 100% Native Mobile App (Android/iOS)** की तरह अनुभव देता है। इसमें यूज़र को URL बार, ब्राउज़र नेविगेशन बटन या वेबसाइट जैसी कोई चीज़ नहीं दिखती।

---

## 📱 PWA Features & Capabilities (PWA में क्या-क्या है?)

### 1. Web App Manifest (`public/manifest.json`)
PWA को ऑपरेटिंग सिस्टम में इंस्टॉल करने योग्य (installable) बनाने के लिए पूरा मैनिफेस्ट कॉन्फ़िगर किया गया है:
* **App Identity:** Name (`GreenGate Resident`), Short Name (`GreenGate`), Description.
* **Display Mode:** `"standalone"` और `"display_override": ["standalone", "minimal-ui"]` — ब्राउज़र का एड्रेस बार, बैक/फॉरवर्ड बटन पूरी तरह गायब रहते हैं।
* **Color Scheme:** `theme_color: "#4F46E5"` (Android status bar color), `background_color: "#F8FAFC"` (Splash background).
* **Orientation:** `"portrait-primary"` (मोबाइल ऐप की तरह फिक्स वर्टिकल ओरिएंटेशन).
* **High-Res Icons:**
  * `icon-192.png` (192×192 standard launcher icon)
  * `icon-512.png` (512×512 HD splash & app drawer icon)
  * `icon-maskable-192.png` (192×192 Android Adaptive icon with 20% safe-zone margin)
  * `icon-maskable-512.png` (512×512 Android Adaptive icon with safe-zone margin)
  * `apple-touch-icon.png` (180×180 iOS Home Screen icon)
  * `favicon-32.png` & `favicon-64.png` (Browser tab favicons)

---

### 2. Service Worker (`public/sw.js`)
ऑफलाइन सपोर्ट, फास्ट लोडिंग और बैकग्राउंड लाइफसाइकल के लिए सर्विस वर्कर तैनात है:
* **Pre-caching App Shell:** पहली बार लोड होते ही कोर फाइल्स (`/`, `/index.html`, `/manifest.json`, सभी icons) को लोकल कैश (`greengate-resident-v1.0.1`) में स्टोर करता है।
* **Stale-While-Revalidate Strategy:** JS, CSS, इमेज, फोंट्स और आइकन्स तुरंत लोकल कैश से लोड होते हैं, जबकि बैकग्राउंड में नया वर्जन फेच होकर कैश अपडेट होता है। इससे ऐप बिजली की गति से खुलती है।
* **Network-First SPA Navigation with Offline Fallback:** जब भी पेज नेविगेशन होता है, सर्विस वर्कर नेटवर्क चेक करता है; अगर नेटवर्क डाउन/ऑफलाइन हो, तो तुरंत कैश्ड `index.html` सर्व कर देता है। कोई 404 या "No Internet" डायनासोर स्क्रीन नहीं आती।
* **Skip-Waiting & Update Flow:** नया कोड डिप्लॉय होने पर सर्विस वर्कर बैकग्राउंड में अपडेट डिटेक्ट करता है और क्लाइंट UI को नोटिफिकेशन भेजता है।

---

### 3. Central PWA Install Manager (`src/services/pwaInstallManager.ts`)
एक सेंट्रलाइज्ड सिंगलटन क्लास जो PWA की पूरी इंस्टॉलेशन लाइफसाइकल को कंट्रोल करती है:
* **Early Event Interception:** पेज लोड होते ही ब्राउज़र के डिफॉल्ट `beforeinstallprompt` इवेंट को इंटरसेप्ट कर लेता है ताकि खराब दिखने वाला ब्राउज़र मिनी-इन्फोबार न दिखे।
* **Deferred Prompt Management:** यूज़र के "Install App" बटन पर क्लिक करने पर ही नेटिव डायलॉग प्रॉम्प्ट करता है।
* **1-Tap Programmatic Install:** यूज़र के चॉइस (Accepted / Dismissed) को ट्रैक करता है।
* **Standalone Mode Detection:** यह चेक करता है कि ऐप पहले से इंस्टॉल होकर स्टैंडअलोन मोड में चल रही है या ब्राउज़र टैब में (`window.matchMedia('(display-mode: standalone)')`, iOS `navigator.standalone`, Android TWA referrer)।
* **Auto-Redirect on Launch:** जब यूज़र होम स्क्रीन आइकॉन से ऐप खोलता है, तो लैंडिंग पेज बायपास होकर सीधे रेजिडेंट के `/home` डैशबोर्ड पर खुलता है।
* **Platform Detection:** ऑटोमेटिकली डिटेक्ट करता है कि यूजर **Android**, **iOS** या **Desktop** पर है।

---

### 4. Multi-Platform Fallback & Bottom Sheet (`PwaInstallSheet.tsx`)
हर प्लेटफॉर्म के लिए सीमलेस इंस्टॉलेशन एक्सपीरियंस:
* **Android Chrome / Edge:** 1-क्लिक में नेटिव ऑपरेटिंग सिस्टम का "Install GreenGate Resident" डायलॉग पॉप-अप होता है।
* **iOS Safari (iPhone/iPad):** चूंकि Apple ब्राउज़र को programmatic install prompt की अनुमति नहीं देता, ऐप एक खूबसूरत iOS-स्टैटिक बॉटम शीट खोलती है जो यूजर को 3 स्टेप्स में गाइड करती है:
  1. नीचे दिए गए **Share बटन (⎋)** पर टैप करें।
  2. मेन्यू को स्क्रॉल करके **"Add to Home Screen" (⊞)** चुनें।
  3. ऊपर दायें कोने में **"Add"** दबाएं।
* **Desktop Chrome/Edge:** एड्रेस बार के नेटिव इंस्टॉल विजेट को ट्रिगर करता है।

---

### 5. Native Splash Screen (`SplashScreen.tsx`)
* जब भी ऐप पहली बार ओपन होती है, 1.2 सेकंड का स्मूथ नेटिव मोबाइल स्पलैश स्क्रीन दिखाई देता है।
* इसमें GreenGate का शील्ड लोगो, पल्सिंग एनीमेशन और "Your Society, Smarter & Safer" स्लोगन आता है, जिसके बाद स्मूथ फेड-आउट होकर मेन ऐप खुलती है।

---

### 6. Background Update Banner (`PwaUpdateBanner.tsx`)
* जब डेवलपर्स ऐप में कोई नया फीचर या बगफिक्स रिलीज़ करते हैं, तो सर्विस वर्कर उसे बैकग्राउंड में डाउनलोड कर लेता है।
* स्क्रीन पर नॉन-इंट्रूसिव फ्लोटिंग बार आता है: *"A new version of GreenGate is available. [Update Now]"*।
* यूज़र के क्लिक करते ही सर्विस वर्कर `SKIP_WAITING` ट्रिगर करके नया वर्जन एक्टिवेट कर देता है।

---

### 7. Real-Time Offline Connectivity Pill (`OfflineIndicator.tsx`)
* इंटरनेट डिस्कनेक्ट होने पर स्क्रीन के टॉप पर ऑरेंज रंग का फ्लोटिंग स्टेटस पिल आता है: *"You are offline. Showing cached data."*
* जैसे ही कनेक्शन वापस आता है, हरा पिल दिखाई देता है: *"Back online"* और 3 सेकंड में अपने आप गायब हो जाता है।

---

## 🎨 Native Mobile-First UI/UX System

वेबसाइट जैसा फील पूरी तरह खत्म करने के लिए निम्नलिखित मोबाइल-नेटिव आर्किटेक्चर लागू किया गया है:

| फीचर | विवरण |
|---|---|
| **100dvh Rigid Shell** | स्क्रीन को `100dvh` (Dynamic Viewport Height) में लॉक किया गया है। मोबाइल कीबोर्ड खुलने या स्क्रॉल करने पर लेआउट जम्प नहीं होता। |
| **No-Overscroll Bounce** | `overscroll-behavior: none` — ब्राउज़र का पुल-टू-रिफ्रेश और रबर-बैंडिंग बाउंस खत्म किया गया है। |
| **Hardware Momentum Scrolling** | इनर स्क्रीन्स पर `-webkit-overflow-scrolling: touch` लागू है, जिससे नेटिव iOS/Android जैसी स्मूथ स्क्रॉलिंग मिलती है। |
| **Safe Area Insets** | iPhone Notch, Dynamic Island और Android Gesture Navigation Bar के लिए `pt-safe` और `pb-safe` (`env(safe-area-inset-top/bottom)`) पैडिंग दी गई है। |
| **Native App Header** | कंपैक्ट मोबाइल हेडर (`AppHeader.tsx`) जो होम स्क्रीन पर रेजिडेंट का विंग/फ्लैट (A-402) और नोटिफिकेशन घंटी दिखाता है, और सब-स्क्रीन्स पर नेटिव बैक-एरो और एक्शन बटन दिखाता है। |
| **Fixed Bottom Navigation** | 4-टैब नेविगेशन बार (`Home`, `Visitors`, `Alerts`, `Profile`) जो स्क्रीन के नीचे फिक्स रहता है और एक्टिव टैब पर सूक्ष्म एनीमेशन देता है। |
| **Touch Optimization** | हर बटन और इंटरैक्टिव एलिमेंट पर `min-h-[44px]` या `min-h-[48px]` टच टारगेट, `active:scale-[0.98]` टैप फीडबैक और `user-select: none` दिया गया है। |
| **Responsive Desktop Wrapper** | डेस्कटॉप स्क्रीन पर ऐप अपने आप एक सेंटर्ड मोबाइल फ्रेम (`max-w-[440px]`) में बदल जाती है ताकि डिज़ाइन कभी स्ट्रेच न हो। |

---

## 📱 Screens & User Flows (कुल 16+ स्क्रीन्स)

### 1. Onboarding & Installation Flow
1. **Landing Screen (`/`)**:
   * प्रीमियम हीरो विजुअल और ऐप की खासियतें (Instant Gate Approvals, Digital Visitor Passes, Family & Vehicle Management).
   * स्मार्ट डायनामिक CTA: अगर ऐप इंस्टॉल नहीं है तो *"Install Resident App"*, अगर इंस्टॉल है तो *"Open Resident App"*, और *"Continue in Browser"*।
2. **PWA Install Guide Screen (`/install`)**:
   * डिवाइस डिटेक्शन के आधार पर Android या iOS के लिए विजुअल गाइड।
3. **Login Screen (`/login`)**:
   * मोबाइल नंबर इनपुट (+91), प्राइवेसी चेकबॉक्स, क्लीन ऑटो-फोकस।
4. **OTP Verification Screen (`/verify-otp`)**:
   * 4-डिजिट ऑटो-फोकस OTP बॉक्सेस, रीसेंड टाइमर (30s) और एरर स्टेट्स।

### 2. Home & Quick Access Flow
5. **Resident Home Dashboard (`/home`)**:
   * वेलकम ग्रीटिंग: *"Welcome home, Sahil Arote (Flat A-402)"*।
   * **Real-Time Visitor Alert Card**: गेट पर आए विजिटर का तुरंत कार्ड।
   * **Quick Action Buttons Grid**: Pre-invite Visitor, Add Family, Register Vehicle, Flat Details।
   * **Security Status Card**: गेट गार्ड्स ऑन ड्यूटी और सोसाइटी सिक्योरिटी स्टेटस।
   * **Recent Gate Activity Feed**: हालिया विजिटर्स का स्टेटस (Inside, Expected, Left)।
   * **Notice Board Carousel**: सेक्रेटरी और सोसाइटी के महत्वपूर्ण नोटिस।
6. **Instant Visitor Approval Bottom Sheet (`VisitorApprovalSheet.tsx`)**:
   * जब गेट से गार्ड कॉल करता है, स्क्रीन पर तुरंत बॉटम शीट आती है जिसमें विजिटर का फोटो, नाम, डिलीवरी कंपनी (Zomato/Amazon), गाड़ी नंबर दिखता है।
   * रेजिडेंट बिना स्क्रीन बदले 1-टैप में **"Allow Entry"** (हरा बटन) या **"Deny Entry"** (लाल बटन) दबा सकता है।
7. **Full-Screen Visitor Emergency Approval (`/visitor-approval/:id`)**:
   * लाइव कैमरा स्नैपशॉट, गार्ड नोट्स और ऑडियो/कॉल गार्ड ऑप्शन के साथ डेडिकेटेड स्क्रीन।

### 3. Visitor Management Flow
8. **Visitors Hub (`/visitors`)**:
   * 3 सेगमेंटेड फिल्टर्स: **Expected** (आने वाले), **Inside** (अभी कैंपस में उपस्थित), **Past** (पुराना इतिहास)।
   * रियल-टाइम सर्च बार और विजिटर टाइप फिल्टर्स (Guest, Delivery, Cab, Service)।
9. **Pre-Invite Visitor Screen (`/invite-visitor`)**:
   * विजिटर का नाम, फोन, प्रकार (Guest / Delivery / Service), तारीख और समय स्लॉट चुनने का मोबाइल-फ्रेंडली फॉर्म।
   * एंट्री टाइप (Single Entry / Multi Entry Pass)।
10. **Digital Visitor Pass Card (`VisitorPassCard.tsx`)**:
    * 6-डिजिट एंट्री कोड और QR कोड वाला शेयर करने योग्य डिजिटल गेट पास।
    * 1-टैप में **WhatsApp पर शेयर** या **SMS** करने का बटन।
11. **Visitor Detail Screen (`/visitors/:id`)**:
    * विजिटर की पूरी प्रोफाइल, फोन नंबर, गाड़ी नंबर।
    * **Step-by-Step Gate Timeline**: 
      * `05:30 PM` - Gate Entry Initiated (Guard Ramesh)
      * `05:31 PM` - Resident Approved via App
      * `05:35 PM` - Arrived at Flat A-402
      * `06:15 PM` - Exit Logged at Gate 2

### 4. Household & Vehicle Management Flow
12. **Family Members Hub (`/family`)**:
    * फ्लैट के सभी रजिस्टर्ड परिवारजनों की लिस्ट, उनके रोल्स (Owner, Spouse, Parent, Child) और गेट परमिशन स्टेटस।
13. **Add Family Member Screen (`/add-family`)**:
    * नाम, मोबाइल नंबर, संबंध और एक्सेस परमिशन (Full Approval Access vs Read Only) सेट करने का फॉर्म।
14. **Vehicles Hub (`/vehicles`)**:
    * सभी रजिस्टर्ड टू-व्हीलर और फोर-व्हीलर की लिस्ट, नंबर प्लेट्स और अलॉटेड पार्किंग स्लॉट्स (उदा. Slot B-12, Basement 1)।
15. **Add Vehicle Screen (`/add-vehicle`)**:
    * गाड़ी का प्रकार (Car, Bike, EV), नंबर प्लेट और पार्किंग स्लॉट जोड़ने का फॉर्म।
16. **Flat Details & Society Office (`/flat`)**:
    * विंग A, 4th फ्लोर, 402, 3 BHK, 1,450 sq.ft, मेंटेनेंस ड्यू स्टेटस और सोसाइटी मैनेजर/सिक्योरिटी गेट के डायरेक्ट कॉलिंग नंबर्स।

### 5. Notifications & Profile Flow
17. **Notifications Hub (`/notifications`)**:
    * कैटेगराइज्ड टैब्स (All, Gate Alerts, Notices, Billing)।
    * "Mark all as read" और स्वाइप-टू-डिस्मिस सपोर्ट।
18. **Profile & Settings (`/profile`)**:
    * iOS-स्टाइल ग्रूप्ड लिस्ट सेटिंग्स।
    * Resident Profile, Emergency Contacts, Society Helpdesk, PWA Installation Status, Dark Mode Toggle।
    * **Native Bottom-Sheet Logout Confirmation Dialog**।

---

## 🧩 Complete Component Hierarchy (घटकों की संरचना)

```
src/
├── components/
│   ├── common/                       # PWA Core Experience
│   │   ├── SplashScreen.tsx          # 1.2s Branded Launch Splash
│   │   ├── PwaInstallSheet.tsx       # iOS/Browser Fallback Guide Sheet
│   │   └── PwaUpdateBanner.tsx       # SW Version Update Toast Banner
│   ├── layout/                       # Native Mobile App Shell
│   │   ├── ResponsiveShell.tsx       # Rigid 100dvh + Desktop 440px Wrapper
│   │   ├── AppHeader.tsx             # Context-Aware Header (Back / Title / Bell)
│   │   ├── BottomNavigation.tsx      # Fixed 4-Tab Native Bottom Bar
│   │   ├── PublicLayout.tsx          # Full-bleed Layout for Login & Modals
│   │   └── PageContainer.tsx         # Content Padding & Scroll Container
│   ├── domain/                       # Society Business Logic Cards
│   │   ├── VisitorApprovalCard.tsx   # Dashboard Gate Alert Banner
│   │   ├── VisitorApprovalSheet.tsx  # Quick Action Approval Bottom Sheet
│   │   ├── VisitorCard.tsx           # Visitor Item in List
│   │   ├── VisitorPassCard.tsx       # Shareable QR Entry Pass
│   │   ├── VisitorTimeline.tsx       # Gate Entry/Exit Audit Trail
│   │   ├── SecurityStatusCard.tsx    # Society Security Overview
│   │   ├── AnnouncementCard.tsx      # Notice Board Card
│   │   ├── FamilyMemberCard.tsx      # Household Member Card
│   │   ├── VehicleCard.tsx           # Vehicle with Parking Badge Card
│   │   ├── NotificationItem.tsx      # Notification Row with Icon
│   │   ├── OfflineIndicator.tsx      # Floating Connection State Pill
│   │   ├── OtpInput.tsx              # 4-Digit Auto-Advancing Input
│   │   └── QuickActionButton.tsx     # Home Grid Action Buttons
│   └── ui/                           # Reusable UI Primitives (16 components)
│       ├── Button.tsx                # Variants: primary, secondary, outline, danger
│       ├── IconButton.tsx            # Round/Square Icon Buttons
│       ├── Input.tsx                 # Floating labels, helper text, error state
│       ├── Select.tsx                # Native-feel Select Dropdown
│       ├── BottomSheet.tsx           # Drag-handle Mobile Modal Sheet
│       ├── Modal.tsx                 # Center Dialog Box
│       ├── Card.tsx                  # Standard Card Surface
│       ├── Badge.tsx                 # Success, Danger, Warning, Info Badges
│       ├── Avatar.tsx                # Image/Initials Avatar with status dot
│       ├── Chip.tsx                  # Selectable Filter Chips
│       ├── Toast.tsx                 # Global Toast Notification Context
│       ├── Skeleton.tsx              # Shimmer Loading Skeleton
│       ├── EmptyState.tsx            # Friendly No-Data Screens
│       ├── ErrorState.tsx            # Retryable Error Fallback
│       ├── ConfirmationDialog.tsx    # Action Confirmation Modal
│       └── Divider.tsx               # Section Separator
├── pages/                            # 16 Application Pages
├── services/
│   └── pwaInstallManager.ts          # Singleton PWA Lifecycle Manager
├── data/                             # Realistic Mock Data
│   ├── mockResident.ts               # Resident Flat & Profile Info
│   ├── mockVisitors.ts               # Expected, Inside, and Past Visitors
│   ├── mockFamily.ts                 # Family Members with Roles
│   ├── mockVehicles.ts               # Vehicles & Parking Slots
│   ├── mockAnnouncements.ts          # Society Notice Board
│   └── mockNotifications.ts          # Categorized Gate & Society Alerts
├── types/
│   └── index.ts                      # Full TypeScript Interfaces & Enums
├── index.css                         # 100dvh Lockdown, Momentum Scroll, Safe Areas
├── main.tsx                          # App Entry Point & SW Registration
└── App.tsx                           # Router Configuration & Global Providers
```

---

## 🛠️ Tech Stack & Dependencies (तकनीकी स्टैक)

| पैकेज / टूल | वर्जन | उद्देश्य |
|---|---|---|
| **React** | `^19.0.0` | मॉडर्न कंपोनेंट आर्किटेक्चर एवं फास्ट री-रेंडरिंग |
| **TypeScript** | `~5.7.2` | 100% टाइप सेफ्टी और स्ट्रिक्ट डेटा मॉडल |
| **Vite** | `^6.2.0` / `8.x` | अल्ट्रा-फास्ट HMR और ऑप्टिमाइज़्ड प्रोडक्शन बंडलिंग |
| **React Router** | `^7.2.0` | क्लाइंट-साइड SPA राउटिंग और लेआउट शेल्स |
| **Tailwind CSS** | `^3.4.17` | यूटिलिटी-फर्स्ट स्टाइलिंग, सेफ-एरिया और मोबाइल वेरिएन्ट्स |
| **Lucide React** | `^1.16.0` | 50+ क्लीन, मॉडर्न SVG आइकन्स |

---

## 🚀 How to Run, Test & Build (प्रोजेक्ट चलाने की विधि)

### 1. Development Server (लोकल रन करें)
```bash
cd "c:\Users\Sahil Arote\Desktop\society\resident-pwa"
npm install
npm run dev
```
लोकल सर्वर `http://localhost:5173` पर शुरू होगा।

### 2. Production Build (प्रोडक्शन बंडल तैयार करें)
```bash
npm run build
```
यह `dist/` फोल्डर में ऑप्टिमाइज़्ड, मिनिफ़ाइड और ट्री-शेक की गई फाइल्स जनरेट करता है।

### 3. Production PWA Preview (सर्विस वर्कर टेस्टिंग)
```bash
npm run preview
```
ब्राउज़र में `http://localhost:4173` खोलें। यहां सर्विस वर्कर पूरी तरह एक्टिव होकर काम करेगा।

---

## 📲 How to Test PWA Installation (PWA इंस्टॉलेशन की जांच कैसे करें)

### A. Android Mobile (Chrome/Edge पर)
1. अपने कंप्यूटर और मोबाइल को एक ही Wi-Fi नेटवर्क से कनेक्ट करें।
2. Vite को `--host` के साथ रन करें (`npm run preview -- --host`)।
3. मोबाइल Chrome में अपने कंप्यूटर का IP एड्रेस खोलें (उदा. `http://192.168.1.X:4173`)।
4. स्क्रीन पर नीचे **"Install Resident App"** का बटन दबाएं।
5. ऑपरेटिंग सिस्टम का नेटिव **"Add to Home Screen / Install"** डायलॉग खुलेगा।
6. इंस्टॉल करने के बाद होम स्क्रीन पर **GreenGate** का लोगो दिखाई देगा।
7. ऐप पर टैप करें — यह बिना किसी Chrome URL बार के फुल स्क्रीन में खुलेगी।

### B. iOS Mobile (iPhone / iPad Safari पर)
1. Safari ब्राउज़र में URL खोलें।
2. लैंडिंग स्क्रीन पर **"Install Resident App"** पर टैप करें।
3. स्क्रीन के नीचे से iOS गाइड बॉटम शीट खुलेगी।
4. Safari के नीचे **Share आइकन (⎋)** दबाएं और **"Add to Home Screen"** चुनें।
5. अब होम स्क्रीन से GreenGate खोलें — यह बिना Safari कंट्रोल्स के नेटिव ऐप की तरह चलेगी।

### C. Chrome Desktop (Windows/Mac)
1. Chrome ब्राउज़र में `http://localhost:4173` खोलें।
2. Chrome एड्रेस बार के दाईं तरफ एक **Install आइकॉन (⊕)** दिखाई देगा, या पेज पर मौजूद **"Install App"** बटन पर क्लिक करें।
3. "Install GreenGate Resident?" डायलॉग में **Install** पर क्लिक करें।
4. ऐप एक सेपरेट डेस्कटॉप विंडो में खुल जाएगी।

---

## 🛡️ Offline Testing (ऑफलाइन टेस्टिंग कैसे करें)

1. Chrome DevTools खोलें (`F12`)।
2. **Network** टैब में जाएं और **Throttling** को **"Offline"** पर सेट करें।
3. पेजों के बीच नेविगेट करें (`/home`, `/visitors`, `/family`, `/profile`)।
4. **रिजल्ट:**
   * स्क्रीन के टॉप पर ऑरेंज रंग का **"You are offline. Showing cached data"** पिल दिखाई देगा।
   * सभी स्क्रीन्स और कैश्ड डेटा बिना किसी क्रैश या एरर के काम करेंगे।
5. नेटवर्क को दोबारा **"Online"** करें।
6. तुरंत **"Back online"** का हरा पिल दिखाई देगा।

---

## ✅ Summary / निष्कर्ष

**GreenGate Resident PWA** एक पूर्ण, प्रोडक्शन-रेडी और टेस्टेड PWA फ्रंटएंड है जो:
1. PWA के सभी आधुनिक मानकों (Web Manifest, Service Worker, High-Res Icons, Standalone Mode) को 100% पूरा करता है।
2. मोबाइल पर इंस्टॉल होने के बाद किसी नेटिव Android/iOS ऐप से बिल्कुल भी अलग नहीं लगता।
3. 16 से अधिक पूर्णता से जुड़े हुए पेजों, रियलिस्टिक डेटा, और इंस्टेंट गेट अप्रूवल जैसी सुविधाओं से सुसज्जित है।
