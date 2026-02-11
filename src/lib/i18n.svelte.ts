import { browser } from '$app/environment';

const translations = {
    en: {
        // Navigation
        appName: 'KR Steel',
        dashboard: 'Dashboard',
        people: 'People',
        personLabel: 'Person',
        entryLog: 'Entry Log',
        history: 'Logs',
        vehicles: 'Vehicles',
        admin: 'Admin',

        // Admin Menu
        userManagement: 'User Management',
        roleManagement: 'Role Management',
        categoryManagement: 'Person Categories',
        devices: 'Devices',

        // Actions
        checkIn: 'Entry',
        checkOut: 'Exit',
        register: 'Registration',
        addNew: 'Add New',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        search: 'Search',

        // Common Labels
        name: 'Full Name',
        phone: 'Contact No',
        designation: 'Designation',
        company: 'Company / Organization',
        purpose: 'Purpose of Visit',
        vehicleNo: 'Vehicle Number',
        cardNo: 'Access Card No',
        status: 'Status',
        actions: 'Actions',
        date: 'Date',
        entryTime: 'Entry Time',
        exitTime: 'Exit Time',
        codeNo: 'Identity Number',
        joinDate: 'Joining Date',
        isTrained: 'Safety Trained',
        trained: 'Trained',
        untrained: 'Untrained',
        category: 'Category',
        notes: 'Notes / Remarks',
        biometricId: 'Biometric ID',
        photo: 'Photo',

        // Vehicle Fields (Restored)
        vehicleType: 'Vehicle Type',
        transportVehicle: 'Transport',
        regularVehicle: 'Regular',
        driverName: 'Driver Name',
        helperName: 'Helper Name',
        vendorName: 'Vendor Name',
        cargo: 'Cargo Description',
        note: 'Note',
        checkInImmediately: 'Check In Immediately',

        // Categories
        customer: 'Customer',
        vendor: 'Vendor',
        supplier: 'Supplier',
        '3rd-party': '3rd Party',
        employee: 'Employee',
        dokandari: 'Dokandari',
        rolling: 'Rolling',
        outfitting: 'Outfitting',
        management: 'Management',
        frontliner: 'Frontliner',

        // Biometrics
        fingerprint: 'Fingerprint',
        face: 'Face',
        card: 'Card',
        methods: 'Methods',
        registeredWith: 'Registered With',

        // Filters
        filterBy: 'Filter By',
        trainingStatus: 'Training Status',
        regMethod: 'Registration Method',

        // Status Labels
        onPremises: 'On Premises',
        checkedOut: 'Checked Out',
        inside: 'Inside',

        // Page Sections
        registry: 'Registry',
        summary: 'Summary',
        detailed: 'Detailed',
        dailySummary: 'Daily Summary',
        monthlySummary: 'Monthly Summary',
        activeLog: 'Currently Inside',

        // Dashboard
        currentlyInside: 'Currently Inside',
        todaysActivity: 'Today\'s Activity',
        quickActions: 'Quick Actions',
        entries: 'Entries',
        exits: 'Exits',
        stillInside: 'Still Inside',
        vehiclesIn: 'Vehicles In',
        vehiclesOut: 'Vehicles Out',
        trend7Day: '7-Day Trend',

        // Search & Empty States
        searchPlaceholder: 'Search name, code, company...',
        all: 'All',
        month: 'Month',
        daysPresent: 'Days Present',
        noResults: 'No results found.',
        noData: 'No data available.',

        // Messages
        successCheckIn: 'Successfully checked in!',
        successCheckOut: 'Successfully checked out!',
        successSaved: 'Saved successfully!',
        successDeleted: 'Deleted successfully!',
        errorGeneric: 'Something went wrong.',
        errorMustExit: 'Person must exit before entering again.',
        confirmDelete: 'Are you sure you want to delete this?',
        confirmCheckOut: 'Are you sure you want to check out?',
        details: 'Details',
        totalVisits: 'Total Visits',
        avgDuration: 'Avg. Duration',
        duration: 'Duration',
        logout: 'Logout',
        total: 'Total',
        auditReport: 'Audit Report',
        generate: 'Generate',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        entryRange: 'Entry Time Range',
        exitRange: 'Exit Time Range',
        clearAll: 'Clear All',
        removeEntry: 'Remove',
        printReport: 'Print Report',
        generationPanel: 'Generation Panel',
        useRealEntryTime: 'Use Real Entry Time',
        warning: 'Warning',
    },
    bn: {
        // Navigation
        appName: 'কেআর স্টিল',
        dashboard: 'ড্যাশবোর্ড',
        people: 'ব্যক্তি',
        personLabel: 'ব্যক্তি',
        entryLog: 'প্রবেশ তালিকা',
        history: 'ইতিহাস',
        vehicles: 'যানবাহন',
        admin: 'অ্যাডমিন',

        // Admin Menu
        userManagement: 'ইউজার ম্যানেজমেন্ট',
        roleManagement: 'রোল ম্যানেজমেন্ট',
        categoryManagement: 'ক্যাটাগরি ম্যানেজমেন্ট',
        devices: 'ডিভাইস',

        // Actions
        checkIn: 'এন্ট্রি',
        checkOut: 'এক্সিট',
        register: 'রেজিস্ট্রেশন',
        addNew: 'নতুন যোগ',
        edit: 'এডিট',
        delete: 'ডিলিট',
        save: 'সেভ',
        cancel: 'বাতিল',
        confirm: 'নিশ্চিত',
        search: 'সার্চ',

        // Common Labels
        name: 'নাম',
        phone: 'মোবাইল নম্বর',
        designation: 'পদবী',
        company: 'কোম্পানি',
        purpose: 'পরিদর্শনের কারণ',
        vehicleNo: 'গাড়ির নম্বর',
        cardNo: 'অ্যাক্সেস কার্ড নং',
        status: 'অবস্থা',
        actions: 'অ্যাকশন',
        date: 'তারিখ',
        entryTime: 'প্রবেশের সময়',
        exitTime: 'বাহিরের সময়',
        codeNo: 'আইডি নম্বর',
        joinDate: 'যোগদানের তারিখ',
        isTrained: 'ট্রেনিং প্রাপ্ত',
        trained: 'প্রশিক্ষিত',
        untrained: 'অপ্রশিক্ষিত',
        category: 'ক্যাটাগরি',
        notes: 'মন্তব্য',
        biometricId: 'বায়োমেট্রিক আইডি',
        photo: 'ছবি',

        // Vehicle Fields
        vehicleType: 'গাড়ির ধরন',
        transportVehicle: 'ট্রান্সপোর্ট',
        regularVehicle: 'রেগুলার',
        driverName: 'চালকের নাম',
        helperName: 'হেল্পারের নাম',
        vendorName: 'ভেন্ডরের নাম',
        cargo: 'মালামাল',
        note: 'নোট',
        checkInImmediately: 'এখনই এন্ট্রি করুন',

        // Categories
        customer: 'কাস্টমার',
        vendor: 'ভেন্ডর',
        supplier: 'সাপ্লায়ার',
        '3rd-party': 'থার্ড পার্টি',
        employee: 'এমপ্লয়ী',
        dokandari: 'দোকানদারী',
        rolling: 'রোলিং',
        outfitting: 'আউটফিটিং',
        management: 'ম্যানেজমেন্ট',
        frontliner: 'কর্মী',

        // Biometrics
        fingerprint: 'আঙ্গুলের ছাপ',
        face: 'ফেস',
        card: 'কার্ড',
        methods: 'পদ্ধতি',
        registeredWith: 'নিবন্ধিত',

        // Filters
        filterBy: 'ফিল্টার',
        trainingStatus: 'প্রশিক্ষণ',
        regMethod: 'নিবন্ধন পদ্ধতি',

        // Status Labels
        onPremises: 'ভিতরে আছেন',
        checkedOut: 'বের হয়ে গেছেন',
        inside: 'ভিতরে',

        // Page Sections
        registry: 'নিবন্ধন',
        summary: 'সারাংশ',
        detailed: 'বিস্তারিত',
        dailySummary: 'দৈনিক সারাংশ',
        monthlySummary: 'মাসিক সারাংশ',
        activeLog: 'বর্তমানে যারা আছেন',

        // Dashboard
        currentlyInside: 'বর্তমানে যারা ভিতরে',
        todaysActivity: 'আজকের তালিকা',
        quickActions: 'কুইক অ্যাকশন',
        entries: 'প্রবেশ',
        exits: 'বাহির',
        stillInside: 'ভিতরে আছেন',
        vehiclesIn: 'যানবাহন প্রবেশ',
        vehiclesOut: 'যানবাহন বাহির',
        trend7Day: 'গত ৭ দিনের চিত্র',

        // Search & Empty States
        searchPlaceholder: 'নাম, আইডি বা কোম্পানি খুঁজুন...', 
        all: 'সব',
        month: 'মাস',
        daysPresent: 'উপস্থিতি',
        noResults: 'কোনো তথ্য পাওয়া যায়নি',
        noData: 'তালিকা খালি',

        // Messages
        successCheckIn: 'সফলভাবে প্রবেশ করানো হয়েছে',
        successCheckOut: 'সফলভাবে বাহির করা হয়েছে',
        successSaved: 'সফলভাবে সেভ করা হয়েছে',
        successDeleted: 'সফলভাবে মুছে ফেলা হয়েছে',
        errorGeneric: 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন',
        errorMustExit: 'পুনরায় প্রবেশের আগে তাকে অবশ্যই এক্সিট করতে হবে',
        confirmDelete: 'আপনি কি এটি নিশ্চিতভাবে মুছতে চান?',
        confirmCheckOut: 'আপনি কি নিশ্চিতভাবে এক্সিট করতে চান?',
        details: 'বিস্তারিত',
        totalVisits: 'মোট পরিদর্শন',
        avgDuration: 'গড় অবস্থান',
        duration: 'সময়কাল',
        logout: 'লগআউট',
        total: 'মোট',
        auditReport: 'অডিট রিপোর্ট',
        generate: 'তৈরি করুন',
        selectAll: 'সব নির্বাচন',
        deselectAll: 'সব বাতিল',
        entryRange: 'প্রবেশের সময় পরিসীমা',
        exitRange: 'বাহিরের সময় পরিসীমা',
        clearAll: 'সব মুছুন',
        removeEntry: 'সরান',
        printReport: 'রিপোর্ট প্রিন্ট',
        generationPanel: 'তৈরি প্যানেল',
        useRealEntryTime: 'প্রকৃত প্রবেশের সময় ব্যবহার করুন',
        warning: 'সতর্কতা',
    }
};

type Lang = 'en' | 'bn';
type TranslationKey = keyof typeof translations['en'];

// Initialize with default; hydrate from localStorage on client
let currentLang = $state<Lang>('en');

// Call this once in root +layout.svelte inside onMount
export function initI18n() {
    if (browser) {
        const saved = localStorage.getItem('kr_hrm_lang') as Lang;
        if (saved === 'en' || saved === 'bn') currentLang = saved;
    }
}

export const i18n = {
    get lang() { return currentLang },
    setLang: (lang: Lang) => {
        currentLang = lang;
        if (browser) localStorage.setItem('kr_hrm_lang', lang);
    },
    t: (key: TranslationKey) => {
        return translations[currentLang][key] || key;
    }
};
