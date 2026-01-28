import { browser } from '$app/environment';

const translations = {
    en: {
        // Navigation
        appName: 'KR Steel',
        dashboard: 'Dashboard',
        labours: 'Labours',
        visitors: 'Visitors',
        vehicles: 'Vehicles',

        // Actions
        checkIn: 'Check In',
        checkOut: 'Check Out',
        addNew: 'Add New',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',

        // Common Labels
        name: 'Name',
        phone: 'Phone',
        designation: 'Designation',
        company: 'Company',
        purpose: 'Purpose',
        vehicleNo: 'Vehicle No',
        cardNo: 'Card No',
        status: 'Status',
        actions: 'Actions',
        date: 'Date',
        entryTime: 'Entry Time',
        exitTime: 'Exit Time',
        codeNo: 'Code No',
        joinDate: 'Join Date',
        isTrained: 'Trained',

        // Labour Types
        type: 'Type',
        companyLabour: 'Company',
        contractorLabour: 'Contractor',

        // Visitor Types
        visitorType: 'Visitor Type',
        vendor: 'Vendor',
        transport: 'Transport',
        guest: 'Guest',

        // Vehicle Fields
        vehicleType: 'Vehicle Type',
        transportVehicle: 'Transport',
        regularVehicle: 'Regular',
        driverName: 'Driver Name',
        helperName: 'Helper Name',
        vendorName: 'Vendor Name',
        cargo: 'Cargo Description',
        note: 'Note',

        // Status Labels
        onPremises: 'On Premises',
        checkedOut: 'Checked Out',
        inside: 'Inside',

        // Page Sections
        registry: 'Registry',
        attendance: 'Attendance',
        monthlyReport: 'Monthly Report',
        history: 'History',
        activeLog: 'Currently Inside',

        // Search & Empty States
        searchPlaceholder: 'Search...',
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
        confirmDelete: 'Are you sure you want to delete this?',
        confirmCheckOut: 'Are you sure you want to check out?',
        certificateOk: 'Certificate OK',
        noCertificate: 'No Certificate',
        checkInImmediately: 'Check In Immediately',
        existingVisitor: 'Existing Visitor',
        newVisitor: 'New Visitor',
        selectVisitor: 'Select Visitor',
        searchVisitor: 'Search Visitor...',
        details: 'Details',
        optional: 'Optional',
        totalVisits: 'Total Visits',
        lastVisit: 'Last Visit',
        totalPresentDays: 'Total Present Days',
        avgWorkingHours: 'Avg. Working Hours',
        duration: 'Duration',
        workingHours: 'Working Hours',
        admin: 'Admin',
        userManagement: 'User Management',
        roleManagement: 'Role Management',
    },
    bn: {
        // Navigation
        appName: 'কেআর স্টিল',
        dashboard: 'ড্যাশবোর্ড',
        labours: 'শ্রমিক',
        visitors: 'দর্শনার্থী',
        vehicles: 'যানবাহন',

        // Actions
        checkIn: 'প্রবেশ',
        checkOut: 'বাহির',
        addNew: 'নতুন যোগ',
        edit: 'সম্পাদনা',
        delete: 'মুছুন',
        save: 'সংরক্ষণ',
        cancel: 'বাতিল',
        confirm: 'নিশ্চিত করুন',

        // Common Labels
        name: 'নাম',
        phone: 'মোবাইল',
        designation: 'পদবী',
        company: 'কোম্পানি',
        purpose: 'উদ্দেশ্য',
        vehicleNo: 'গাড়ির নম্বর',
        cardNo: 'কার্ড নম্বর',
        status: 'অবস্থা',
        actions: 'পদক্ষেপ',
        date: 'তারিখ',
        entryTime: 'প্রবেশের সময়',
        exitTime: 'বাহিরের সময়',
        codeNo: 'কোড নং',
        joinDate: 'যোগদানের তারিখ',
        isTrained: 'প্রশিক্ষিত',

        // Labour Types
        type: 'ধরন',
        companyLabour: 'কোম্পানি',
        contractorLabour: 'ঠিকাদার',

        // Visitor Types
        visitorType: 'দর্শনার্থীর ধরন',
        vendor: 'ভেন্ডর',
        transport: 'পরিবহন',
        guest: 'অতিথি',

        // Vehicle Fields
        vehicleType: 'গাড়ির ধরন',
        transportVehicle: 'পরিবহন',
        regularVehicle: 'সাধারণ',
        driverName: 'চালকের নাম',
        helperName: 'হেল্পারের নাম',
        vendorName: 'ভেন্ডরের নাম',
        cargo: 'মালামালের বিবরণ',
        note: 'নোট',

        // Status Labels
        onPremises: 'ভিতরে',
        checkedOut: 'বাইরে',
        inside: 'ভিতরে',

        // Page Sections
        registry: 'নিবন্ধন',
        attendance: 'উপস্থিতি',
        monthlyReport: 'মাসিক রিপোর্ট',
        history: 'ইতিহাস',
        activeLog: 'বর্তমানে ভিতরে',

        // Search & Empty States
        searchPlaceholder: 'অনুসন্ধান...',
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
        confirmDelete: 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?',
        confirmCheckOut: 'আপনি কি নিশ্চিত যে আপনি বের করে দিতে চান?',
        certificateOk: 'সার্টিফিকেট ঠিক আছে',
        noCertificate: 'সার্টিফিকেট নেই',
        checkInImmediately: 'এখনই চেক-ইন করুন',
        existingVisitor: 'বিদ্যমান দর্শনার্থী',
        newVisitor: 'নতুন দর্শনার্থী',
        selectVisitor: 'দর্শনার্থী নির্বাচন করুন',
        searchVisitor: 'দর্শনার্থী খুঁজুন...',
        details: 'বিবরণ',
        optional: 'ঐচ্ছিক',
        totalVisits: 'মোট পরিদর্শন',
        lastVisit: 'শেষ পরিদর্শন',
        totalPresentDays: 'মোট উপস্থিত দিন',
        avgWorkingHours: 'গড় কর্মঘণ্টা',
        duration: 'সময়কাল',
        workingHours: 'কর্মঘণ্টা',
        admin: 'অ্যাডমিন',
        userManagement: 'ইউজার ম্যানেজমেন্ট',
        roleManagement: 'রোল ম্যানেজমেন্ট',
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
