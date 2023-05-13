const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Chess } = require('chess.js');

// let engine = new Chess('8/4P3/8/8/8/1K6/8/1k6 b - - 0 1');
// console.log(engine.moves({ verbose: true }));
// console.log(engine.board());

// TODO: add reconnection capabilities to socket client
// TODO: Handle promotion *
// TODO: Handle end game
// TODO: Handle other user leave

// app.use(express.static(__dirname + '/public'));
// app.get('/', (req, res) => {
// 	res.sendFile(__dirname + '/index.html');
// });
app.use(express.static(__dirname + '/build'));
app.get('*', (req, res) => {
	res.sendFile(__dirname + '/build/index.html');
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

const makeRoomCode = (length) => {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
};

// TODO: add piece promotion

io.on('connection', (socket) => {
	console.log(`"${socket.id}" connected`);

	socket.on('disconnect', () => {
		console.log(`"${socket.id}" disconnected`);
		// Check rooms with single users that have started a game
		Array.from(io.sockets.adapter.rooms).map(([name, users]) => {
			if (!name.startsWith('room.')) return;

			users = Array.from(users);
			if (users.length != 1) return;

			if (io.sockets.sockets.get(users[0]).data.started) {
				io.to(users[0]).emit('disconnection');
			}
		});

		// console.log(Array.from(io.sockets.adapter.rooms));
	});

	// console.log(Array.from(io.sockets.adapter.rooms));

	socket.on('move', (data, callback) => {
		let { from, to, promotion } = data;

		// If it isn't their turn, ignore
		if (socket.data.engine.turn() != socket.data.color) return callback({ status: false, reason: 'Not your turn' });

		// Check if move is legal
		let legal = socket.data.engine.moves({ verbose: true }).filter((move) => move.from == from);
		if (legal.length == 0) return callback({ status: false, reason: 'Illegal move' });
		legal = legal.filter((move) => move.to == to);
		if (legal.length == 0) return callback({ status: false, reason: 'Illegal move' });

		// Send move to all users in room
		let roomName = Array.from(socket.rooms).find((room) => room.startsWith('room.'));
		if (roomName == undefined) return callback({ status: false, reason: 'Not in-game' });
		let room = Array.from(io.sockets.adapter.rooms).find(([room, users]) => room == roomName);
		let users = Array.from(room[1]).map((id) => {
			return [id, io.sockets.sockets.get(id)];
		});

		users.map(([id, user]) => {
			user.data.engine.move(data);
			if (user.data.engine.isGameOver()) {
				let report = {
					'Stalemate': user.data.engine.isStalemate(),
					'Insufficient Material': user.data.engine.isInsufficientMaterial(),
					'Threefold Repetition': user.data.engine.isThreefoldRepetition(),
					'50-move Rule': user.data.engine.isDraw(),
				};

				let reason = 'Ended: ';

				if (user.data.engine.isCheckmate()) {
					reason += `Checkmate - ${user.data.engine.turn() == 'w' ? 'Black' : 'White'} has won`;
				} else {
					for (let [name, result] of Object.entries(report)) {
						if (result) {
							reason += name;
							break;
						}
					}
				}

				io.to(id).emit('update-board', {
					// fen: user.data.engine.fen(),
					board: user.data.engine.board(),
					legal: null,
					over: true,
					reason: reason,
					players: users.map(([_, user]) => user.data.name),
					turn: user.data.engine.turn(),
				});
			} else {
				io.to(id).emit('update-board', {
					// fen: user.data.engine.fen(),
					board: user.data.engine.board(),
					legal:
						user.data.engine.turn() == user.data.color
							? user.data.engine.moves({ verbose: true }).map((move) => {
									return { from: move.from, to: move.to };
							  })
							: [],
					over: false,
					players: users.map(([_, user]) => user.data.name),
					turn: user.data.engine.turn(),
				});
			}
		});

		callback({ status: true });
		// chess.move({ from: 'g2', to: 'g3' })
		//
		// console.log();
	});

	socket.on('join', (data, callback) => {
		console.log('Join');
		if (!Object.keys(data).includes('id')) return;

		// Check if room exists
		let room = Array.from(io.sockets.adapter.rooms).find(([name, users]) => {
			if (!name.startsWith('room.')) return false;

			let id = name.split('room.')[1];
			return id == data.id;
		});

		if (room == undefined) return callback({ status: false, reason: 'Room inexistent' });

		let users = Array.from(room[1]);

		// If already in room, ignore
		if (users.includes(socket.id)) return callback({ status: false, reason: 'Already present in room' });

		// If room is full, ignore
		if (users.length >= 2) return callback({ status: false, reason: 'Room occupied' });

		let color = io.sockets.sockets.get(users[0]).data.color == 'w' ? 'b' : 'w';

		socket.join(`room.${data.id}`);
		socket.data.color = color;
		socket.data.engine = new Chess();
		socket.data.started = false;
		socket.data.name = data.name || 'Unnamed';

		users = users.concat([socket.id]);

		// Start game if room is filled
		if (users.length == 2) {
			users = users.map((id) => {
				return [id, io.sockets.sockets.get(id)];
			});

			users.map(([id, user]) => {
				user.data.started = true;

				io.to(id).emit('start', {
					board: user.data.engine.board(),
					color: user.data.color,
					legal:
						user.data.engine.turn() == user.data.color
							? user.data.engine.moves({ verbose: true }).map((move) => {
									return { from: move.from, to: move.to };
							  })
							: [],
					players: users.map(([_, user]) => user.data.name),
					turn: user.data.engine.turn(),
				});
			});
		}

		callback({ status: true });
	});

	socket.on('create', (data, callback) => {
		console.log('Create');

		let code = makeRoomCode(10);
		socket.join(`room.${code}`);
		socket.data.color = 'w';
		socket.data.engine = new Chess();
		socket.data.started = false;
		socket.data.name = data.name || 'Unnamed';

		callback(code);
	});
});
