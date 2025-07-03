const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');
const Message = require('./models/Message');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/proyecto', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión:', err));

// Register admin if none
User.findOne({ username: 'admin' })
  .then(admin => {
    if (!admin) {
      const hashedPassword = bcrypt.hashSync('admin', 10);
      User.create({ username: 'admin', password: hashedPassword, role: 'admin' })
        .then(() => console.log('Admin creado'))
        .catch(err => console.error('Error creando admin:', err));
    }
  })
  .catch(err => console.error('Error buscando admin:', err));

// === Auth ===
// Ruta para registrar usuarios
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario con la contraseña hasheada
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta para iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verificar si el usuario existe
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado. Por favor, regístrate.' });
    }

    // Comparar la contraseña proporcionada con la contraseña hasheada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    res.status(200).json({ message: 'Inicio de sesión exitoso', user });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Configuración de almacenamiento para Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Endpoint para subir imágenes
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Endpoint para obtener historial de mensajes entre un usuario y el administrador
app.get('/api/messages', async (req, res) => {
  const { userId } = req.query;
  try {
    let filter;
    if (!userId || userId === 'all') {
      // Todas las quejas enviadas al administrador
      filter = { toUserId: 'admin' };
    } else {
      // Conversación 1-a-1 entre usuario y admin
      filter = {
        $or: [
          { fromUserId: userId, toUserId: 'admin' },
          { fromUserId: 'admin', toUserId: userId },
        ],
      };
    }

    const { limit = 20, before } = req.query;
    const query = Message.find(filter);
    if (before) query.where('createdAt').lt(new Date(parseInt(before)));
    query.sort({ createdAt: -1 }).limit(parseInt(limit));
    const messages = await query.exec();
    messages.reverse();
    res.json(messages);
  } catch (err) {
    console.error('Error obteniendo mensajes:', err);
    res.status(500).json({ message: 'Error obteniendo mensajes' });
  }
});

// Endpoint para que admin obtenga lista de usuarios que enviaron mensajes
app.get('/api/chat/users', async (req, res) => {
  try {
    const users = await Message.distinct('fromUserId', { toUserId: 'admin' });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error listando usuarios' });
  }
});

// === Chat (Socket.io) ===
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // registrar sala individual
  socket.on('register', ({ userId }) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });

  socket.on('typing', (payload) => {
    if (!payload || !payload.toUserId) return;
    io.to(payload.toUserId).emit('typing', payload);
  });

  socket.on('reaction', async (payload) => {
    // payload: { messageId, emoji, userId }
    if(!payload) return;
    try {
      const msg = await Message.findById(payload.messageId);
      if(!msg) return;
      msg.reactions.push({ userId: payload.userId, emoji: payload.emoji });
      await msg.save();
      io.to(msg.toUserId).emit('reaction', { messageId: msg._id, emoji: payload.emoji, userId: payload.userId });
      io.to(msg.fromUserId).emit('reaction', { messageId: msg._id, emoji: payload.emoji, userId: payload.userId });
    } catch(e){ console.error('reaction error',e); }
  });

  socket.on('chatMessage', async (payload) => {
    try {
      const saved = await Message.create(payload);
      // enviar al remitente y destinatario
      io.to(payload.toUserId).emit('chatMessage', saved);
      io.to(payload.fromUserId).emit('chatMessage', saved);
    } catch (err) {
      console.error('Error guardando mensaje:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor (REST + WS) escuchando en http://localhost:${PORT}`);
});
