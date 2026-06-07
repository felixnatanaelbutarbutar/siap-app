import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
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

// In-memory store untuk posisi terakhir staff (bisa pakai Redis untuk production/scale up)
const activeLocations = new Map<string, LocationData>();

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Di production sebaiknya diset spesifik domain
      methods: ['GET', 'POST'],
    },
  });

  // Middleware Autentikasi Socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
      socket.data.user = decoded; // simpan data user di socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`Socket connected: ${socket.id} (User: ${user.id} - ${user.role})`);

    // Jika admin connect, masukkan ke room "admin"
    if (user.role === 'ADMIN') {
      socket.join('admin');
      // Kirim snapshot posisi saat ini ke admin yang baru connect
      const locationsSnapshot = Array.from(activeLocations.values());
      socket.emit('location:snapshot', locationsSnapshot);
    }

    // Staff emit update lokasi
    socket.on('location:update', (data: { lat: number; lng: number; akurasi: number }) => {
      // Kita asumsikan update lokasi hanya dari staff lapangan
      if (user.role === 'ADMIN') return;

      const locationData: LocationData = {
        staff_id: user.id,
        nama: user.nama,
        divisi: user.divisi,
        role: user.role,
        lat: data.lat,
        lng: data.lng,
        updated_at: new Date(),
      };

      // Update in-memory map
      activeLocations.set(user.id, locationData);

      // Broadcast hanya ke room admin
      io.to('admin').emit('location:updated', locationData);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${user.id})`);
      // Hapus lokasi dari memory jika staff terputus (opsional, tergantung preferensi bisnis)
      // activeLocations.delete(user.id);
      
      // Beritahu admin bahwa user offline/disconnect
      // io.to('admin').emit('location:offline', { staff_id: user.id });
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
