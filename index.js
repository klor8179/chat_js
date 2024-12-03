import express from 'express'; // npm install express@4
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io'; // npm install socket.io

const app = express(); // Instancia de Express para manejar rutas y middleware.
const server = createServer(app); // Servidor HTTP creado con createServer para ser compatible con Socket.IO.
const io = new Server(server, {
  connectionStateRecovery: {
    // Configuración para la recuperación del estado
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutos
    skipMiddlewares: true, // Omite los middlewares durante la recuperación
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url)); // Ruta del directorio actual donde está el archivo.

// Servir el archivo HTML principal
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Variables globales para la gestión de usuarios
let userCount = 0; // Número total de usuarios conectados.
const connectedUsers = {}; // Objeto para rastrear usuarios conectados

// Configuración de eventos de Socket.IO
io.on('connection', (socket) => { //Se ejecuta cada vez que un cliente se conecta.
  userCount++; //Incrementa el contador de usuarios y notifica a todos los clientes (io.emit) el número actualizado.
  io.emit('update users', userCount); // Emitir el número actualizado de usuarios

  console.log('A user connected');

  // Evento: Usuario conectado
  socket.on('user connected', (username) => { // Escucha el evento user connected enviado por un cliente con su nombre de usuario.
    connectedUsers[socket.id] = username; // Guardar usuario con el ID del socket
    console.log(`${username} joined the chat`);
    io.emit('user reconnected', username); // Notificar a otros usuarios
  });

  // Evento: Mensaje de chat
  socket.on('chat message', ({ username, message }) => {
    io.emit('chat message', { username, message }); // Recibe un mensaje y lo enviar mensaje a todos los clientes
  });

  // Evento: Usuario está escribiendo
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username); // Notificar a otros que alguien está escribiendo
  });

  // Evento: Usuario dejó de escribir
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing');
  });

  // Evento: Usuario desconectado
  socket.on('disconnect', () => {
    const username = connectedUsers[socket.id];
    delete connectedUsers[socket.id]; // Eliminar usuario de la lista

    userCount--;
    io.emit('update users', userCount); // Actualizar la cantidad de usuarios

    if (username) {
      console.log(`${username} disconnected`);
      io.emit('user disconnected', username); // Notificar la desconexión
    } else {
      console.log('A user disconnected');
    }
  });
});

// Iniciar el servidor
server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
