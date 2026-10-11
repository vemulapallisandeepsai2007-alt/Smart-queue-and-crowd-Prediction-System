const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./src/config/db');
const Token = require('./src/models/Token');
const Department = require('./src/models/Department');

function getSlotForTokenNumber(num) {
  if (num <= 25) return 'Morning';
  if (num <= 50) return 'Afternoon';
  return 'Evening';
}

const defaultSlots = [
  { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
  { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
  { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
];

const defaultBreaks = [
  { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
  { label: 'Tea', startTime: '17:00', endTime: '17:30' },
];

async function runMigration() {
  console.log('🔄 Running token slot and department migration...');
  await connectDB();

  try {
    // 1. Ensure all departments have slots and breaks
    const departments = await Department.find({});
    console.log(`Found ${departments.length} departments to check.`);
    for (const d of departments) {
      let changed = false;
      if (!d.slots || d.slots.length === 0) {
        d.slots = defaultSlots;
        changed = true;
      }
      if (!d.breaks || d.breaks.length === 0) {
        d.breaks = defaultBreaks;
        changed = true;
      }
      if (changed) {
        await d.save();
        console.log(`Updated slots and breaks for Department: ${d.name}`);
      }
    }

    // 2. Update existing tokens with slot
    const tokens = await Token.find({ $or: [{ slot: { $exists: false } }, { slot: null }] });
    console.log(`Found ${tokens.length} unslotted tokens.`);
    for (const t of tokens) {
      t.slot = getSlotForTokenNumber(t.number);
      if (t.walkIn === undefined) t.walkIn = false;
      await t.save();
    }
    console.log(`Successfully migrated ${tokens.length} tokens.`);

    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
