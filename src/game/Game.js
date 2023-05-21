import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Divider } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { v4 as uuidv4 } from 'uuid';
import './Game.scss';
import { Chess } from 'chess.js';
const engine = new Chess();

// transition: opacity 0.3s, top 0.4s cubic-bezier(0, -0.02, 0, 1);
//
// console.log(engine.moves({ verbose: true }));

// FIXME: Maybe try making transitions from board updates?
// TODO: Handle multiple animations *
// FIXME: Incorrect click positions for smaller screen, squares (not clicking on highlight icon) *
// TODO: Scale row/rank indicators and highlight icons with inner width *
// TODO: Handle conflict from same move client/server animation
// FIXME: Cancel all animations that arrive at the same destination when creating a new animation
// FIXME: Ability to move client-side while not in turn

// TODO: Cancel animation on promotion

const animationTime = 0.25; // in seconds
// const animationSpeed = 900; // pixel per second

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

		legal: [],
		pieces: [],

		highlighted: [],
		overlay: false,
		overlayMessage: '',
		waitPromote: { status: false, offset: 0, from: null, to: null },
		moving: { status: false, type: null, color: null, from: null, to: null },
		animation: null,
		animationTimeout: null,
		animations: [],

		color: 'w',
		// players: ['Loading...', 'Loading...'], // (dev)
		players: [],
		gameOver: true,
		cellSize: 80,
		name: '',
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
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
		console.log(row);
		console.log(rank);

		row += y;
		rank += x;

		console.log(row);
		console.log(rank);

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

	useEffect(() => {
		console.log(`State changed to:`);
		console.log(state);
	}, [state]);

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
		if (_state.current.animationTimeout) clearTimeout(_state.current.animationTimeout);

		let id = uuidv4();

		setState({
			...(object || _state.current),
			animation: { status: true, from: latest.from, to: latest.to, id: id, captured: latest.captured, color: latest.color },
		});

		setTimeout(() => {
			if (_state.current.animation == null) return;
			if (_state.current.animation.id != id) return;

			setState({
				..._state.current,
				animation: {
					..._state.current.animation,
					status: false,
				},
				animationTimeout: setTimeout(() => {
					setState({
						..._state.current,
						animation: null,
					});
				}, animationTime * 1000),
			});
		}, 10); // See a solution for this
	};

	const logAnimations = (animations) => {
		return animations.map((a) => `${a.from}-${a.to}`).join(', ');
	};

	const onUpdateBoard = (data, color = undefined, name = undefined) => {
		console.log(`Updating board with data (${color} -> ${color != undefined ? color : _state.current.color}) (${name} -> ${name != undefined ? name : _state.current.name})`);

		let object = {
			..._state.current,
			pieces: data.board,
			legal: data.legal,
			overlay: data.over,
			overlayMessage: data.over ? data.reason : '',
			color: color != undefined ? color : _state.current.color,
			name: name != undefined ? name : _state.current.name,
			players: data.players,
			turn: data.turn,
			gameOver: data.over,
			cellSize: window.innerWidth <= 700 ? (window.innerWidth * 11.42) / 100 : 80,
		};

		// Remove illegal pre-highlights
		if (data.turn == _state.current.color) {
			object.highlighted = object.highlighted.filter((item) => data.legal.find((move) => move.to == item && move.from == _state.current.selected) != undefined);
		}

		if (data.last == undefined) return setState(object);

		// console.log(`Attempting to run animation from update-board...`);
		// console.log(`path: ${data.last.from} -> ${data.last.to}`);
		// console.log(`current animations: ${logAnimations(_state.current.animations)}`);
		// console.log(`filtered animations with same path: ${logAnimations(_state.current.animations.filter((animation) => animation.from == data.last.from && animation.to == data.last.to))}`);

		if (_state.current.animation != null && _state.current.animation.from == data.last.from && _state.current.animation.to == data.last.to) return setState(object);
		// let client = _state.current.animations.filter((animation) => animation.from == data.last.from && animation.to == data.last.to).length > 0;
		// if (client) return setState(object);

		createAnimation(data.last, object);

		// console.log(`Updating color to ${data.color != undefined ? data.color : state.color}`);

		// const animationId = uuidv4();
		// setState({
		// 	...object,
		// 	animations: [..._state.current.animations, { status: true, from: data.last.from, to: data.last.to, id: animationId }],
		// });

		// beginAnimationSequence(animationId);
	};

	useEffect(() => {
		window.addEventListener('resize', () => {
			setState({
				..._state.current,
				cellSize: window.innerWidth <= 700 ? (window.innerWidth * 11.42) / 100 : 80,
			});
		});

		socket.on('dev-start', (data) => {
			console.log(`socket dev-start`);
			console.log(data);
			onUpdateBoard(data, data.color);
		});

		socket.on('update-board', (data) => {
			console.log(`socket on-update-board`);
			// let board = data.board;

			// if (state.moving.status) {
			// 	board = copyBoard(data.board);
			// 	let { row: fromRow, rank: fromRank } = getBoardPieceByNotation(board, state.moving.from);
			// 	let { row: toRow, rank: toRank } = getBoardPieceByNotation(board, state.moving.to);

			// 	// let piece = board[fromRow][fromRank];
			// 	// if (promotion != null) piece.type = promotion;

			// 	board[fromRow][fromRank] = state.pieces[fromRow][fromRank];
			// 	board[toRow][toRank] = state.pieces[toRow][toRank];
			// 	// board[toRow][toRank] = piece;
			// }

			// console.log('UPDATE BOARDDD');
			// console.log(state.pieces);
			// console.log(board);
			// console.log(data.board);

			// onUpdateBoard({
			// 	...data,
			// 	board: board,
			// });
			setTimeout(function () {
				onUpdateBoard(data);
			}, 10);
		});

		socket.on('connect_error', () => {
			console.log(`CLIENT: Connect error occured as ${socket.id}, attempting to connect... (connected: ${socket.connected})`);
			socket.connect();
		});

		socket.on('connect', () => {
			console.log(`CLIENT: I have connected as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.on('disconnect', (reason) => {
			console.log(`CLIENT: I have disconnected as ${socket.id}, reason: ${reason} (connected: ${socket.connected})`);
			if (reason === 'io server disconnect') {
				console.log(`CLIENT: Reason for disconnection "io server disconnected", attempting to connect... (connected: ${socket.connected})`);
				// the disconnection was initiated by the server, you need to reconnect manually
				socket.connect();
			}
			// else the socket will automatically try to reconnect
		});

		socket.io.on('reconnection_attempt', () => {
			console.log(`CLIENT: I have attempted a reconnection as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.io.on('reconnect', () => {
			// window.location.reload(); // (dev)

			console.log(`CLIENT: I have reconnected as ${socket.id} (connected: ${socket.connected})`);
		});

		socket.on('disconnection', (data) => {
			console.log('set state disconnection (forced disconnect)');
			console.log(_state.current);
			setState({
				..._state.current,
				overlay: true,
				overlayMessage: `Opponent "${state.players.filter((item) => item == localStorage.getItem('name'))[0]}" ${data.reason}`,
				gameOver: true,
			});
		});

		if (location.state == null) return;
		onUpdateBoard(location.state, location.state.color, location.state.name);
	}, []);

	const copyBoard = (board) => {
		return JSON.parse(JSON.stringify(board));
	};

	const requestPromotion = (from, to) => {
		console.log('set staet proomotin');
		setState({
			...state,
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
		console.log(captured);

		board[toRow][toRank] = board[fromRow][fromRank];
		board[toRow][toRank].square = to;
		board[fromRow][fromRank] = null;

		createAnimation(
			{ from: from, to: to, captured: captured != null ? captured.piece : null, color: state.color },
			{
				..._state.current,
				pieces: board,
				waitPromote: { status: false, offset: 0, from: null, to: null },
				overlay: false,
				highlighted: [],
				selected: null,
			}
		);

		// Move in server
		socket.emit('move', { from: from, to: to, promotion: promotion }, (response) => {
			if (response.status) {
				console.log(`Successfully moved ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}`);
			} else {
				console.log(`Failed to move ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}: ${response.reason}`);
			}
		});
	};

	const onSquareClick = (position) => {
		let { piece } = getBoardPieceByNotation(_state.current.pieces, position);
		if (piece != null) return;
		console.log(`SQUARE CLICK`);
	};

	const onClick = (position, piece) => {
		// if (state.moving.status) return;

		console.log(`PIECE CLICK`);
		console.log(`onClick event`);
		let start = Date.now();
		let hasPiece = piece != null;
		console.log(`Clicked on ${position} with piece object: ${piece}, has piece: ${hasPiece} (${Date.now() - start} ms)`);

		if (state.turn != state.color) {
			if (hasPiece && piece.color == state.color) {
				setState({
					..._state.current,
					selected: position,
					highlighted: getPieceLegalMoves(position, piece.type, piece.color),
				});
			} else {
				if (state.selected != null) setState({ ...state, highlighted: [], selected: null });
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

			console.log(`Click position is a legal move for the currently selected piece, moving... (${Date.now() - start} ms)`);

			// If moves to the same square are greater than one, it's a promotion
			if (moves.length > 1) {
				console.log(`Legal moves of the same position are multiple, requesting promotion... (${Date.now() - start} ms)`);
				requestPromotion(state.selected, position);
				return;
			} else {
				return sendMove(state.selected, position);
			}
		}

		if (!hasPiece) {
			console.log(`Click position does not have any pieces, ignoring... (${Date.now() - start} ms)`);
			if (state.selected != null) setState({ ...state, highlighted: [], selected: null });
			return;
		}

		if (!state.legal.map((move) => move.from).includes(position)) {
			console.log(`Selected piece does not have any legal moves, ignoring... (${Date.now() - start} ms)`);
			if (state.selected != null) setState({ ...state, highlighted: [], selected: null });
			return;
		}

		let highlighted = state.legal.filter((move) => move.from == position).map((move) => move.to);
		console.log(`Selected piece has ${highlighted.length} legal move(s), highlighting all... (${Date.now() - start} ms)`);

		setState({
			..._state.current,
			selected: position,
			highlighted: highlighted,
		});
	};

	const getPieces = () => {
		console.log(`Loading pieces, color is ${state.color}`);

		if (state.color == 'w') {
			console.log(state.pieces);
			return state.pieces;
		} else {
			let pieces = copyBoard(state.pieces);
			pieces = pieces.map((row) => row.reverse()).reverse();

			console.log(pieces);
			return pieces;
		}
	};

	const exitGame = () => {
		if (!state.gameOver) socket.emit('exit');

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
				if (object.position == state.selected) {
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

	const getOpponentName = () => {
		let opponent = state.players.filter((player) => player != state.name);
		if (opponent.length != 0) return opponent[0];

		return state.players[0];
	};

	return (
		<div id='game' className='page'>
			<div id='main'>
				<div id='left' className='side'>
					{/* {getMissing(
						state.pieces
							.flat()
							.filter((piece) => piece && piece.color == state.color)
							.map((piece) => piece.type)
					).map((piece) => {
						return <img src={require(`../icons/${state.color}${piece}.svg`)}></img>;
					})} */}
				</div>
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
						<div>{state.players.join(' vs ')}</div>
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
											// 	console.log(`ANIMATION: Animating piece at ${piece.square} [${Math.round(top)}, ${Math.round(left)}]`);
											// 	console.log(`ANIMATION: ${JSON.stringify(animation)}`);
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
							{state.overlayMessage}
						</div>
					</div>
					<div id='footer'>{state.turn == 'b' ? "Black's turn" : "White's turn"}</div>
				</div>
				<div id='right' className='side'>
					<div className='control'>
						<div className='piece-log'>
							{/* {'ppppppppqkbbnnrr'
								.split('')
								.map((piece) => `b${piece}`)
								.map((name) => {
									return <img src={require(`../icons/${name}.svg`)}></img>;
								})} */}
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
						<div className='inner'>
							<div className='name'>{getOpponentName()}</div>
							<Divider style={{ width: '100%', backgroundColor: 'white' }} />
							<div className='name'>{state.name}</div>
						</div>
						{/* you is always at the bottom */}
						<div className='piece-log'>
							{Object.entries(calculateScores())
								.map(([key, value]) => {
									if (value.dominance != state.color || value.dominance == null) return;
									console.log([key, value]);
									let pieces = [];
									for (let i = 0; i < value.occurences; i++) {
										pieces.push(<img src={require(`../icons/${state.color == 'w' ? 'b' : 'w'}${key}.svg`)}></img>);
									}
									return pieces;
								})
								.flat()
								.filter((e) => e)}
							{/* {'pppppqknnrr'
								.split('')
								.map((piece) => `w${piece}`)
								.map((name) => {
									return <img src={require(`../icons/${name}.svg`)}></img>;
								})} */}
						</div>
					</div>
					{/* {getMissing(
						state.pieces
							.flat()
							.filter((piece) => piece && piece.color != state.color)
							.map((piece) => piece.type)
					).map((piece) => {
						return <img src={require(`../icons/${state.color == 'w' ? 'b' : 'w'}${piece}.svg`)}></img>;
					})} */}
				</div>
			</div>
		</div>
	);
}
