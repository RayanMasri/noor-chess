import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Divider } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { v4 as uuidv4 } from 'uuid';
import './Game.scss';
import { Chess } from 'chess.js';
import moment from 'moment';
const engine = new Chess();

// Log titles:
// SERVER:
// 	- RECEIVE: Messages received directly from the server
// 	- CHANGE: Actions performed by client related to server (connect, reconnect, etc...)

// transition: opacity 0.3s, top 0.4s cubic-bezier(0, -0.02, 0, 1);
//
// console.log(engine.moves({ verbose: true }));

// FIXME: Cancel all animations that arrive at the same destination when creating a new animation
// FIXME: Fix promotion column offseted in smaller screen
// FIXME: Can't premove on same color pieces

// TODO: Add check indicator
// background: radial-gradient(ellipse at center, rgb(255, 0, 0) 0%, rgb(231, 0, 0) 25%, rgba(169, 0, 0, 0) 89%, rgba(158, 0, 0, 0) 100%)
// TODO: Add audio
// TODO: Add resignation
// TODO: Cancel animation on promotion

// FIXME: Timer 2 second delay bug, issue might be client-side with the 1-second interval
// FIXME: When "move" emits are delayed, the delay is added to the player's timer, which isn't correct,
// Possible fixes:
// Acquire non-system time Date.now() from client and send to server as initial send time
// Change unix timestamp of Date.now() relative to server on initial receive

// FIXME: Using data.start from client has issues with conflicting system times of users
// FIXME: Prevent updated time text to be greater than current time text
// FIXME: Sudden involuntarily client-side disconnections occuring from one user
// FIXME: Some rooms don't disappear when all user leave
// FIXME: Attempt to prevent any animation lag

const animationTime = 0.25; // in seconds
// const animationTime = 15; // in seconds

class Board {
	constructor(props) {
		this.board = props.board;
	}

	// Get piece data at position, e.g: "a8"
	get(notation) {}

	// Move piece from a position to another, updating it's position property, removing pieces in "from" and replacing all pieces in "to" with "from"
	move(from, to) {}
}

// Once in turn, remove illegal highlights from a pre-highlighted piece

export default function Game() {
	const navigate = useNavigate();
	const [state, _setState] = useState({
		selected: null,
		extraSelected: [],
		legal: [],
		pieces: [],
		premove: { from: null, to: null },
		highlighted: [],
		overlay: false,
		waitPromote: { status: false, offset: 0, from: null, to: null },
		moving: { status: false, type: null, color: null, from: null, to: null },
		animation: null,
		animationTimeout: null,
		animations: [],
		color: 'w',
		turn: 'w',
		check: false,
		players: [],
		gameResult: { over: false, reason: null },
		cellSize: 80,
		name: '',
		timeInterval: null,
		timeText: {}, // [<player>, <opponent>]
		timeInfo: {},
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const getDateNow = () => {
		return Date.now() + parseInt(localStorage.getItem('unix-offset'));
	};

	const getCoordinatesFromNotation = (notation) => {
		let [rank, row] = notation.split('');
		row = parseInt(row);
		rank = 'abcdefgh'.indexOf(rank);

		if (state.color == 'b') {
			rank = 7 - rank;
		}

		let top = Math.abs((state.color == 'b' ? 1 : 8) - row) * state.cellSize;
		let left = rank * state.cellSize;

		return { top: top, left: left };
	};

	// 2 -> 5
	// 5 -> 2
	// 7 -> 0
	// 3 -> 4
	// c7 -> f2
	// f7 -> c2
	// h8 -> a1
	// d5 -> e4
	const transformNotation = (notation, x, y) => {
		let [rank, row] = notation.split('');
		row = parseInt(row);
		rank = 'abcdefgh'.indexOf(rank);
		// console.log(row);
		// console.log(rank);

		row += y;
		rank += x;

		// console.log(row);
		// console.log(rank);

		return `${'abcdefgh'[rank]}${row}`;
	};

	const flipNotation = (notation) => {
		let [rank, row] = notation.split('');
		row = parseInt(row);
		rank = 'abcdefgh'.indexOf(rank);

		rank = 'abcdefgh'[7 - rank];
		row = 9 - row;

		return `${rank}${row}`;
	};

	const getPieceLegalMoves = (notation, piece, color) => {
		// notation = 'd1';
		// piece = 'q';
		// color = 'w';
		if (color == 'b') {
			notation = flipNotation(notation);
		}

		engine.clear();
		engine.put({ type: piece, color: 'w' }, notation);

		let legals = engine.moves({ square: notation, verbose: true }).map((item) => item.to);
		// Diagonal capture
		if (piece == 'p') {
			legals.push(transformNotation(notation, -1, 1));
			legals.push(transformNotation(notation, 1, 1));
		}

		if (color == 'b') {
			legals = legals.map((item) => flipNotation(item));
		}

		return legals.filter((item, index) => legals.indexOf(item) == index); // Filter duplicates to ignore promotion possibilities
	};

	const location = useLocation();

	// useEffect(() => {
	// console.log(`State changed to:`);
	// console.log(state);
	// }, [state]);

	const getBoardPieceByNotation = (board, notation) => {
		let [rank, row] = notation.split('');
		rank = 'abcdefgh'.indexOf(rank);
		row = 8 - row;

		return { piece: board.length > 0 ? board[row][rank] : null, row: row, rank: rank };
	};

	// Animation:
	// On move, remove from and to
	// On finish animation, restore to

	const createAnimation = (latest, object = null) => {
		let id = uuidv4();

		if (_state.current.animationTimeout) {
			console.log(`ANIMATION-PROCESS (${id}): Requested animation has overriden current timeout`);
			clearTimeout(_state.current.animationTimeout);
		}
		if (_state.current.animation != null) {
			console.log(`ANIMATION-PROCESS (${id}): An animation is currently present: ${JSON.stringify(_state.current.animation)}`);
		}

		setState({
			...(object || _state.current),
			animation: { status: true, from: latest.from, to: latest.to, id: id, captured: latest.captured, color: latest.color },
		});

		console.log(`ANIMATION-PROCESS (${id}): Waiting for state to initialize animation`);
		setTimeout(() => {
			if (_state.current.animation == null) return;
			if (_state.current.animation.id != id) return;

			console.log(`ANIMATION-PROCESS (${id}): Animation has begun, waiting ${animationTime * 1000}ms for animation to finish`);
			let start = Date.now();
			setState({
				..._state.current,
				animation: {
					..._state.current.animation,
					status: false,
				},
				animationTimeout: setTimeout(() => {
					console.log(`ANIMATION-PROCESS (${id}): Animation has ended, clearing all animations from state (elapsed: ${Date.now() - start}ms)`);
					setState({
						..._state.current,
						animation: null,
					});
				}, animationTime * 1000),
			});
		}, 10); // See a solution for this
	};

	const formatSeconds = (seconds) => {
		seconds = Math.max(0, seconds); // Clamp seconds to always be positive
		let minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds - minutes * 60);
		minutes = minutes.toString().padStart(2, '0');
		seconds = seconds.toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	};

	const parseFormatted = (formatted) => {
		let [minutes, seconds] = formatted.split(':');
		minutes = parseInt(minutes) * 60;
		seconds = parseInt(seconds);
		return minutes + seconds;
	};

	const calculateGameTime = (timeInfo) => {
		let timeText = _state.current.timeText;
		let playing = timeInfo.players.find((player) => player.id == timeInfo.directed);
		let passed = (getDateNow() - timeInfo.from) / 1000 + playing.elapsed;

		timeText[playing.id] = formatSeconds(timeInfo.duration - passed);

		let opponent = timeInfo.players.find((player) => player.id != timeInfo.directed);
		timeText[opponent.id] = formatSeconds(timeInfo.duration - opponent.elapsed);

		return timeText;
	};

	const onUpdateBoard = (data, color = undefined, name = undefined) => {
		// console.log(`Updating board with data (${color} -> ${color != undefined ? color : _state.current.color}) (${name} -> ${name != undefined ? name : _state.current.name})`);

		let object = {
			..._state.current,
			extraSelected: data.last == undefined ? _state.current.extraSelected : [data.last.from, data.last.to],
			pieces: data.board,
			legal: data.legal,
			overlay: data.result.over,
			color: color != undefined ? color : _state.current.color,
			name: name != undefined ? name : _state.current.name,
			// time: data.times,
			players: data.players,
			turn: data.turn,
			check: data.check,
			gameResult: data.result,
			cellSize: window.innerWidth <= 700 ? (window.innerWidth * 11.42) / 100 : 80,
			premove: { from: null, to: null },
			timeInfo: data.timeInfo,
		};

		if (_state.current.timeInterval != null) clearInterval(_state.current.timeInterval);
		if (data.result.over) {
			navigate(location.pathname, { replace: true });
			return setState(object);
		}

		if (data.timeInfo.from != null) {
			let timeText = calculateGameTime(data.timeInfo);
			object.timeText = timeText;

			object.timeInterval = setInterval(() => {
				let timeText = calculateGameTime(data.timeInfo);

				setState({
					..._state.current,
					timeText: timeText,
				});
			}, 1000);
		}

		// Remove illegal pre-highlights
		if (data.turn == _state.current.color) {
			object.highlighted = object.highlighted.filter((item) => data.legal.find((move) => move.to == item && move.from == _state.current.selected) != undefined);
		}

		if (data.last == undefined) return setState(object);

		if (_state.current.animation != null && _state.current.animation.from == data.last.from && _state.current.animation.to == data.last.to) return setState(object);

		console.log(`ANIMATION-REQUEST-SERVER: ${data.last.from} -> ${data.last.to}`);
		if (_state.current.premove.from != null) {
			let legal = data.legal.filter((move) => move.from == _state.current.premove.from && move.to == _state.current.premove.to);

			console.log(legal);
			if (legal.length != 0) {
				let premove = Object.assign({}, _state.current.premove);

				setState(object);
				setTimeout(() => {
					if (legal.length > 1) {
						requestPromotion(premove.from, premove.to);
					} else {
						sendMove(premove.from, premove.to);
					}
				}, 10);
			}
		}

		createAnimation(data.last, object);
	};

	useEffect(() => {
		window.addEventListener('resize', () => {
			setState({
				..._state.current,
				cellSize: window.innerWidth <= 700 ? (window.innerWidth * 11.42) / 100 : 80,
			});
		});

		// socket.on('dev-start', (data) => {
		// 	// console.log(`socket dev-start`);
		// 	// console.log(data);
		// 	onUpdateBoard(data, data.color);
		// });

		socket.on('update-board', (data) => {
			let copied = Object.assign({}, data);
			delete copied.last;
			delete copied.legal;
			delete copied.board;
			console.log(`SERVER-RECEIVE: Board update occured with data: ${JSON.stringify(copied)}`);
			console.log(
				`TIME: Showing elapsed time & intended time strings for each user (current offset is ${localStorage.getItem('unix-offset')}ms):\n${data.timeInfo.players
					.map((player) => {
						return `${player.id} (${data.players.find((_player) => _player.id == player.id).name}) - ${player.elapsed}s > ${formatSeconds(data.timeInfo.duration - player.elapsed)}`;
					})
					.join('\n')}`
			);

			setTimeout(function () {
				onUpdateBoard(data);
			}, 10); // For animation delay
		});

		socket.on('connect_error', () => {
			console.log(`SERVER_CHANGE: Connect error occured as ${socket.id}, attempting to connect... (connected: ${socket.connected})`);
			socket.connect();
		});

		socket.on('connect', () => {
			console.log(`SERVER_CHANGE: I have connected as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.on('disconnect', (reason) => {
			console.log(`SERVER-CHANGE: I have disconnected as ${socket.id}, reason: ${reason} (connected: ${socket.connected})`);
			if (reason === 'io server disconnect') {
				console.log(`SERVER-CHANGE: Reason for disconnection "io server disconnected", attempting to connect... (connected: ${socket.connected})`);
				// the disconnection was initiated by the server, you need to reconnect manually
				socket.connect();
			}
			// else the socket will automatically try to reconnect
		});

		socket.io.on('reconnection_attempt', () => {
			console.log(`SERVER-CHANGE: I have attempted a reconnection as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.io.on('reconnect', () => {
			// window.location.reload(); // (dev)
			console.log(`SERVER-CHANGE: I have reconnected as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.on('disconnection', (data) => {
			console.log(`SERVER-RECEIVE: Opponent voluntarily disconnected`);
			console.log(data);

			// console.log('set state disconnection (forced disconnect)');
			// console.log(_state.current);

			if (_state.current.timeInterval) clearInterval(_state.current.timeInterval);
			setState({
				..._state.current,
				overlay: true,
				gameResult: { over: true, reason: `Opponent "${data.name}" ${data.reason}` },
			});
		});

		if (location.state == null) return;
		onUpdateBoard(location.state, location.state.color, location.state.name);
	}, []);

	const copyBoard = (board) => {
		return JSON.parse(JSON.stringify(board));
	};

	const requestPromotion = (from, to) => {
		// console.log('set staet proomotin');
		setState({
			..._state.current,
			overlay: true,
			waitPromote: { status: true, offset: (_state.current.color == 'w' ? 'abcdefgh' : 'hgfedcba').indexOf(to.split('')[0]) * state.cellSize, from: from, to: to },
			highlighted: [],
			selected: null,
		});
	};

	const sendMove = (from, to, promotion = null) => {
		// Move from client before moving in server
		let board = copyBoard(_state.current.pieces);

		let { row: fromRow, rank: fromRank } = getBoardPieceByNotation(board, from);
		let { row: toRow, rank: toRank } = getBoardPieceByNotation(board, to);

		// board[fromRow][fromRank]

		let captured = board[toRow][toRank];
		// console.log(captured);

		board[toRow][toRank] = board[fromRow][fromRank];
		board[toRow][toRank].square = to;
		board[fromRow][fromRank] = null;

		console.log(`ANIMATION-REQUEST-CLIENT: ${from} -> ${to}`);
		createAnimation(
			{ from: from, to: to, captured: captured != null ? captured.piece : null, color: state.color },
			{
				..._state.current,
				pieces: board,
				waitPromote: { status: false, offset: 0, from: null, to: null },
				overlay: false,
				highlighted: [],
				selected: null,
				extraSelected: [from, to],
				turn: state.color == 'w' ? 'b' : 'w',
			}
		);

		// Move in server

		// socket.emit('move', { from: from, to: to, promotion: promotion });
		// const now = () => {
		// 	return ;
		// 	// return Date.now();
		// };
		socket.emit('move', { from: from, to: to, promotion: promotion, start: getDateNow() });
	};

	const onSquareClick = (position) => {
		let { piece } = getBoardPieceByNotation(_state.current.pieces, position);
		if (piece != null) return;
		// console.log(`SQUARE CLICK`);
	};

	const onClick = (position, piece) => {
		let hasPiece = piece != null;

		// If it's not our turn,
		if (state.turn != state.color) {
			// Check if a square is selected, and the move is within highlighted squares
			if (_state.current.selected != null && _state.current.highlighted.includes(position)) {
				// Queue a premove
				setState({
					..._state.current,
					selected: null,
					highlighted: [],
					premove: { from: _state.current.selected, to: position },
				});
			} else {
				// Check if clicked square has a same-color piece
				if (hasPiece && piece.color == state.color) {
					// Preview all possible moves for that singular piece
					setState({
						..._state.current,
						selected: position,
						highlighted: getPieceLegalMoves(position, piece.type, piece.color),
						premove: { from: null, to: null },
					});
				} else {
					// Otherwise, remove all highlighted & selected squares
					if (state.selected != null) setState({ ...state, highlighted: [], selected: null, premove: { from: null, to: null } });
				}
			}

			return;
		}

		if (
			state.turn == state.color &&
			state.selected != null &&
			state.legal
				.filter((move) => move.from == state.selected)
				.map((move) => move.to)
				.includes(position)
		) {
			let moves = state.legal.filter((move) => move.from == state.selected).filter((move) => move.to == position);

			// console.log(`Click position is a legal move for the currently selected piece, moving... (${Date.now() - start} ms)`);

			// If moves to the same square are greater than one, it's a promotion
			if (moves.length > 1) {
				// console.log(`Legal moves of the same position are multiple, requesting promotion... (${Date.now() - start} ms)`);
				requestPromotion(state.selected, position);
				return;
			} else {
				return sendMove(state.selected, position);
			}
		}

		if (!hasPiece) {
			// console.log(`Click position does not have any pieces, ignoring... (${Date.now() - start} ms)`);
			if (state.selected != null) setState({ ...state, highlighted: [], selected: null });
			return;
		}

		if (!state.legal.map((move) => move.from).includes(position)) {
			// console.log(`Selected piece does not have any legal moves, ignoring... (${Date.now() - start} ms)`);
			if (state.selected != null) setState({ ...state, highlighted: [], selected: null });
			return;
		}

		let highlighted = state.legal.filter((move) => move.from == position).map((move) => move.to);
		// console.log(`Selected piece has ${highlighted.length} legal move(s), highlighting all... (${Date.now() - start} ms)`);

		setState({
			..._state.current,
			selected: position,
			highlighted: highlighted,
		});
	};

	const getPieces = () => {
		// console.log(`Loading pieces, color is ${state.color}`);

		if (state.color == 'w') {
			// console.log(state.pieces);
			return state.pieces;
		} else {
			let pieces = copyBoard(state.pieces);
			pieces = pieces.map((row) => row.reverse()).reverse();

			// console.log(pieces);
			return pieces;
		}
	};

	const exitGame = () => {
		if (!state.gameResult.over) socket.emit('exit');

		navigate('/multiplayer');
	};

	const generateBackground = () => {
		let background = [];
		for (let row = 0; row < 8; row++) {
			for (let rank = 0; rank < 8; rank++) {
				let object = { className: 'square ', rankIndicator: null, rowIndicator: null, position: null, piece: null };
				let shade = row % 2 == 0 ? (rank % 2 == 0 ? 'light' : 'dark') : rank % 2 == 0 ? 'dark' : 'light';

				let _row = 8 - row;
				let _rank = rank;
				if (state.color == 'b') {
					_row = row + 1;
					_rank = 7 - rank;
				}

				object.rankIndicator = _row == (state.color == 'w' ? 1 : 8) ? 'abcdefgh'[_rank] : null;
				object.rowIndicator = _rank == (state.color == 'w' ? 7 : 0) ? _row : null;
				object.position = `${'abcdefgh'[_rank]}${_row}`;
				object.piece = getBoardPieceByNotation(_state.current.pieces, object.position).piece;
				object.className += shade;
				object.className += Object.values(_state.current.premove).includes(object.position) ? ' premove' : '';

				if (state.check && object.piece != null && object.piece.type == 'k' && object.piece.color == state.turn) {
					object.className += ' checked';
				}

				if (object.position == state.selected || state.extraSelected.includes(object.position)) {
					object.className += ' selected';
				}

				background.push(object);
			}
		}
		return background;
	};

	const calculateScores = () => {
		try {
			let pieces = state.pieces.flat();

			let scores = {
				'p': { dominance: null, occurences: 0 },
				'q': { dominance: null, occurences: 0 },
				'b': { dominance: null, occurences: 0 },
				'n': { dominance: null, occurences: 0 },
				'r': { dominance: null, occurences: 0 },
			};

			for (let name of Object.keys(scores)) {
				let black = pieces.filter((piece) => piece != null && piece.color == 'b' && piece.type == name).length;
				let white = pieces.filter((piece) => piece != null && piece.color == 'w' && piece.type == name).length;

				let dominance = black == white ? null : black > white ? 'b' : 'w';
				let occurences = Math.abs(black - white);

				scores[name] = { dominance: dominance, occurences: occurences };
			}

			return scores;
		} catch (e) {
			console.error(e.toString());
			return {};
		}
	};

	return (
		<div id='game' className='page'>
			<div id='main'>
				<div id='center'>
					<div id='header'>
						<IconButton
							style={{
								backgroundColor: '#9F0C20',
								borderRadius: '10px',
							}}
							className='exit-btn'
							onClick={exitGame}
						>
							<ExitToAppIcon sx={{ color: 'white' }} />
						</IconButton>
						<div>{state.players.map((player) => player.name).join(' vs ')}</div>
					</div>
					<div id='outer-board'>
						<div
							id='board'
							style={{
								// pointerEvents: state.overlay ? 'none' : 'all',
								pointerEvents: 'none',
							}}
						>
							{getPieces()
								.map((row, rowIndex) => {
									return row
										.filter((item) => item != null)
										.map((piece, rankIndex) => {
											let { top, left } = getCoordinatesFromNotation(piece.square);

											let animation = state.animation == null ? undefined : state.animation.to == piece.square ? state.animation : undefined;
											// let animation = state.animations.find((animation) => animation.to == piece.square);

											top = animation != undefined ? (animation.status ? getCoordinatesFromNotation(animation.from).top : top) : top;
											left = animation != undefined ? (animation.status ? getCoordinatesFromNotation(animation.from).left : left) : left;
											// if (animation != undefined) {
											// console.log(`ANIMATION: Animating piece at ${piece.square} [${Math.round(top)}, ${Math.round(left)}]`);
											// console.log(`ANIMATION: ${JSON.stringify(animation)}`);
											// }

											return (
												<div
													className='piece'
													style={{
														top: top,
														left: left,
														// pointerEvents: 'all',
														// transition: `${animationTime}s all linear 0s`,
														transition: animation != undefined && !animation.status ? `${animationTime}s all ease 0s` : 'none',
													}}
													// transition: animation != undefined && !animation.status ? `${animationTime}s all linear 0s` : 'none',
													// onClick={(event) => {
													// 	onClick(piece.square, piece);
													// }}
												>
													{piece != null ? <img draggable='false' className='piece-icon' src={require(`../icons/${piece.color}${piece.type}.svg`)}></img> : null}
												</div>
											);
										});
								})
								.flat()}
						</div>
						<div id='background'>
							{generateBackground().map((square) => {
								return (
									<div
										className={square.className}
										onClick={() => {
											onSquareClick(square.position);
											onClick(square.position, square.piece);
										}}
									>
										{state.animation != null && state.animation.to == square.position && state.animation.captured != null ? (
											<img draggable='false' className='capture-icon' src={require(`../icons/${state.animation.color == 'w' ? 'b' : 'w'}${state.animation.captured}.svg`)}></img>
										) : null}

										{state.highlighted.includes(square.position) ? (
											<img
												draggable='false'
												className='highlight-icon'
												src={require(square.piece != null ? '../icons/stroke-circle.svg' : '../icons/fill-circle.svg').default}
												// src={require(Math.random() > 0.5 ? '../icons/stroke-circle.svg' : '../icons/fill-circle.svg').default}
											></img>
										) : null}

										<div className='row indicator'>{square.rowIndicator}</div>
										<div className='rank indicator'>{square.rankIndicator}</div>
									</div>
								);
							})}
						</div>

						<div
							id='overlay'
							style={{
								display: state.overlay ? 'flex' : 'none',
							}}
						>
							{state.waitPromote.status ? (
								<div
									className='promotion-column'
									style={{
										left: `${state.waitPromote.offset}px`,
									}}
								>
									{['q', 'n', 'r', 'b'].map((promotable) => {
										return (
											<div
												onClick={() => {
													// setState({
													// 	...state,
													// 	waitPromote: { status: false, offset: 0, from: null, to: null },
													// 	overlay: false,
													// });
													sendMove(state.waitPromote.from, state.waitPromote.to, promotable);
												}}
											>
												<img draggable='false' src={require(`../icons/${state.color}${promotable}.svg`)}></img>
											</div>
										);
									})}
								</div>
							) : null}
							{state.gameResult.reason}
						</div>
					</div>
					<div id='footer'>{state.turn == 'b' ? "Black's turn" : "White's turn"}</div>
				</div>
				<div id='right' className='side'>
					{state.players.length > 0 ? (
						<div className='control'>
							<div className='piece-log'>
								{Object.entries(calculateScores())
									.map(([key, value]) => {
										if (value.dominance == state.color || value.dominance == null) return;

										let pieces = [];
										for (let i = 0; i < value.occurences; i++) {
											pieces.push(<img src={require(`../icons/${state.color}${key}.svg`)}></img>);
										}
										return pieces;
									})
									.flat()
									.filter((e) => e)}
							</div>
							<div className='timer top'>
								{/* 05<div>:</div>00 */}
								{state.timeText[state.players.find((player) => player.id != socket.id).id]}
							</div>
							<div className='inner'>
								{(() => {
									console.log((parseFormatted(state.timeText[state.players.find((player) => player.id != socket.id).id]) / state.timeInfo.duration) * 100);
									console.log(parseFormatted(state.timeText[state.players.find((player) => player.id != socket.id).id]));
									console.log(state.timeInfo.duration);
								})()}
								<div
									className='progress-bar top'
									style={{
										width: `${(parseFormatted(state.timeText[state.players.find((player) => player.id != socket.id).id]) / state.timeInfo.duration) * 100}%`,
									}}
								>
									&nbsp;
								</div>
								<div className='name'>
									<div>{state.players.find((player) => player.id != socket.id).name}</div>
								</div>
								<Divider style={{ width: '100%', backgroundColor: 'white' }} />
								<div className='name'>
									<div>{state.name}</div>
								</div>
								<div
									className='progress-bar bottom'
									style={{
										width: `${(parseFormatted(state.timeText[socket.id]) / state.timeInfo.duration) * 100}%`,
									}}
								>
									&nbsp;
								</div>
							</div>
							<div className='timer bottom'>
								{/* 05<div>:</div>00 */}
								{state.timeText[socket.id]}
							</div>

							<div className='piece-log'>
								{Object.entries(calculateScores())
									.map(([key, value]) => {
										if (value.dominance != state.color || value.dominance == null) return;
										let pieces = [];
										for (let i = 0; i < value.occurences; i++) {
											pieces.push(<img src={require(`../icons/${state.color == 'w' ? 'b' : 'w'}${key}.svg`)}></img>);
										}
										return pieces;
									})
									.flat()
									.filter((e) => e)}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
