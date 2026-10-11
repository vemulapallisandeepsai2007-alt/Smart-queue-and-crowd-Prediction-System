const mongoose = require('mongoose');
const Token = require('../models/Token');
const Department = require('../models/Department');
const User = require('../models/User');
const { emitTokenUpdated, emitDepartmentUpdates } = require('../services/socketService');
const { recordDepartmentSnapshot, getTodayDateStr } = require('../services/statService');

// Demo user cache
let demoUserCache = [];

async function getOrCreateDemoUsers(count = 50) {
  if (demoUserCache.length >= count) {
    return demoUserCache.slice(0, count);
  }

  const existingDemoUsers = await User.find({ isDemo: true });
  demoUserCache = [...existingDemoUsers];

  const needed = count - demoUserCache.length;
  if (needed > 0) {
    const dummyNames = [
      'Aarav Sharma', 'Diya Patel', 'Vivaan Reddy', 'Ananya Gupta', 'Aditya Verma',
      'Ishaan Kumar', 'Saanvi Nair', 'Reyansh Joshi', 'Aanya Rao', 'Vihaan Mehta',
      'Myra Bhatia', 'Krishna Iyer', 'Aarohi Sen', 'Sai Teja', 'Pranav Kulkarni',
      'Pooja Hegde', 'Tarun Chawla', 'Meera Nambiar', 'Gautam Das', 'Neha Pillai',
      'Rohan Malhotra', 'Tanvi Deshmukh', 'Arjun Saxena', 'Rhea Kapoor', 'Kunal Goswami',
      'Simran Kaur', 'Devansh Bose', 'Avani Mishra', 'Harsh Vardhan', 'Shreya Ghoshal',
      'Kabir Bedi', 'Siddharth Roy', 'Tara Sutaria', 'Yash Mehra', 'Isha Ambani',
      'Vikram Seth', 'Zoya Akhtar', 'Sameer Anjaan', 'Nisha Rawal', 'Karan Johar',
      'Deepak Chopra', 'Alka Yagnik', 'Manish Malhotra', 'Juhi Chawla', 'Sunil Grover',
      'Rohit Shetty', 'Rani Mukerji', 'Anupam Kher', 'Boman Irani', 'Kirron Kher',
    ];

    for (let i = 0; i < needed; i++) {
      const idx = demoUserCache.length + 1;
      const phone = `9000${String(idx).padStart(6, '0')}`;
      const name = dummyNames[(idx - 1) % dummyNames.length] + ` (Demo #${idx})`;

      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({
          name,
          phone,
          gender: idx % 2 === 0 ? 'Female' : 'Male',
          dob: new Date('1998-01-01'),
          passwordHash: 'DEMO_HASH_NOT_AUTHENTICATABLE',
          isDemo: true,
        });
      }
      demoUserCache.push(user);
    }
  }

  return demoUserCache.slice(0, count);
}

/**
 * POST /api/admin/simulate
 * Books a crowd surge of random available tokens for a given department
 */
const runSimulation = async (req, res) => {
  try {
    const { departmentId, count = 35 } = req.body;
    const requestedCount = Math.min(60, Math.max(10, Number(count) || 35));
    const today = getTodayDateStr();

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid department ID is required.',
      });
    }

    const dept = await Department.findById(departmentId).populate('place', 'name category');
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    // Ensure tokens 1-75 exist for today
    const existingTokens = await Token.find({ department: departmentId, date: today });
    if (existingTokens.length < 75) {
      const existingNums = new Set(existingTokens.map((t) => t.number));
      const toCreate = [];
      for (let num = 1; num <= 75; num++) {
        if (!existingNums.has(num)) {
          toCreate.push({
            department: departmentId,
            date: today,
            number: num,
            status: 'available',
            isDemo: false,
          });
        }
      }
      if (toCreate.length > 0) {
        await Token.insertMany(toCreate, { ordered: false }).catch(() => {});
      }
    }

    // Find available tokens
    const availableTokens = await Token.find({
      department: departmentId,
      date: today,
      status: 'available',
    }).sort({ number: 1 });

    if (availableTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No available tokens left today in this department to simulate.',
      });
    }

    const tokensToBook = availableTokens.slice(0, requestedCount);
    const demoUsers = await getOrCreateDemoUsers(tokensToBook.length);

    // Respond immediately so user interface updates, while streaming bookings in background
    res.json({
      success: true,
      message: `Surge simulation initiated: streaming ${tokensToBook.length} token bookings into ${dept.name}...`,
      departmentName: dept.name,
      placeName: dept.place?.name,
      tokensTargeted: tokensToBook.length,
    });

    // Asynchronously stream token bookings spread over ~3-4 seconds
    (async () => {
      for (let i = 0; i < tokensToBook.length; i++) {
        const token = tokensToBook[i];
        const user = demoUsers[i % demoUsers.length];

        const booked = await Token.findByIdAndUpdate(
          token._id,
          {
            $set: {
              status: 'booked',
              user: user._id,
              isDemo: true,
              bookedAt: new Date(),
            },
          },
          { new: true }
        )
          .populate('user', 'name phone')
          .populate({ path: 'department', populate: { path: 'place' } });

        if (booked) {
          emitTokenUpdated(departmentId, today, booked);
          await recordDepartmentSnapshot(departmentId, today);
        }

        // 80ms delay between token bookings creates a smooth, visible rise on the dashboard
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      // Final full room sync
      await emitDepartmentUpdates(departmentId, today);
      await recordDepartmentSnapshot(departmentId, today);
    })().catch((err) => {
      console.error('[Simulation] Error in background token stream:', err);
    });
  } catch (error) {
    console.error('Error in runSimulation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start simulation.',
    });
  }
};

/**
 * POST /api/admin/simulate/reset
 * Resets all simulated demo tokens for today back to available and cleans up demo users
 */
const resetSimulation = async (req, res) => {
  try {
    const today = getTodayDateStr();

    // Find all departments affected by demo tokens today
    const demoTokens = await Token.find({ date: today, isDemo: true });
    const affectedDeptIds = [...new Set(demoTokens.map((t) => t.department.toString()))];

    // Reset demo tokens back to available
    await Token.updateMany(
      { date: today, isDemo: true },
      {
        $set: {
          status: 'available',
          user: null,
          isDemo: false,
          bookedAt: null,
          calledAt: null,
          completedAt: null,
          cancelledAt: null,
          cancelledBy: null,
        },
      }
    );

    // Delete dummy demo users created for simulations
    await User.deleteMany({ isDemo: true });
    demoUserCache = [];

    // Recompute snapshots for all affected departments
    for (const deptId of affectedDeptIds) {
      await recordDepartmentSnapshot(deptId, today);
      await emitDepartmentUpdates(deptId, today);
    }

    return res.json({
      success: true,
      message: `Reset complete: ${demoTokens.length} simulated tokens released and reset to available.`,
      resetCount: demoTokens.length,
    });
  } catch (error) {
    console.error('Error in resetSimulation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset simulation data.',
    });
  }
};

module.exports = {
  runSimulation,
  resetSimulation,
};
