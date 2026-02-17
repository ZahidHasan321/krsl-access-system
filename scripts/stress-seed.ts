/**
 * Realistic Stress Seed Script for KR Steel CRM
 */
import pg from 'pg';
import { format, subDays, startOfDay, addHours, addMinutes, isAfter } from 'date-fns';
import crypto from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const enNames = ["Zahid Hasan", "Abdur Rahman", "Sumon Ahmed", "Kamrul Islam", "Tanveer Hossain", "Mehedi Hasan", "Shoriful Islam", "Anisur Rahman", "Mahbub Alam", "Faruk Ahmed", "Sajidul Islam", "Rashed Khan", "Mizanur Rahman", "Asif Iqbal", "Saiful Islam", "Nurul Huda", "Ibrahim Khalil", "Mustafizur Rahman", "Jashim Uddin", "Arifur Rahman", "Siddiqur Rahman", "Tariqul Islam", "Golam Sarwar", "Fazle Rabbi", "Enamul Haque"];
const bnNames = ["মোঃ শফিকুল ইসলাম", "কামরুল হাসান", "আরিফুর রহমান", "নূর আলম", "সৈয়দ আহমেদ", "আব্দুল্লাহ আল মামুন", "রেজাউল করিম", "তৌহিদুল ইসলাম", "মোস্তাফিজুর রহমান", "জাহিদুল ইসলাম", "হাসান মাহমুদ", "শামীম রেজা", "আশরাফুল ইসলাম", "মতিউর রহমান", "সাইফুল ইসলাম", "নুরুল হক", "ইব্রাহিম খলিল", "জসিম উদ্দিন", "আরিফুল ইসলাম", "মাসুদ রানা", "শাহাদাত হোসেন", "খোরশেদ আলম", "আজহারুল ইসলাম", "ওমর ফারুক", "সাইদ হাসান"];

const enCompanies = ["KR Steel Ltd", "Shipyard Corp", "Build Masters", "Steel Dynamics", "Industrial Hub", "Oceanic Build", "Steel Worx", "Desh Logistics", "Bengal Engineering", "Modern Structures", "Elite Builders"];
const bnCompanies = ["যমুনা স্টিল", "বসুন্ধরা গ্রুপ", "মেঘনা গ্রুপ", "আকিজ সাপ্লাইয়ার্স", "দেশ টেক্সটাইল", "পদ্মা কন্সট্রাকশন", "সিটি স্টিল মিলস", "এস আলম ট্রেডিং", "প্রগতি ইঞ্জিনিয়ারিং", "উত্তরা ফ্যাবরিক্স"];

const enPurposes = ["Official Meeting", "Cargo Delivery", "Site Visit", "Equipment Maintenance", "Interview", "Audit", "General Inquiry", "Document Signing", "Security Check"];
const bnPurposes = ["অফিসিয়াল মিটিং", "মালামাল ডেলিভারি", "সাইট ভিজিট", "সরঞ্জাম রক্ষণাবেক্ষণ", "সাক্ষাৎকার", "অডিট", "সাধারণ জিজ্ঞাসা", "কাগজপত্র স্বাক্ষর", "নিরাপত্তা যাচাই"];

const bnCargo = ["স্টিলের রড", "সিমেন্টের বস্তা", "যন্ত্রাংশ", "কাঁচামাল", "জ্বালানি", "আসবাবপত্র", "অফিস সামগ্রী", "বালু", "ইট", "কয়লা"];

function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomIdentity() {
    const isBangla = Math.random() > 0.5;
    return {
        name: getRandom(isBangla ? bnNames : enNames),
        company: getRandom(isBangla ? bnCompanies : enCompanies)
    };
}

async function run() {
    console.log('Starting Realistic Stress Seed...');
    const now = new Date();
    const photoUrl = '/uploads/people/dummy-avatar.png';

    // 1. Categories
    console.log('Syncing categories...');
    const categories = [
        { id: 'customer', name: 'Customer', slug: 'customer', parentId: null },
        { id: 'vendor', name: 'Vendor', slug: 'vendor', parentId: null },
        { id: 'employee', name: 'Employee', slug: 'employee', parentId: null },
        { id: 'dokandari', name: 'Dokandari', slug: 'dokandari', parentId: 'customer' },
        { id: 'rolling', name: 'Rolling', slug: 'rolling', parentId: 'customer' },
        { id: 'outfitting', name: 'Outfitting', slug: 'outfitting', parentId: 'customer' },
        { id: 'supplier', name: 'Supplier', slug: 'supplier', parentId: 'vendor' },
        { id: '3rd-party', name: '3rd Party', slug: '3rd-party', parentId: 'vendor' },
        { id: 'management', name: 'Management', slug: 'management', parentId: 'employee' },
        { id: 'frontliner', name: 'Frontliner', slug: 'frontliner', parentId: 'employee' }
    ];

    for (const c of categories) {
        await client.query(
            'INSERT INTO person_categories (id, name, slug, parent_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
            [c.id, c.name, c.slug, c.parentId]
        );
    }

    // 2. People
    console.log('Generating 2000+ people...');
    const people: any[] = [];

    // Employees
    for (let i = 0; i < 100; i++) {
        people.push({
            id: crypto.randomUUID(),
            name: getRandom(Math.random() > 0.5 ? bnNames : enNames),
            categoryId: 'management',
            codeNo: `MGMT-${1000 + i}-${Math.floor(Math.random() * 10000)}`,
            company: 'KR Steel Ltd',
            designation: 'Management',
            isTrained: true
        });
    }
    for (let i = 0; i < 400; i++) {
        people.push({
            id: crypto.randomUUID(),
            name: getRandom(Math.random() > 0.5 ? bnNames : enNames),
            categoryId: 'frontliner',
            codeNo: `FL-${2000 + i}-${Math.floor(Math.random() * 10000)}`,
            company: 'KR Steel Ltd',
            designation: 'Frontliner',
            isTrained: true
        });
    }
    // Others
    const otherCats = ['supplier', '3rd-party', 'dokandari', 'rolling', 'outfitting', 'vendor', 'customer'];
    for (let i = 0; i < 1500; i++) {
        const iden = getRandomIdentity();
        people.push({
            id: crypto.randomUUID(),
            name: iden.name,
            categoryId: getRandom(otherCats),
            codeNo: `OUT-${5000 + i}-${Math.floor(Math.random() * 10000)}`,
            company: iden.company,
            designation: 'Visitor',
            isTrained: Math.random() > 0.5
        });
    }

    const createdAt = subDays(now, 60);
    for (const p of people) {
        await client.query(
            `INSERT INTO people (id, name, category_id, code_no, photo_url, company, designation, is_trained, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET name=$2, category_id=$3, code_no=$4, photo_url=$5, company=$6, designation=$7, is_trained=$8`,
            [p.id, p.name, p.categoryId, p.codeNo, photoUrl, p.company, p.designation, p.isTrained, createdAt]
        );
    }

    // 3. Attendance Logs
    console.log('Generating 30 days of 24h history...');

    for (let day = 30; day >= 0; day--) {
        const currentDate = subDays(now, day);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dailyVisitors = people.filter(() => Math.random() > 0.6); // ~40% daily activity

        for (const p of dailyVisitors) {
            const visitCount = Math.floor(Math.random() * 2) + 1;
            let lastExitTime = startOfDay(currentDate);

            for (let v = 0; v < visitCount; v++) {
                const hoursLeft = 24 - lastExitTime.getHours();
                if (hoursLeft < 2) break;

                const entryWait = Math.floor(Math.random() * (hoursLeft / 2));
                const entryTime = addHours(lastExitTime, entryWait);
                const stayMinutes = 30 + Math.floor(Math.random() * 450);
                let exitTime: Date | null = addMinutes(entryTime, stayMinutes);
                let status = 'checked_out';

                if (exitTime.getDate() !== currentDate.getDate()) {
                    exitTime = addMinutes(startOfDay(addHours(currentDate, 1)), -1);
                }

                if (day === 0 && isAfter(exitTime, now)) {
                    exitTime = null;
                    status = 'on_premises';
                }

                const purpose = (p.categoryId === 'management' || p.categoryId === 'frontliner')
                    ? null
                    : getRandom(Math.random() > 0.5 ? bnPurposes : enPurposes);

                await client.query(
                    `INSERT INTO attendance_logs (id, person_id, entry_time, exit_time, status, date, purpose, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [crypto.randomUUID(), p.id, entryTime, exitTime, status, dateStr, purpose, entryTime]
                );

                if (!exitTime) break;
                lastExitTime = exitTime;
            }
        }
        if (day % 5 === 0) console.log(`  ...day ${day} done`);
    }

    // 4. Vehicles
    console.log('Generating vehicles...');

    for (let i = 0; i < 500; i++) {
        const isTransport = Math.random() > 0.4;
        const identity = getRandomIdentity();
        const vehicleNumber = `DHA-METRO-${Math.floor(1000 + Math.random() * 8999)}`;
        const randomDay = Math.floor(Math.random() * 30);
        const entryTime = addHours(startOfDay(subDays(now, randomDay)), Math.floor(Math.random() * 23));
        let exitTime: Date | null = addHours(entryTime, isTransport ? 4 : 1);
        let status = 'checked_out';

        if (isAfter(exitTime, now)) { exitTime = null; status = 'on_premises'; }

        await client.query(
            `INSERT INTO vehicles (id, vehicle_number, type, vendor_name, cargo_description, driver_name, mobile, entry_time, exit_time, status, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                crypto.randomUUID(),
                vehicleNumber,
                isTransport ? 'transport' : 'regular',
                isTransport ? identity.company : null,
                isTransport ? getRandom(bnCargo) : null,
                identity.name,
                `01${Math.floor(3 + Math.random() * 7)}${Math.floor(10000000 + Math.random() * 89999999)}`,
                entryTime,
                exitTime,
                status,
                format(entryTime, 'yyyy-MM-dd')
            ]
        );
    }

    console.log('Stress Seed Completed Successfully!');
    await client.end();
}

run().catch(async (err) => {
    console.error(err);
    await client.end();
    process.exit(1);
});
