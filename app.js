const { server, io } = require('./load.js');
const { Chess } = require('chess.js');

// TODO: Add reconnection capabilities to socket client (this might not be possible)
// TODO: Handle same browser login
// TODO: Add game spectating
// TODO: Add game board preview from lobby and board maximization/magnification

const colors = {
	'w': 'White',
	'b': 'Black',
};

let rooms = {};
let identities = {};

const getSocketById = (id) => io.sockets.sockets.get(id);

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

const generateRoom = (creator, name, color, time) => {
	let code = makeRoomCode(10);

	rooms[code] = {
		started: false,
		ended: false,
		engine: new Chess(),
		timeout: null,
		duration: time, // Seconds
		initial: null,
		time: {
			from: null, // Date to count down from
			directed: null, // Id of socket that has a turn
		},
		players: {
			[creator]: {
				name: name,
				color: color,
				elapsed: 0,
			},
		},
	};

	return code;
};

const enterRoom = (joiner, room, name, color) => {
	let socket = getSocketById(joiner);

	socket.join(`room.${room}`);

	rooms[room] = {
		...rooms[room],
		started: true,
		ended: false,
		players: {
			...rooms[room].players,
			[joiner]: {
				name: name,
				color: color,
				elapsed: 0,
			},
		},
	};
};

const getEngineResult = (engine) => {
	let over = engine.isGameOver();
	let reason = null;
	let winner = '';
	if (over) {
		let report = {
			'Stalemate': engine.isStalemate(),
			'Insufficient Material': engine.isInsufficientMaterial(),
			'Threefold Repetition': engine.isThreefoldRepetition(),
			'50-move Rule': engine.isDraw(),
		};

		reason = 'Ended: ';

		if (engine.isCheckmate()) {
			reason += `Checkmate - ${engine.turn() == 'w' ? 'Black' : 'White'} has won`;
			winner = engine.turn();
		} else {
			let [name, _] = Object.entries(report).find(([name, result]) => result);
			reason += name;
		}
	}

	return { over: over, reason: reason, winner: winner };
};

const getBoardUpdateObject = (engine, room, playerData) => {
	return {
		last: getLastMove(engine),
		board: engine.board(),
		fen: engine.fen(),
		timeInfo: {
			...room.time,
			duration: room.duration,
			players: Object.entries(room.players).map(([id, data]) => {
				return { id: id, elapsed: data.elapsed };
			}),
		},
		legal:
			engine.turn() == playerData.color
				? engine.moves({ verbose: true }).map((move) => {
						return { from: move.from, to: move.to };
				  })
				: [],
		players: Object.entries(room.players).map(([id, data]) => {
			return {
				id: id,
				name: data.name,
			};
		}),
		turn: engine.turn(),
		check: engine.inCheck(),
		result: { over: false, result: null },
	};
};

const timerLose = (playerId) => {
	// Get player room
	let result = Object.entries(rooms).find(([id, room]) => Object.keys(room.players).includes(playerId));
	if (result == undefined) return console.log(`GAME-ACTIVITY: Failed to timer lose player "${playerId}": not in room`);
	let [roomId, room] = result;

	// Get player data
	let player = room.players[playerId];

	// Stop if game has already ended
	if (getEngineResult(room.engine).over) return console.log(`GAME-ACTIVITY: Failed to timer lose player "${playerId}": game has ended`);

	// Ensure the correct duration has passed
	if ((Date.now() - room.initial) / 1000 < room.duration) {
		return console.log(`GAME-ACTIVITY: Failed to timer lose player "${playerId}": total game time does not exceed duration (${(Date.now() - room.initial) / 1000}/${room.duration}s)`);
	}

	// Update board with new defeated data
	Object.entries(room.players).map(([userId, data]) => {
		let engine = room.engine;

		let object = getBoardUpdateObject(engine, room, data);
		object.result = { over: true, reason: `Ended: Timeout win - ${player.color == 'w' ? 'Black' : 'White'} has won` };

		io.to(userId).emit('update-board', object);
	});

	room.ended = true;

	informLobby();
	closeRoom(`room.${roomId}`);
};

// FIXME: When user performs a recovery, dont update entire room, only send current data to that recovered user as a callback in the confirm

const informRoom = (id, init = false, premove = false) => {
	console.log(`Informing room update-board`);
	Object.entries(rooms[id].players).map(([userId, data]) => {
		// console.log(userId);
		// Constant Update Variables:
		// .last, .board, .legal, .timeInfo, .players, .turn, .over, .result

		// Initialization Variables
		// .name, .color

		// Game Over Variables
		// .result, .legal

		let engine = rooms[id].engine;

		let object = getBoardUpdateObject(engine, rooms[id], data);
		// console.log(object);
		let result = getEngineResult(engine);
		if (result.over) object.legal = null;
		object.result = result;

		if (init) {
			object.color = data.color;
			object.name = data.name;
		}

		object.premove = premove;

		object.identities = Object.keys(rooms[id].players).map((user) => identities[user]);

		io.to(userId).emit(init ? 'start' : 'update-board', object);
	});
};

const initializeRoom = (id) => {
	// Remove all recoveries for all players
	pending = pending.filter(
		(recovery) =>
			!Object.values(rooms[id].players)
				.map((player) => player.id)
				.includes(recovery.id)
	);

	// Start counting time for white player
	let white = Object.entries(rooms[id].players).find(([id, data]) => data.color == 'w')[0];
	rooms[id].time = {
		from: Date.now(),
		directed: white, // Socket ID
	};

	// Create defeat timeout for white
	if (rooms[id].duration > 0) {
		rooms[id].timeout = setTimeout(() => {
			timerLose(white);
		}, rooms[id].duration * 1000);
	}

	// Start room
	rooms[id].started = true;
	rooms[id].initial = Date.now();

	// Force all players out of lobby room
	Object.keys(rooms[id].players).map((id) => {
		let user = getSocketById(id);
		user.leave('lobby');
	});

	// Inform all users of updated data
	informRoom(id, true);
};

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

const clearAllRooms = (socket) => {
	let currentRooms = Array.from(socket.rooms).filter((item) => item.startsWith('room.'));
	if (currentRooms.length > 0) {
		currentRooms.map((room) => {
			socket.leave(room);
		});
		console.log(`Forcing out of ${currentRooms.length} room(s)...`);
	}
};

const getRoomsData = () => {
	return Object.entries(rooms)
		.filter(([id, data]) => !data.ended)
		.map(([id, data]) => {
			return {
				id: id,
				names: Object.values(data.players),
				duration: data.duration,
				board: data.engine.board(),
			};
		});
};

const informLobby = () => {
	let data = getRoomsData();

	console.log(`ROOM-ACTIVITY: Informing lobby of updated room data`);

	io.in('lobby').emit('lobby-update', data);
};

const closeRoom = (roomName) => {
	let roomId = roomName.split('room.')[1];
	// Remove room from rooms object
	if (Object.keys(rooms).includes(roomId)) {
		delete rooms[roomId];
	}
	console.log(`ROOM-ACTIVITY: Deleting room ${roomId} from rooms object`);

	// If room does not exist in socket.io
	if (
		!Array.from(io.sockets.adapter.rooms)
			.map((room) => room[0])
			.includes(roomName)
	) {
		return;
	}

	console.log(`ROOM-ACTIVITY: Deleting room ${roomId} from socket.io`);

	Array.from(io.sockets.adapter.rooms.get(roomName)).map((id) => {
		let user = io.sockets.sockets.get(id);
		user.leave(roomName);
	});
};

// TODO: Modularize wins

// Returns validity of attempt, and list of IDs of sockets present in room
const isJoinValid = (data, id) => {
	if (!Object.keys(data).includes('id')) return [false, null];

	// Check if room exists
	let room = Array.from(io.sockets.adapter.rooms).find(([name, users]) => {
		if (!name.startsWith('room.')) return false;
		return name.split('room.')[1] == data.id;
	});

	if (room == undefined) return [false, null];

	let users = Array.from(room[1]);

	// If already in room, ignore
	if (users.includes(id)) return [false, null];

	// If room is full, ignore
	if (users.length >= 2) return [false, null];

	console.log(`ROOM-ACTIVITY: User "${id}" has successfully joined room "${data.id}"`);
	return [true, users];
};

const destroyCreated = (socket) => {
	let created = Object.entries(rooms).filter(([id, data]) => !data.started && Object.keys(data.players).includes(socket));

	console.log(`ROOM-ACTIVITY: Removing ${created.length} user created room(s) under "${socket}"`);

	created.map(([id, data]) => {
		delete rooms[id];
	});
};

const formatSeconds = (seconds) => {
	seconds = Math.max(0, seconds); // Clamp seconds to always be positive
	let minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds - minutes * 60);
	seconds = seconds.toString().padStart(2, '0');
	return `${minutes}:${seconds}`;
};

const abandonPlayerRoom = (socket) => {
	// Find user room
	let result = Object.entries(rooms).find(([id, room]) => Object.keys(room.players).includes(socket));
	if (result == undefined) return;
	let [id, room] = result;

	if (room.ended) return;

	// Inform remaining players of disconnection
	console.log(`GAME-ACTIVITY: Abandoning remaining players in room "${id}" by user "${socket}"`);
	Object.keys(room.players)
		.filter((player) => player != socket)
		.map((user) => {
			io.to(user).emit('disconnection', { reason: 'disconnected', name: room.players[socket].name });
		});

	room.ended = true;

	// Close room
	closeRoom(`room.${id}`);
	informLobby();
};

let pending = [];
let recovery_period = 3000; // If the time of a connection to the latest disconnection is less than this, the user will be reconnected

let identity_pending = [];
let identity_recovery_period = 60000;

const attemptRecovery = (ip, socket, callback) => {
	let index = pending.findIndex((item) => item.ip == ip);
	// If no past disconnections, connection is confirmed based upon room presence
	if (index == -1) {
		let result = Object.entries(rooms).filter(([id, room]) => Object.keys(room.players).includes(socket.id));
		return callback(result.length != 0, null);
	}

	let disconnection = pending[index];

	console.log(`USER-ACTIVITY: Attempting recovery from previous disconnection (${ip})`);

	if (Date.now() - disconnection.initial < recovery_period) {
		console.log(`USER-ACTIVITY: Recovered successfully, elapsed time (${Date.now() - disconnection.initial}ms) is less than recovery period (${recovery_period}ms)`);

		clearTimeout(disconnection.timeout);
		pending.splice(index, 1);

		// Reconnect to any rooms
		let result = Object.entries(rooms).filter(([id, room]) => Object.keys(room.players).includes(disconnection.socket));
		if (result.length == 0) return callback(false, null);

		let [id, room] = result[0];

		let players = Object.assign({}, room.players);
		let data = players[disconnection.socket];
		delete players[disconnection.socket];
		players[socket.id] = data;

		rooms[id].players = players;

		if (room.time.directed == disconnection.socket) {
			rooms[id].time.directed = socket.id;
		}

		socket.join(`room.${id}`);

		callback(true, id);
		return;
	}

	console.log(`USER-ACTIVITY: Failed to recover, elapsed time (${Date.now() - disconnection.initial}ms) is greater than recovery period (${recovery_period}ms)`);
	pending.splice(index, 1);
	callback(false, null);
};

const attemptIdentityRecovery = (ip, socket) => {
	let index = identity_pending.findIndex((item) => item.ip == ip);

	if (index == -1) return;

	let disconnection = identity_pending[index];
	console.log(`USER-ACTIVITY: Attempting identity recovery from previous disconnection (${ip})`);

	// Recovered succesfully
	if (Date.now() - disconnection.initial < identity_recovery_period) {
		console.log(`USER-ACTIVITY: Recovered identity successfully, elapsed time (${Date.now() - disconnection.initial}ms) is less than recovery period (${identity_recovery_period}ms)`);

		let identity = identities[disconnection.socket];
		delete identities[disconnection.socket];
		identities[socket.id] = identity;
	}
};

io.on('connection', (socket) => {
	const ip = socket.handshake.headers['true-client-ip'];

	console.log(`USER-ACTIVITY: "${socket.id}" connected`);

	attemptIdentityRecovery(ip, socket);

	socket.on('confirm-connection', (callback) => {
		console.log('Confirm Connection');
		attemptRecovery(ip, socket, (result, room) => {
			let data = null;

			if (result && room != null) {
				data = getBoardUpdateObject(rooms[room].engine, rooms[room], rooms[room].players[socket.id]);

				let result = getEngineResult(rooms[room].engine);
				data.result = result;
			}

			callback({
				result: result,
				data: data,
			});
		});
	});

	socket.on('sync-unix', (time, callback) => {
		callback(Date.now() - time);
	});

	socket.on('error', (err) => {
		console.log(err.toString());
	});

	// Unreceived exit (browser close, refresh, etc...)
	socket.on('disconnect', (reason) => {
		console.log(`USER-ACTIVITY: User "${socket.id}" has disconnected from server (${reason})`);

		// FIXME: Don't log disconnections if the user is not currently in a room, and if this is done
		// remove the automatic recovery removing in the room initialization function

		// If not in any active games
		if (Object.values(rooms).filter((room) => Object.keys(room.players).includes(socket.id) && room.started).length == 0) {
			// Immediately abandon previous rooms
			console.log(`GAME-ACTIVITY: Abandoning instantaneously any previous rooms of inactive user "${socket.id}"`);
			abandonPlayerRoom(socket.id);
		} else {
			pending.push({
				ip: ip,
				socket: socket.id,
				identity: identities[socket.id],
				initial: Date.now(),
				timeout: setTimeout(() => {
					console.log(`GAME-ACTIVITY: Abandoning any previous rooms of user "${socket.id}" after ${recovery_period}ms`);
					abandonPlayerRoom(socket.id);
				}, recovery_period),
			});
		}

		identity_pending.push({
			ip: ip,
			socket: socket.id,
			initial: Date.now(),
		});

		// abandonPlayerRoom(socket.id);
	});

	// Received exit (through game UI)
	socket.on('exit', () => {
		// Find user room
		let result = Object.entries(rooms).find(([id, room]) => Object.keys(room.players).includes(socket.id));
		if (result == undefined) return;
		let [id, room] = result;

		if (room.ended) return;

		console.log(`USER-ACTIVITY: User "${socket.id}" has voluntarily left room "${id}"`);

		// Inform remaining players of disconnection
		console.log(`GAME-ACTIVITY: Informing remaining players in abandoned room "${id}" by user "${socket.id}"`);
		Object.keys(room.players)
			.filter((player) => player != socket.id)
			.map((user) => {
				io.to(user).emit('disconnection', { reason: 'voluntarily left', name: room.players[socket.id].name });
			});

		room.ended = true;

		// Close room
		closeRoom(`room.${id}`);
		informLobby();
	});

	socket.on('join-lobby', (callback) => {
		console.log(`USER-ACTIVITY: User "${socket.id}" has joined the lobby`);

		socket.join('lobby');

		callback(getRoomsData());

		let { identity } = data;
		if (identity && identity.length != 0) {
			identities[socket.id] = identity;
		} else {
			identities[socket.id] = null;
		}
	});

	socket.on('move', (data) => {
		let { from, to } = data;
		let date = data.start;
		// let date = Date.now();

		// Get user room
		let result = Object.entries(rooms).find(([id, room]) => Object.keys(room.players).includes(socket.id));
		if (result == undefined) return console.log(`GAME-ACTIVITY: Player "${socket.id}" failed to move: not in room`);
		let [roomId, room] = result;

		// Get player data
		let player = room.players[socket.id];

		// If not turn, ignore
		if (room.engine.turn() != player.color) return console.log(`GAME-ACTIVITY: Player "${socket.id}" failed to move: not in turn`);

		// If move is illegal, ignore
		let moveLegal = room.engine.moves({ verbose: true }).find((move) => move.from == from && move.to == to) != undefined;
		if (!moveLegal) return console.log(`GAME-ACTIVITY: Player "${socket.id}" failed to move: illegal move`);

		// Get opponent ID
		let opponent = Object.keys(room.players).find((user) => user != socket.id);

		if (room.duration > 0) {
			// Clear room timer timeout
			if (room.timeout != null) clearTimeout(room.timeout);

			// Increase elapsed time for moving player by the subtracted duration from last move or game initialization
			room.players[socket.id].elapsed = player.elapsed + (date - room.time.from) / 1000;

			// Reset time to this move
			room.time.from = date;

			// Direct timer to opponent (their turn)
			room.time.directed = opponent;

			// Create defeat timeout for opponent
			room.timeout = setTimeout(() => {
				timerLose(opponent);
			}, (room.duration - room.players[opponent].elapsed) * 1000);
		}

		// Inform users of updated data
		room.engine.move(data);
		informRoom(roomId, false, data.premove);
		informLobby();

		console.log(`GAME-ACTIVITY: Player "${socket.id}" has successfully moved in room "${roomId}" as ${colors[player.color].toLowerCase()}`);
		console.log(
			`GAME-ACTIVITY: Showing elapsed time for each user:\n${Object.entries(room.players)
				.map(([id, data]) => {
					return `${id} (${data.name}) - ${data.elapsed}s > ${formatSeconds(room.duration - data.elapsed)}`;
				})
				.join('\n')}`
		);

		// Check if game has finished
		let { over } = getEngineResult(room.engine);

		// If game has ended, close the room after informing players of game status
		if (over) {
			console.log(`GAME-ACTIVITY: Game of room "${roomId}" has ended, closing room`);

			room.ended = true;
			if (room.timeout != null) clearTimeout(room.timeout);
			Object.keys(room.players).map((id) => {
				let user = getSocketById(id);
				user.leave(`room.${roomId}`);
			});

			closeRoom(`room.${roomId}`);
			informLobby();
		}
	});

	socket.on('join', (data, callback) => {
		let [validity, users] = isJoinValid(data, socket.id);
		if (!validity) return console.log(`ROOM-ACTIVITY: User "${socket.id}" failed to join room "${data.id}"`);

		clearAllRooms(socket);

		// Remove all pending recoveries

		// Remove all one-player non-started rooms under this socket (created rooms)
		destroyCreated(socket.id);

		let color = Object.values(rooms[data.id].players)[0].color == 'w' ? 'b' : 'w';

		enterRoom(socket.id, data.id, data.name || '???', color);

		initializeRoom(data.id);

		informLobby();
		callback({ status: true });
	});

	socket.on('create', (data, callback) => {
		// Remove all one-player non-started rooms under this socket
		destroyCreated(socket.id);

		// data.name = (Math.random() * 100).toString();

		let code = generateRoom(socket.id, data.name || '???', data.color, data.time);
		console.log(`ROOM-ACTIVITY: User "${socket.id}" has successfully created room "${code}"`);

		socket.join(`room.${code}`);

		informLobby();
		callback(code);
	});
});

server.listen(process.env.PORT || '9000');
