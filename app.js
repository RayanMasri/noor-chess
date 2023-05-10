const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

app.use(express.static(__dirname + '/static'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
	console.log('listening on localhost:3000');
});

const io = require('socket.io')(server, {
	cors: {
		origins: '*:*',
		methods: ['GET', 'POST'],
	},
});

io.on('connection', (socket) => {
	console.log(`"${socket.id}" connected`);
	socket.on('disconnect', () => {
		console.log(`"${socket.id}" disconnected`);
	});
	// socket.on('messaged', (args) => {
	// 	io.emit('message', args);
	// 	console.log(args);
	// });
});
