import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { allowedOrigins } from "../config/cors.js";
import { ROLES } from "../constants/roles.js";
import { findEmployeeProfile } from "../repositories/employee.repository.js";
import { findMeetingByCode } from "../repositories/meeting.repository.js";

let io;

const onlineUsers = new Map();
const meetingRooms = new Map();

const normalizeCode = (value) => String(value || "").trim().toUpperCase();
const meetingRoomKey = (companyId, meetingCode) => `meeting:${companyId}:${normalizeCode(meetingCode)}`;

const attendeeEmployeeId = (attendee) => {
  const employeeId = attendee?.employeeId;
  return employeeId?._id || employeeId;
};

const attendeeUserId = (attendee) => {
  const userId = attendee?.userId || attendee?.employeeId?.userId;
  return userId?._id || userId;
};

const sameId = (left, right) => left && right && left.toString() === right.toString();

const canJoinMeetingRoom = async (socket, meetingCode) => {
  if (!socket.companyId) return false;

  const meeting = await findMeetingByCode(socket.companyId, normalizeCode(meetingCode));
  if (!meeting || meeting.companyId.toString() !== socket.companyId.toString()) {
    return false;
  }

  if (socket.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  if (meeting.createdBy && meeting.createdBy.toString() === socket.userId.toString()) {
    return true;
  }

  const employee = await findEmployeeProfile({
    companyId: socket.companyId,
    userId: socket.userId,
  });

  if (!employee?._id) return false;

  return (meeting.attendees || []).some((attendee) => {
    const invitedEmployeeId = attendeeEmployeeId(attendee);
    const invitedUserId = attendeeUserId(attendee);
    return (
      (sameId(invitedUserId, socket.userId) || sameId(invitedEmployeeId, employee?._id)) &&
      ["accepted", "attended"].includes(attendee.status || "")
    );
  });
};

const leaveMeetingRoom = (socket) => {
  const roomId = socket.meetingRoomId;
  if (!roomId || !meetingRooms.has(roomId)) return;

  const room = meetingRooms.get(roomId);
  room.delete(socket.id);
  socket.to(roomId).emit("meeting:participant-left", { socketId: socket.id });
  socket.leave(roomId);
  socket.meetingRoomId = null;

  if (!room.size) {
    meetingRooms.delete(roomId);
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(env),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

      socket.userId = decoded.sub;
      socket.companyId = decoded.companyId || null;
      socket.role = decoded.role;

      next();
    } catch (error) {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    onlineUsers.set(socket.userId, socket.id);

    socket.join(`user:${socket.userId}`);

    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    socket.on("meeting:join-room", async (payload = {}, callback) => {
      try {
        const meetingCode = normalizeCode(payload.meetingCode);
        if (!meetingCode) {
          callback?.({ ok: false, message: "Meeting code is required." });
          return;
        }

        const allowed = await canJoinMeetingRoom(socket, meetingCode);
        if (!allowed) {
          callback?.({ ok: false, message: "HR approval is required before joining media." });
          return;
        }

        leaveMeetingRoom(socket);

        const roomId = meetingRoomKey(socket.companyId, meetingCode);
        const participant = {
          socketId: socket.id,
          userId: socket.userId,
          name: payload.name || "Meeting user",
          hasAudio: Boolean(payload.hasAudio),
          hasVideo: Boolean(payload.hasVideo),
          audioEnabled: payload.audioEnabled !== false,
          videoEnabled: payload.videoEnabled !== false,
          handRaised: Boolean(payload.handRaised),
        };

        const room = meetingRooms.get(roomId) || new Map();
        const existingParticipants = Array.from(room.values());

        room.set(socket.id, participant);
        meetingRooms.set(roomId, room);
        socket.meetingRoomId = roomId;
        socket.join(roomId);

        callback?.({ ok: true, participants: existingParticipants });
        socket.to(roomId).emit("meeting:participant-joined", participant);
      } catch (error) {
        callback?.({ ok: false, message: "Unable to join meeting media." });
      }
    });

    socket.on("meeting:signal", (payload = {}) => {
      if (!socket.meetingRoomId || !payload.targetSocketId || !payload.signal) return;

      io.to(payload.targetSocketId).emit("meeting:signal", {
        fromSocketId: socket.id,
        signal: payload.signal,
      });
    });

    socket.on("meeting:media-state", (payload = {}) => {
      const roomId = socket.meetingRoomId;
      if (!roomId || !meetingRooms.has(roomId)) return;

      const room = meetingRooms.get(roomId);
      const participant = room.get(socket.id);
      if (!participant) return;

      participant.audioEnabled = payload.audioEnabled !== false;
      participant.videoEnabled = payload.videoEnabled !== false;
      participant.hasAudio = Boolean(payload.hasAudio);
      participant.hasVideo = Boolean(payload.hasVideo);

      socket.to(roomId).emit("meeting:media-state", {
        socketId: socket.id,
        audioEnabled: participant.audioEnabled,
        videoEnabled: participant.videoEnabled,
        hasAudio: participant.hasAudio,
        hasVideo: participant.hasVideo,
      });
    });

    socket.on("meeting:hand-state", (payload = {}) => {
      const roomId = socket.meetingRoomId;
      if (!roomId || !meetingRooms.has(roomId)) return;

      const room = meetingRooms.get(roomId);
      const participant = room.get(socket.id);
      if (!participant) return;

      participant.handRaised = Boolean(payload.handRaised);
      socket.to(roomId).emit("meeting:hand-state", {
        socketId: socket.id,
        handRaised: participant.handRaised,
      });
    });

    socket.on("meeting:leave-room", () => {
      leaveMeetingRoom(socket);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
      leaveMeetingRoom(socket);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

export const emitNotificationToUser = (userId, notification) => {
  if (!io) return;

  io.to(`user:${userId}`).emit("notification:new", notification);
};

export const emitMessageToUser = (userId, message) => {
  if (!io) return;

  io.to(`user:${userId}`).emit("message:new", message);
};

export const emitToCompany = (companyId, eventName, payload) => {
  if (!io) return;

  io.to(`company:${companyId}`).emit(eventName, payload);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};




