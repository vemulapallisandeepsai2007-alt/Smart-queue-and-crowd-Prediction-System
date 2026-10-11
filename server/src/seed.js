const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('./config/db');
const Admin = require('./models/Admin');
const Place = require('./models/Place');
const Department = require('./models/Department');
const Staff = require('./models/Staff');
const User = require('./models/User');
const Token = require('./models/Token');
const ActivityLog = require('./models/ActivityLog');
const QueueStat = require('./models/QueueStat');
const Settings = require('./models/Settings');

const seedData = async (shouldDisconnect = true) => {
  console.log('🌱 Starting database seeding process...');

  try {
    // Only connect if not already connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Clear existing sample collections for fresh seed
    console.log('🧹 Cleaning existing data collections...');
    await Admin.deleteMany({});
    await Place.deleteMany({});
    await Department.deleteMany({});
    await Staff.deleteMany({});
    await User.deleteMany({});
    await Token.deleteMany({});
    await ActivityLog.deleteMany({});
    await QueueStat.deleteMany({});
    await Settings.deleteMany({});

    // 1. Seed Admin
    console.log('👑 Creating Super Admin account...');
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@12345';
    const adminUsername = (process.env.ADMIN_SEED_USERNAME || 'admin').toLowerCase();
    const adminSalt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(adminPassword, adminSalt);

    const admin = await Admin.create({
      username: adminUsername,
      passwordHash: adminPasswordHash,
    });
    console.log(` Admin account seeded: ${admin.username}`);

    // 2. Seed 5 Sample Hospitals around Guntur, Andhra Pradesh
    console.log('🏥 Seeding 5 Hospitals in Guntur with departments and doctors...');
    
    const hospitalsData = [
      {
        place: {
          category: 'Hospital',
          name: 'Ramesh Hospitals Guntur',
          address: 'Collector Office Road, Nagarampalem',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4325, 16.3021], // [lng, lat]
          },
          phone: '+91 863 237 7777',
          source: 'db',
        },
        departments: [
          {
            name: 'Cardiology',
            avgServiceMinutes: 15,
            opensAt: '08:30',
            closesAt: '18:00',
            doctors: [
              { name: 'Dr. P. Ramesh Babu', experienceYears: 22, designation: 'Chief Interventional Cardiologist' },
              { name: 'Dr. K. Srinivas Rao', experienceYears: 12, designation: 'Senior Consultant Cardiologist' },
            ],
          },
          {
            name: 'General Medicine',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. V. Ratna Kumari', experienceYears: 16, designation: 'Head of General Medicine' },
              { name: 'Dr. M. Suresh Kumar', experienceYears: 8, designation: 'Consultant Physician' },
            ],
          },
          {
            name: 'Orthopedics & Joint Care',
            avgServiceMinutes: 12,
            opensAt: '09:00',
            closesAt: '16:30',
            doctors: [
              { name: 'Dr. Ch. Venkata Ramana', experienceYears: 14, designation: 'Consultant Joint Replacement Surgeon' },
            ],
          },
          {
            name: 'Neurology',
            avgServiceMinutes: 15,
            opensAt: '10:00',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. A. Kiranmayi', experienceYears: 11, designation: 'Senior Neurologist' },
            ],
          },
          {
            name: 'Pediatrics',
            avgServiceMinutes: 8,
            opensAt: '09:00',
            closesAt: '18:00',
            doctors: [
              { name: 'Dr. G. Sandeep', experienceYears: 9, designation: 'Consultant Pediatrician' },
            ],
          },
        ],
      },
      {
        place: {
          category: 'Hospital',
          name: 'Government General Hospital (GGH)',
          address: 'Sambasiva Pet, Main Hospital Road',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4431, 16.3075],
          },
          phone: '+91 863 222 3456',
          source: 'db',
        },
        departments: [
          {
            name: 'Emergency & Trauma Care',
            avgServiceMinutes: 7,
            opensAt: '00:00',
            closesAt: '23:59',
            doctors: [
              { name: 'Dr. B. Nageswara Rao', experienceYears: 18, designation: 'Chief Medical Officer' },
              { name: 'Dr. T. Haritha', experienceYears: 7, designation: 'Emergency Care Specialist' },
            ],
          },
          {
            name: 'General Surgery',
            avgServiceMinutes: 15,
            opensAt: '09:00',
            closesAt: '16:00',
            doctors: [
              { name: 'Dr. K. Subba Rao', experienceYears: 20, designation: 'Professor & Head of Surgery' },
            ],
          },
          {
            name: 'Pulmonology & Chest Clinic',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '15:00',
            doctors: [
              { name: 'Dr. S. Anjaneyulu', experienceYears: 13, designation: 'Chest Physician' },
            ],
          },
          {
            name: 'Dermatology',
            avgServiceMinutes: 8,
            opensAt: '09:30',
            closesAt: '14:30',
            doctors: [
              { name: 'Dr. D. Padmavathi', experienceYears: 10, designation: 'Consultant Dermatologist' },
              { name: 'Dr. R. Karthik', experienceYears: 5, designation: 'Resident Dermatologist' },
            ],
          },
          {
            name: 'Ophthalmology',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '15:30',
            doctors: [
              { name: 'Dr. N. Radhika', experienceYears: 15, designation: 'Senior Eye Surgeon' },
            ],
          },
        ],
      },
      {
        place: {
          category: 'Hospital',
          name: 'NRI General Hospital & Medical College',
          address: 'NH-16 Service Road, Chinakakani',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.5284, 16.4251],
          },
          phone: '+91 863 234 0400',
          source: 'db',
        },
        departments: [
          {
            name: 'Nephrology & Urology',
            avgServiceMinutes: 14,
            opensAt: '09:00',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. Y. Satyanarayana', experienceYears: 17, designation: 'Senior Nephrologist' },
              { name: 'Dr. J. Pradeep', experienceYears: 9, designation: 'Consultant Urologist' },
            ],
          },
          {
            name: 'Gastroenterology',
            avgServiceMinutes: 12,
            opensAt: '09:30',
            closesAt: '16:30',
            doctors: [
              { name: 'Dr. M. Ravindra', experienceYears: 14, designation: 'Surgical Gastroenterologist' },
            ],
          },
          {
            name: 'Obstetrics & Gynecology',
            avgServiceMinutes: 10,
            opensAt: '08:30',
            closesAt: '17:30',
            doctors: [
              { name: 'Dr. K. Lalitha Devi', experienceYears: 19, designation: 'Senior Gynecologist' },
              { name: 'Dr. P. Swapna', experienceYears: 8, designation: 'Consultant Obstetrician' },
            ],
          },
          {
            name: 'Oncology',
            avgServiceMinutes: 20,
            opensAt: '10:00',
            closesAt: '16:00',
            doctors: [
              { name: 'Dr. S. Vijaya Bhaskar', experienceYears: 16, designation: 'Medical Oncologist' },
            ],
          },
        ],
      },
      {
        place: {
          category: 'Hospital',
          name: 'Manipal Hospital Tadepalli-Guntur',
          address: 'Near Kanaka Durga Varadhi, Tadepalli',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.6121, 16.4883],
          },
          phone: '+91 864 535 0000',
          source: 'db',
        },
        departments: [
          {
            name: 'Critical Care & Pulmonology',
            avgServiceMinutes: 12,
            opensAt: '09:00',
            closesAt: '18:00',
            doctors: [
              { name: 'Dr. E. Manoj', experienceYears: 13, designation: 'Head of Critical Care' },
            ],
          },
          {
            name: 'Orthopedics & Sports Medicine',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. V. Kalyan', experienceYears: 15, designation: 'Sports Injury Specialist' },
              { name: 'Dr. N. Teja', experienceYears: 6, designation: 'Associate Orthopedic Surgeon' },
            ],
          },
          {
            name: 'ENT & Head Neck Surgery',
            avgServiceMinutes: 10,
            opensAt: '09:30',
            closesAt: '16:00',
            doctors: [
              { name: 'Dr. L. Sireesha', experienceYears: 11, designation: 'Senior ENT Consultant' },
            ],
          },
          {
            name: 'Endocrinology & Diabetology',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '16:30',
            doctors: [
              { name: 'Dr. P. Ashok Kumar', experienceYears: 14, designation: 'Consultant Diabetologist' },
            ],
          },
        ],
      },
      {
        place: {
          category: 'Hospital',
          name: 'St. Joseph Hospital Guntur',
          address: 'Kothapet Main Road',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4482, 16.3110],
          },
          phone: '+91 863 222 0914',
          source: 'db',
        },
        departments: [
          {
            name: 'General Medicine',
            avgServiceMinutes: 10,
            opensAt: '09:00',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. Sister Mary Rani', experienceYears: 18, designation: 'Chief Medical Superintendent' },
              { name: 'Dr. G. Daniel', experienceYears: 10, designation: 'Physician' },
            ],
          },
          {
            name: 'Pediatrics',
            avgServiceMinutes: 8,
            opensAt: '09:00',
            closesAt: '16:00',
            doctors: [
              { name: 'Dr. C. Krupa Rao', experienceYears: 12, designation: 'Pediatric Consultant' },
            ],
          },
          {
            name: 'Obstetrics & Gynecology',
            avgServiceMinutes: 12,
            opensAt: '08:30',
            closesAt: '16:30',
            doctors: [
              { name: 'Dr. M. Stella', experienceYears: 15, designation: 'Senior Obstetrician' },
            ],
          },
          {
            name: 'Dental Care',
            avgServiceMinutes: 15,
            opensAt: '09:30',
            closesAt: '17:00',
            doctors: [
              { name: 'Dr. K. Samuel', experienceYears: 9, designation: 'Dental Surgeon' },
            ],
          },
        ],
      },
    ];

    let totalHospitalDepts = 0;
    let sampleHospitalPlace = null;
    let sampleHospitalDept = null;

    const defaultSlots = [
      { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
      { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
      { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
    ];

    const defaultBreaks = [
      { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
      { label: 'Tea', startTime: '17:00', endTime: '17:30' },
    ];

    for (const h of hospitalsData) {
      const place = await Place.create(h.place);
      if (!sampleHospitalPlace) sampleHospitalPlace = place;

      for (const d of h.departments) {
        const dept = await Department.create({
          place: place._id,
          name: d.name,
          avgServiceMinutes: d.avgServiceMinutes,
          opensAt: d.opensAt,
          closesAt: d.closesAt,
          doctors: d.doctors,
          slots: defaultSlots,
          breaks: defaultBreaks,
        });
        if (!sampleHospitalDept) sampleHospitalDept = dept;
        totalHospitalDepts++;
      }
    }
    console.log(` Created 5 Hospitals with ${totalHospitalDepts} Departments & Doctor rosters.`);

    // 3. Seed 3 Banks in Guntur, Andhra Pradesh
    console.log('🏦 Seeding 3 Banks in Guntur...');
    const banksData = [
      {
        place: {
          category: 'Bank',
          name: 'State Bank of India (SBI) Main Branch',
          address: 'Old Club Road, Arundalpet',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4358, 16.3056],
          },
          phone: '+91 863 223 4521',
          source: 'db',
        },
        departments: [
          { name: 'Cash Deposit & Withdrawal Counter', avgServiceMinutes: 5, opensAt: '10:00', closesAt: '16:00', doctors: [] },
          { name: 'Account Opening & KYC Verification', avgServiceMinutes: 12, opensAt: '10:00', closesAt: '15:30', doctors: [] },
          { name: 'Retail & Housing Loans Desk', avgServiceMinutes: 20, opensAt: '10:30', closesAt: '16:00', doctors: [] },
        ],
      },
      {
        place: {
          category: 'Bank',
          name: 'HDFC Bank Brodipet Branch',
          address: '4/1 Brodipet, Main Road',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4385, 16.3090],
          },
          phone: '+91 863 224 5500',
          source: 'db',
        },
        departments: [
          { name: 'Cash & Forex Desk', avgServiceMinutes: 5, opensAt: '09:30', closesAt: '15:30', doctors: [] },
          { name: 'Relationship & Priority Banking', avgServiceMinutes: 15, opensAt: '09:30', closesAt: '16:00', doctors: [] },
          { name: 'Credit Cards & Loan Services', avgServiceMinutes: 15, opensAt: '10:00', closesAt: '16:00', doctors: [] },
        ],
      },
      {
        place: {
          category: 'Bank',
          name: 'ICICI Bank Lakshmipuram Branch',
          address: 'Main Road, Lakshmipuram',
          city: 'Guntur',
          location: {
            type: 'Point',
            coordinates: [80.4289, 16.2995],
          },
          phone: '+91 863 225 1100',
          source: 'db',
        },
        departments: [
          { name: 'Teller & Instant Services', avgServiceMinutes: 5, opensAt: '09:30', closesAt: '15:30', doctors: [] },
          { name: 'Business Banking & Trade Desk', avgServiceMinutes: 18, opensAt: '10:00', closesAt: '16:00', doctors: [] },
          { name: 'Personal & Auto Loan Assistance', avgServiceMinutes: 15, opensAt: '10:00', closesAt: '16:00', doctors: [] },
        ],
      },
    ];

    let totalBankDepts = 0;
    let sampleBankPlace = null;
    for (const b of banksData) {
      const place = await Place.create(b.place);
      if (!sampleBankPlace) sampleBankPlace = place;
      for (const d of b.departments) {
        await Department.create({
          place: place._id,
          name: d.name,
          avgServiceMinutes: d.avgServiceMinutes,
          opensAt: d.opensAt,
          closesAt: d.closesAt,
          doctors: d.doctors,
          slots: defaultSlots,
          breaks: defaultBreaks,
        });
        totalBankDepts++;
      }
    }
    console.log(` Created 3 Banks with ${totalBankDepts} Service Counters.`);

    // 4. Seed sample staff members for testing: 1 approved, 1 pending, 1 rejected
    console.log('🧑‍💼 Seeding sample Staff accounts for verification...');
    const staffPass = await bcrypt.hash('Staff@123', 10);

    // Approved staff (can log in immediately)
    await Staff.create({
      category: 'Hospital',
      name: 'Ravi Teja Staff',
      staffId: 'STAFF-HOSP-01',
      email: 'raviteja.staff@rameshhospitals.com',
      phone: '9876543210',
      passwordHash: staffPass,
      status: 'approved',
      place: sampleHospitalPlace._id,
      department: sampleHospitalDept._id,
    });

    // Pending staff (blocks login with pending message)
    await Staff.create({
      category: 'Bank',
      name: 'Priya Sharma Staff',
      staffId: 'STAFF-BANK-02',
      email: 'priya.sharma@sbi.co.in',
      phone: '9876543211',
      passwordHash: staffPass,
      status: 'pending',
      place: sampleBankPlace._id,
    });

    // Rejected staff (blocks login with rejected message)
    await Staff.create({
      category: 'Hospital',
      name: 'Kiran Kumar Staff',
      staffId: 'STAFF-HOSP-03',
      email: 'kiran.kumar@ggh.ap.gov.in',
      phone: '9876543212',
      passwordHash: staffPass,
      status: 'rejected',
      place: sampleHospitalPlace._id,
    });

    // 5. Seed sample user for testing
    console.log('👤 Seeding sample User account...');
    const userPass = await bcrypt.hash('User@123', 10);
    await User.create({
      name: 'Anil Kumar Varma',
      phone: '9123456789',
      gender: 'Male',
      dob: new Date('1994-05-15'),
      email: 'anilkumar@example.com',
      passwordHash: userPass,
    });

    // 6. Seed System Settings
    console.log('⚙️ Seeding system threshold settings...');
    await Settings.create({
      key: 'global',
      crowdAlertThreshold: 75,
      lowThreshold: 25,
      mediumThreshold: 50,
      highThreshold: 75,
    });

    // 7. Seed historical QueueStats across the past 8 weeks
    console.log('📊 Seeding baseline historical queue metrics for crowd prediction...');
    const allDepts = await Department.find({});
    const now = new Date();
    const statDocs = [];

    for (let w = 1; w <= 8; w++) {
      const pastDate = new Date(now);
      pastDate.setDate(now.getDate() - w * 7);
      const yyyy = pastDate.getFullYear();
      const mm = String(pastDate.getMonth() + 1).padStart(2, '0');
      const dd = String(pastDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      for (const dept of allDepts.slice(0, 5)) {
        for (let h = 8; h <= 18; h++) {
          const bell = [14, 28, 48, 55, 36, 18, 22, 34, 25, 14, 8];
          const base = bell[h - 8] || 10;
          const noise = Math.floor(Math.sin(w + h) * 4);
          const booked = Math.max(2, base + noise);
          statDocs.push({
            department: dept._id,
            date: dateStr,
            hour: h,
            bookedCount: booked,
            waitingCount: Math.round(booked * 0.4),
            completedCount: Math.round(booked * 0.55),
            cancelledCount: Math.round(booked * 0.05),
          });
        }
      }
    }
    if (statDocs.length > 0) {
      await QueueStat.insertMany(statDocs);
      console.log(` Created ${statDocs.length} historical QueueStat snapshot records.`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(' SEEDING COMPLETED SUCCESSFULLY! ');
    console.log('='.repeat(60));
    console.log('\n👑 ADMIN CREDENTIALS:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n🧑‍💼 SAMPLE STAFF ACCOUNTS (Password: Staff@123):');
    console.log('   - Approved: STAFF-HOSP-01 (Hospital - Ramesh Hospitals)');
    console.log('   - Pending:  STAFF-BANK-02 (Bank - Waiting for approval)');
    console.log('   - Rejected: STAFF-HOSP-03 (Hospital - Application rejected)');
    console.log('\n👤 SAMPLE USER ACCOUNT (Password: User@123):');
    console.log('   - Phone:    9123456789');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    if (shouldDisconnect) {
      process.exit(1);
    }
    throw error;
  } finally {
    if (shouldDisconnect) {
      await disconnectDB();
      console.log(' Database disconnected after seed.');
    }
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = { seedData };
