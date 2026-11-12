import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { logger } from '../utils/logger';

let io: SocketIOServer;

interface LocationData {
  staff_id: string;
  nama: string;
  divisi: string;
  role: string;
  lat: number;
  lng: number;
  updated_at: Date;
}

const activeLocations = new Map<string, LocationData>();

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware Autentikasi Socket
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET tidak dikonfigurasi pada Socket.io!');
      return next(new Error('Authentication error: Server misconfigured'));
    }

    try {
      const decoded = jwt.verify(token, secret) as any;

      if (decoded?.jti) {
        const revoked = await prisma.revokedToken.findUnique({
          where: { token_jti: decoded.jti },
        });
        if (revoked) {
          return next(new Error('Authentication error: Token revoked'));
        }
      }

      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`Socket connected: ${socket.id} (User: ${user.id} - ${user.role})`);

    if (user.role === 'ADMIN') {
      socket.join('admin');
      const locationsSnapshot = Array.from(activeLocations.values());
      socket.emit('location:snapshot', locationsSnapshot);
    }

    socket.on('location:update', (data: { lat: number; lng: number; akurasi?: number }) => {
      if (user.role === 'ADMIN') return;
      if (
        !data ||
        typeof data.lat !== 'number' ||
        typeof data.lng !== 'number' ||
        !Number.isFinite(data.lat) ||
        !Number.isFinite(data.lng)
      ) {
        return;
      }

      const locationData: LocationData = {
        staff_id: user.id,
        nama: user.nama,
        divisi: user.divisi,
        role: user.role,
        lat: data.lat,
        lng: data.lng,
        updated_at: new Date(),
      };

      activeLocations.set(user.id, locationData);
      io.to('admin').emit('location:updated', locationData);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${user.id})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io tidak terinisialisasi!');
  }
  return io;
};
