import { browser } from '$app/environment';

const translations = {
    en: {
        // Navigation
        appName: 'KR Steel',
        dashboard: 'Dashboard',
        people: 'Directory',
        personLabel: 'Person',
        entryLog: 'Entry Log',
        history: 'Logs',
        vehicles: 'Vehicles',
        admin: 'Admin',

        // Admin Menu
        userManagement: 'User Management',
        roleManagement: 'Role Management',
        categoryManagement: 'Person Categories',

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
    },
    bn: {
        // Navigation
        appName: 'কেআর স্টিল',
        dashboard: 'ড্যাশবোর্ড',
        people: 'ডিরেক্টরি',
        personLabel: 'ব্যক্তি',
        entryLog: 'এন্ট্রি লগ',
        history: 'লগ',
        vehicles: 'যানবাহন',
        admin: 'অ্যাডমিন',

        // Admin Menu
        userManagement: 'ইউজার ম্যানেজমেন্ট',
        roleManagement: 'রোল ম্যানেজমেন্ট',
        categoryManagement: 'ক্যাটাগরি ম্যানেজমেন্ট',

        // Actions
        checkIn: 'প্রবেশ',
        checkOut: 'বাহির',
        register: 'নিবন্ধন',
        addNew: 'নতুন যোগ',
        edit: 'সম্পাদনা',
        delete: 'মুছুন',
        save: 'সংরক্ষণ',
        cancel: 'বাতিল',
        confirm: 'নিশ্চিত করুন',
        search: 'অনুসন্ধান',

        // Common Labels
        name: 'পুরো নাম',
        phone: 'যোগাযোগ নম্বর',
        designation: 'পদবী',
        company: 'কোম্পানি / প্রতিষ্ঠান',
        purpose: 'পরিদর্শনের উদ্দেশ্য',
        vehicleNo: 'গাড়ির নম্বর',
        cardNo: 'অ্যাক্সেস কার্ড নং',
        status: 'অবস্থা',
        actions: 'পদক্ষেপ',
        date: 'তারিখ',
        entryTime: 'প্রবেশের সময়',
        exitTime: 'বাহিরের সময়',
        codeNo: 'পরিচয় নম্বর',
        joinDate: 'যোগদানের তারিখ',
        isTrained: 'নিরাপত্তা প্রশিক্ষণ',
        category: 'ক্যাটাগরি',
        notes: 'নোট / মন্তব্য',
        biometricId: 'বায়োমেট্রিক আইডি',
        photo: 'ছবি',

        // Vehicle Fields
        vehicleType: 'গাড়ির ধরন',
        transportVehicle: 'পরিবহন',
        regularVehicle: 'সাধারণ',
        driverName: 'চালকের নাম',
        helperName: 'হেল্পারের নাম',
        vendorName: 'ভেন্ডরের নাম',
        cargo: 'মালামালের বিবরণ',
        note: 'নোট',
        checkInImmediately: 'এখনই প্রবেশ করান',

        // Categories
        customer: 'কাস্টমার',
        vendor: 'ভেন্ডর',
        supplier: 'সরবরাহকারী',
        '3rd-party': '৩য় পক্ষ',
        employee: 'কর্মচারী',
        dokandari: 'দোকানদারি',
        rolling: 'রোলিং',
        outfitting: 'আউটফিটিং',
        management: 'ম্যানেজমেন্ট',
        frontliner: 'ফ্রন্টলাইনার',

        // Status Labels
        onPremises: 'ভিতরে',
        checkedOut: 'বাইরে',
        inside: 'ভিতরে',

        // Page Sections
        registry: 'নিবন্ধন',
        summary: 'সারাংশ',
        detailed: 'বিস্তারিত',
        dailySummary: 'দৈনিক সারাংশ',
        monthlySummary: 'মাসিক সারাংশ',
        activeLog: 'বর্তমানে ভিতরে',

        // Dashboard
        currentlyInside: 'বর্তমানে ভিতরে',
        todaysActivity: 'আজকের কার্যকলাপ',
        quickActions: 'দ্রুত পদক্ষেপ',
        entries: 'প্রবেশ',
        exits: 'বাহির',
        stillInside: 'এখনো ভিতরে',
        vehiclesIn: 'যানবাহন প্রবেশ',
        vehiclesOut: 'যানবাহন বাহির',
        trend7Day: '৭ দিনের ট্রেন্ড',

        // Search & Empty States
        searchPlaceholder: 'নাম, কোড, কোম্পানি খুঁজুন...', 
        all: 'সব',
        month: 'মাস',
        daysPresent: 'উপস্থিত দিন',
        noResults: 'কোনো তথ্য পাওয়া যায়নি।',
        noData: 'কোনো তথ্য নেই।',

        // Messages
        successCheckIn: 'সফলভাবে প্রবেশ করানো হয়েছে!',
        successCheckOut: 'সফলভাবে বাহির করা হয়েছে!',
        successSaved: 'সফলভাবে সংরক্ষিত হয়েছে!',
        successDeleted: 'সফলভাবে মুছে ফেলা হয়েছে!',
        errorGeneric: 'কিছু ভুল হয়েছে।',
        errorMustExit: 'পুনরায় প্রবেশের আগে ব্যক্তিকে অবশ্যই বের হতে হবে।',
        confirmDelete: 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?',
        confirmCheckOut: 'আপনি কি নিশ্চিত যে আপনি বের করে দিতে চান?',
        details: 'বিবরণ',
        totalVisits: 'মোট পরিদর্শন',
        avgDuration: 'গড় সময়কাল',
        duration: 'সময়কাল',
        logout: 'লগআউট',
        total: 'মোট',
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
