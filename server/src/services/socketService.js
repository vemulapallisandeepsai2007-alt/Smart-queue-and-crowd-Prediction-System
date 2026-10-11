const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const Token = require('../models/Token');
const Department = require('../models/Department');
const {
  enrichTokensWithEstimates,
  getCurrentBreakStatus,
  getKolkataTime,
} = require('./estimateService');

let io = null;
let minuteTimer = null;

/**
 * Initialize Socket.IO server attached to HTTP server
 */
function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (typeof allowedOrigins === 'function') {
          return callback(null, allowedOrigins(origin));
        }
        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Allow dev socket connections
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware for Sockets
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.user = decoded; // { id, role, ... }
        } catch (jwtErr) {
          console.warn('[Socket.IO] Invalid JWT provided on socket handshake:', jwtErr.message);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    // Automatically join admin room if authenticated as admin
    if (socket.user?.role === 'admin') {
      socket.join('admin');
    }

    // Client joins admin room explicitly
    socket.on('join:admin', () => {
      socket.join('admin');
    });

    socket.on('leave:admin', () => {
      socket.leave('admin');
    });

    // Client joins department room for live updates
    socket.on('join:department', ({ departmentId, date }) => {
      if (!departmentId || !date) return;
      const room = `dept_${departmentId}_${date}`;
      socket.join(room);
    });

    // Client leaves department room
    socket.on('leave:department', ({ departmentId, date }) => {
      if (!departmentId || !date) return;
      const room = `dept_${departmentId}_${date}`;
      socket.leave(room);
    });
  });

  // Start 1-minute background timer to re-emit estimates to all active department rooms
  if (!minuteTimer) {
    minuteTimer = setInterval(async () => {
      try {
        if (!io) return;
        const rooms = io.sockets.adapter.rooms;
        if (!rooms) return;

        const activeDeptRooms = Array.from(rooms.keys()).filter((r) =>
          r.startsWith('dept_')
        );

        for (const roomName of activeDeptRooms) {
          const roomClients = rooms.get(roomName);
          if (roomClients && roomClients.size > 0) {
            const parts = roomName.split('_');
            if (parts.length >= 3) {
              const departmentId = parts[1];
              const date = parts.slice(2).join('_');
              await emitDepartmentUpdates(departmentId, date);
            }
          }
        }
      } catch (cronErr) {
        console.error('[Socket.IO] Error in minute estimate cron:', cronErr.message);
      }
    }, 60000);
  }

  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Recompute peopleAhead and emit full queue state to room
 */
async function emitDepartmentUpdates(departmentId, date) {
  if (!io) return;
  const room = `dept_${departmentId}_${date}`;

  try {
    const department = await Department.findById(departmentId);
    if (!department) return;

    const tokens = await Token.find({ department: departmentId, date }).sort({ number: 1 });
    const serverNow = new Date();
    const kolkataNow = getKolkataTime(serverNow);
    const isToday = date === kolkataNow.dateStr;

    // Use centralized queue estimation service
    const enrichedTokens = enrichTokensWithEstimates(tokens, department, date, serverNow);
    const currentBreak = getCurrentBreakStatus(department, isToday, serverNow);

    // Sanitize tokens: exclude sensitive patient private details from room broadcast
    const sanitizedEnriched = enrichedTokens.map((t) => ({
      _id: t._id,
      department: t.department?._id || t.department,
      date: t.date,
      number: t.number,
      slot: t.slot,
      status: t.status,
      walkIn: Boolean(t.walkIn),
      patientName: t.walkIn ? t.walkInPatient?.name : t.patient?.name || null,
      patientAge: t.walkIn ? t.walkInPatient?.age : t.patient?.age || null,
      bookedAt: t.bookedAt,
      calledAt: t.calledAt,
      completedAt: t.completedAt,
      skippedAt: t.skippedAt,
      skipReason: t.skipReason,
      cancelledAt: t.cancelledAt,
      cancelledBy: t.cancelledBy,
      peopleAhead: t.peopleAhead,
      estimatedMinutes: t.estimatedMinutes,
      estimatedTime: t.estimatedTime,
      estimatedLabel: t.estimatedLabel,
      estimatedClockTime: t.estimatedClockTime,
      mayOverflow: t.mayOverflow,
      serverNow: t.serverNow || serverNow.toISOString(),
    }));

    io.to(room).emit('tokens:batch', {
      departmentId,
      date,
      tokens: sanitizedEnriched,
      nowServingToken: department.nowServingToken,
      isPaused: department.isPaused,
      currentBreak,
      serverNow: serverNow.toISOString(),
    });
  } catch (err) {
    console.error('[Socket.IO] Error emitting department updates:', err.message);
  }
}

/**
 * Emit individual token update
 */
async function emitTokenUpdated(departmentId, date, token) {
  if (!io) return;
  const room = `dept_${departmentId}_${date}`;
  const serverNow = new Date();

  try {
    const department = await Department.findById(departmentId);
    let tokenEstTime = token.estimatedTime;
    let tokenEstLabel = token.estimatedLabel;
    let tokenEstClock = token.estimatedClockTime;
    let tokenPeopleAhead = token.peopleAhead;

    if (!tokenEstTime && department) {
      const allTokens = await Token.find({ department: departmentId, date }).sort({ number: 1 });
      const enriched = enrichTokensWithEstimates(allTokens, department, date, serverNow);
      const match = enriched.find((t) => t._id.toString() === token._id.toString());
      if (match) {
        tokenEstTime = match.estimatedTime;
        tokenEstLabel = match.estimatedLabel;
        tokenEstClock = match.estimatedClockTime;
        tokenPeopleAhead = match.peopleAhead;
      }
    }

    const sanitizedToken = {
      _id: token._id,
      department: token.department?._id || token.department,
      date: token.date,
      number: token.number,
      slot: token.slot,
      status: token.status,
      walkIn: Boolean(token.walkIn),
      patientName: token.walkIn ? token.walkInPatient?.name : token.patient?.name || null,
      patientAge: token.walkIn ? token.walkInPatient?.age : token.patient?.age || null,
      bookedAt: token.bookedAt,
      calledAt: token.calledAt,
      completedAt: token.completedAt,
      skippedAt: token.skippedAt,
      skipReason: token.skipReason,
      cancelledAt: token.cancelledAt,
      cancelledBy: token.cancelledBy,
      peopleAhead: tokenPeopleAhead ?? 0,
      estimatedTime: tokenEstTime,
      estimatedLabel: tokenEstLabel,
      estimatedClockTime: tokenEstClock,
      serverNow: serverNow.toISOString(),
    };

    io.to(room).emit('token:updated', {
      departmentId,
      date,
      token: sanitizedToken,
      serverNow: serverNow.toISOString(),
    });

    if (token.status === 'skipped') {
      io.to(room).emit('token:skipped', {
        departmentId,
        date,
        token: sanitizedToken,
        serverNow: serverNow.toISOString(),
      });
    }

    // Also recompute queue estimates for all tokens in that slot & department
    await emitDepartmentUpdates(departmentId, date);
  } catch (err) {
    console.error('[Socket.IO] Error emitting token updated:', err.message);
  }
}

/**
 * Emit "queue:nowServing"
 */
function emitNowServing(departmentId, date, tokenNumber, token) {
  if (!io) return;
  const room = `dept_${departmentId}_${date}`;
  const serverNow = new Date();
  const sanitizedToken = token
    ? {
        _id: token._id,
        number: tokenNumber,
        status: token.status || 'called',
        slot: token.slot,
        calledAt: token.calledAt || serverNow,
        serverNow: serverNow.toISOString(),
      }
    : { number: tokenNumber, status: 'called', serverNow: serverNow.toISOString() };

  io.to(room).emit('queue:nowServing', {
    departmentId,
    date,
    tokenNumber,
    token: sanitizedToken,
    serverNow: serverNow.toISOString(),
  });
  emitDepartmentUpdates(departmentId, date);
}

/**
 * Emit "counter:paused"
 */
function emitCounterPaused(departmentId, isPaused, date = null) {
  if (!io) return;
  io.emit('counter:paused', {
    departmentId,
    isPaused,
    serverNow: new Date().toISOString(),
  });

  // Re-emit department estimates to active rooms
  const kolkataNow = getKolkataTime(new Date());
  const targetDate = date || kolkataNow.dateStr;
  emitDepartmentUpdates(departmentId, targetDate);
}

module.exports = {
  initSocket,
  getIO,
  emitTokenUpdated,
  emitNowServing,
  emitCounterPaused,
  emitDepartmentUpdates,
};

