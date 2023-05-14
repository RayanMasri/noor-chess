import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import './Game.scss';

const cellSize = 80;

// for (let i = 0; i < 64; i++) {
// 	let row = Math.floor((63 - i) / 8) + 1;
// 	let rank = ranks[i % 8];
// 	let position = `${rank}${row}`;

// 	// console.log([i, i % 2, Math.floor(i / 8)]);
// 	let square = document.createElement('div');

// 	square.setAttribute('data-position', position);

// 	square.className = `square ${row % 2 == 0 ? (i % 2 == 0 ? 'light' : 'dark') : i % 2 == 0 ? 'dark' : 'light'}`;
// 	square.style.backgroundColor = board.appendChild(square);

// 	square.addEventListener('click', () => {
// 		onPickPiece(square, square.getAttribute('data-position'));
// 	});
// }
// const fenTo2D = (fen) => {
// 	fen = fen.split(' ')[0];
// 	let total = 0;
// 	[...fen.matchAll(/\d/g)].map((match, index) => {
// 		let replacement = 'e'.repeat(parseInt(match[0]));
// 		let increase = replacement.length - 1;

// 		fen = fen.split('');
// 		fen.splice(match.index + total, 1, replacement);
// 		fen = fen.join('');

// 		total += increase;
// 	});

// 	let array = fen.split('/').map((row, index) => row.split(''));
// 	return array;
// };

const Square = (props) => {
	return (
		<div
			className={`square ${props.shade} ${props.selected ? 'selected' : ''}`}
			data-position={props.position}
			onClick={() => {
				props.onClick(props.position, props.piece);
			}}
		>
			{props.children}
			{props.highlighted ? <img draggable='false' className='highlight-icon' src={require(props.piece ? '../icons/stroke-circle.svg' : '../icons/fill-circle.svg').default}></img> : null}
			<div className='rank indicator' style={{ color: props.shade == 'light' ? '#d18b47' : '#ffce9e' }}>
				{props.row == (props.color == 'w' ? 1 : 8) ? 'abcdefgh'[props.rank] : null}
			</div>
			<div className='row indicator' style={{ color: props.shade == 'light' ? '#d18b47' : '#ffce9e' }}>
				{props.rank == (props.color == 'w' ? 7 : 0) ? props.row : null}
			</div>
		</div>
	);
};

// const defaultPieces = 'ppppppppnnbbrrkq';

// let scores = {
// 	'p': 1,
// 	'n': 3,
// 	'b': 3,
// 	'r': 5,
// 	'q': 9,
// 	'k': 0,
// };

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
		color: 'b',
		players: ['Loading...', 'Loading...'],
		gameOver: true,
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const location = useLocation();

	useEffect(() => {
		console.log(`State changed to:`);
		console.log(state);
	}, [state]);

	const onUpdateBoard = (data, color = undefined) => {
		console.log(`Updating board with data (${color} -> ${color != undefined ? color : _state.current.color}):`);
		console.log(data);

		// console.log(`Updating color to ${data.color != undefined ? data.color : state.color}`);
		setState({
			..._state.current,
			pieces: data.board,
			legal: data.legal,
			overlay: data.over,
			overlayMessage: data.over ? data.reason : '',
			color: color != undefined ? color : _state.current.color,
			// color: data.color != undefined ? data.color : state.color,
			players: data.players,
			turn: data.turn,
			gameOver: data.over,
		});
	};

	useEffect(() => {
		socket.on('update-board', (data) => {
			onUpdateBoard(data);
		});

		socket.on('disconnection', (data) => {
			console.log('set state disconnection');
			setState({
				...state,
				overlay: true,
				overlayMessage: `Opponent "${state.players.filter((item) => item == localStorage.getItem('name'))[0]}" ${data.reason}`,
				gameOver: true,
			});
		});

		if (location.state == null) return;
		onUpdateBoard(location.state, location.state.color);
	}, []);

	const copyBoard = (board) => {
		return JSON.parse(JSON.stringify(board));
	};

	const requestPromotion = (from, to) => {
		console.log('set staet proomotin');
		setState({
			...state,
			overlay: true,
			waitPromote: { status: true, offset: (_state.current.color == 'w' ? 'abcdefgh' : 'hgfedcba').indexOf(to.split('')[0]) * cellSize, from: from, to: to },
			highlighted: [],
			selected: null,
		});
	};

	const getBoardPieceByNotation = (board, notation) => {
		let [rank, row] = notation.split('');
		rank = 'abcdefgh'.indexOf(rank);
		row = 8 - row;

		return { piece: board[row][rank], row: row, rank: rank };
	};

	const sendMove = (from, to, promotion = null) => {
		// let start = Date.now()
		// console.log(`Sending move from "${from}" to "${to}"`)
		let board = copyBoard(state.pieces);
		// console.log(`Copied board `)
		let { row: fromRow, rank: fromRank } = getBoardPieceByNotation(board, from);
		let { row: toRow, rank: toRank } = getBoardPieceByNotation(board, to);

		let piece = board[fromRow][fromRank];
		if (promotion != null) piece.type = promotion;

		board[fromRow][fromRank] = null;
		board[toRow][toRank] = piece;

		// console.log([fromRow, fromRank]);
		// console.log([toRow, toRank]);
		// { square: 'a4', type: 'k', color: 'b' }
		console.log('set state send move');
		setState({
			..._state.current,
			pieces: board,
			waitPromote: { status: false, offset: 0, from: null, to: null },
			overlay: false,
			highlighted: [],
			selected: null,
		});

		socket.emit('move', { from: from, to: to, promotion: promotion }, (response) => {
			if (response.status) {
				console.log(`Successfully moved ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}`);
			} else {
				console.log(`Failed to move ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}: ${response.reason}`);
			}
		});
	};

	const onClick = (position, piece) => {
		console.log(`onClick event`);
		let start = Date.now();
		let hasPiece = piece != null;
		console.log(`Clicked on ${position} with piece object: ${piece}, has piece: ${hasPiece} (${Date.now() - start} ms)`);

		if (
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

	// const getMissing = (pieces) => {
	// 	let defaultArray = Array.from(defaultPieces.split(''));
	// 	for (let piece of pieces) {
	// 		defaultArray.splice(defaultArray.indexOf(piece), 1);
	// 	}
	// 	return defaultArray;
	// };

	// const getScoreStatus = () => {
	// 	let pieces = state.pieces.flat().filter((piece) => piece);

	// 	let opponent = pieces
	// 		.filter((piece) => piece.color != state.color)
	// 		.map((piece) => piece.type)
	// 		.reduce((a, b) => {
	// 			scores[a] + scores[b];
	// 		}, 0);

	// 	let player = pieces
	// 		.filter((piece) => piece.color == state.color)
	// 		.map((piece) => piece.type)
	// 		.reduce((a, b) => {
	// 			scores[a] + scores[b];
	// 		}, 0);

	// 	if (opponent == player) return null;
	// };

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
								pointerEvents: state.overlay ? 'none' : 'all',
							}}
						>
							{getPieces()
								.map((row, rowIndex) => {
									return row.map((piece, rankIndex) => {
										let row = 8 - rowIndex;
										let rank = rankIndex;
										let shade = row % 2 == 0 ? (rank % 2 == 0 ? 'light' : 'dark') : rank % 2 == 0 ? 'dark' : 'light';

										if (state.color == 'b') {
											row = rowIndex + 1;
											rank = 7 - rank;
										}

										let position = `${'abcdefgh'[rank]}${row}`;

										return (
											<Square
												position={position}
												color={state.color}
												shade={shade}
												row={row}
												rank={rank}
												piece={piece}
												selected={position == state.selected}
												highlighted={state.highlighted.includes(position)}
												onClick={onClick}
											>
												{piece != null ? <img draggable='false' className='piece-icon' src={require(`../icons/${piece.color}${piece.type}.svg`)}></img> : null}
											</Square>
										);
									});
								})
								.flat()}
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
