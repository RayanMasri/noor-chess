const { server, io } = require('./load.js');

const { Chess } = require('chess.js');

// console.log(engine.history({ verbose: true }));
// Create a new Chess instance

// engine.move({ from: 'd2', to: 'd1', promotion: 'b' });
// console.log(
// 	JSON.stringify({
// 		board: engine.board(),
// 		legal: engine.moves({ verbose: true }),
// 	})
// );

// TODO: add reconnection capabilities to socket client
// TODO: Handle promotion *
// TODO: Handle end game *
// TODO: Handle other user leave *
// TODO: Handle same browser login
// TODO: add piece promotion

const getLastMove = (engine) => {
	let history = engine.history({ verbose: true });
	let move = history[history.length - 1];
	if (move == undefined) return undefined;
	return {
		color: move.color,
		from: move.from,
		to: move.to,
		piece: move.piece,
		captured: move.captured,
		promotion: move.promotion,
	};
};

console.log();

const clearAllRooms = (socket) => {
	let currentRooms = Array.from(socket.rooms).filter((item) => item.startsWith('room.'));
	if (currentRooms.length > 0) {
		currentRooms.map((room) => {
			socket.leave(room);
		});
		console.log(`Forcing out of ${currentRooms.length} room(s)...`);
	}
};

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

const getRoomsData = () => {
	console.log(`Get rooms data:`);
	console.log(Array.from(io.sockets.adapter.rooms));
	return Array.from(io.sockets.adapter.rooms)
		.map(([name, users]) => {
			if (!name.startsWith('room.') || name == 'lobby') return;

			let id = name.split('.')[1];
			return {
				id: id,
				names: Array.from(users).map((user) => {
					let socket = io.sockets.sockets.get(user);
					return { name: socket.data.name, color: socket.data.color };
				}),
			};
		})
		.filter((room) => room);
};

const informLobby = (socket) => {
	let data = getRoomsData();

	console.log(`Informing lobby of this data:`);
	console.log(data);

	io.in('lobby').emit('lobby-update', data);
};

const devInit = (socket) => {
	let sockets = Array.from(io.sockets.sockets).map((e) => e[0]);

	console.log(`Connected sockets: ${sockets.length} socket(s)`);
	if (sockets.length == 1) {
		console.log(`Create`);
		socket.join(`room.asd`);
		socket.data.color = 'w';
		socket.data.engine = new Chess();
		socket.data.started = false;
		socket.data.name = 'john';
	}

	if (sockets.length == 2) {
		let socket = io.sockets.sockets.get(sockets[1]);

		console.log('Join');

		let users = Array.from(Array.from(io.sockets.adapter.rooms).find(([name, users]) => name.startsWith('room.'))[1]);

		socket.join(`room.asd`);
		socket.data.color = 'b';
		socket.data.engine = new Chess();
		socket.data.started = false;
		socket.data.name = 'bromine';

		users = users.concat([socket.id]);
		console.log(users);

		// Start game if room is filled
		users = users.map((id) => {
			return [id, io.sockets.sockets.get(id)];
		});

		users.map(([id, user]) => {
			setTimeout(function () {
				console.log(user.data.color);
				user.data.started = true;
				user.leave('lobby');

				io.to(id).emit('dev-start', {
					last: getLastMove(user.data.engine),
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
			}, 500);
		});
	}
};

const closeRoom = (roomName) => {
	// If room does not exist
	if (
		!Array.from(io.sockets.adapter.rooms)
			.map((room) => room[0])
			.includes(roomName)
	) {
		return;
	}

	Array.from(io.sockets.adapter.rooms.get(roomName)).map((id) => {
		let user = io.sockets.sockets.get(id);
		user.leave(roomName);
	});
};

io.on('connection', (socket) => {
	// devInit(socket); // (dev)

	console.log(`"${socket.id}" connected`);

	socket.on('disconnect', () => {
		console.log(`"${socket.id}" disconnected`);
		// Check rooms with single users that have started a game
		Array.from(io.sockets.adapter.rooms).map(([name, users]) => {
			if (!name.startsWith('room.')) return;

			users = Array.from(users);
			if (users.length != 1) return;

			if (io.sockets.sockets.get(users[0]).data.started) {
				io.to(users[0]).emit('disconnection', { reason: 'disconnected' });
			}
		});

		// console.log(Array.from(io.sockets.adapter.rooms));
	});

	socket.on('exit', () => {
		let roomName = Array.from(socket.rooms).find((room) => room.startsWith('room.'));
		if (roomName == undefined) return;

		socket.to(roomName).emit('disconnection', { reason: 'voluntarily left' });
		console.log(`"${socket.id}" exitted, closing room`);
		// Close room
		closeRoom(roomName);
	});

	socket.on('join-lobby', (callback) => {
		console.log('join-lobby');
		socket.join('lobby');
		callback(getRoomsData());
	});

	socket.on('move', (data, callback) => {
		if (socket.data.engine == undefined) return;

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
					last: getLastMove(user.data.engine),
					board: user.data.engine.board(),
					legal: null,
					over: true,
					reason: reason,
					players: users.map(([_, user]) => user.data.name),
					turn: user.data.engine.turn(),
				});

				// Close room
				closeRoom(roomName);
			} else {
				io.to(id).emit('update-board', {
					// fen: user.data.engine.fen(),
					last: getLastMove(user.data.engine),
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

		clearAllRooms(socket);

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
				user.leave('lobby');

				io.to(id).emit('start', {
					last: getLastMove(user.data.engine),
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

		informLobby();
		callback({ status: true });
	});

	socket.on('create', (data, callback) => {
		console.log('Creating a room');

		clearAllRooms(socket);

		let code = makeRoomCode(10);
		socket.join(`room.${code}`);
		socket.data.color = data.color;
		socket.data.engine = new Chess();
		socket.data.started = false;
		socket.data.name = data.name || 'Unnamed';

		informLobby();
		callback(code);
	});
});

server.listen(process.env.PORT || '9000');
