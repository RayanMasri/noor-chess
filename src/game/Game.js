import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket.js';
import { useLocation } from 'react-router-dom';
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
			{props.highlighted ? <img className='highlight-icon' src={require(props.piece ? '../icons/stroke-circle.svg' : '../icons/fill-circle.svg').default}></img> : null}
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
	const [state, _setState] = useState({
		selected: null,
		legal: [],
		pieces: [],
		// legal: [
		// 	{
		// 		color: 'b',
		// 		piece: 'k',
		// 		from: 'b2',
		// 		to: 'c2',
		// 		san: 'Kc1',
		// 		flags: 'n',
		// 		lan: 'b2c1',
		// 		before: '8/4P3/8/8/8/1K6/8/1k6 b - - 0 1',
		// 		after: '8/4P3/8/8/8/1K6/8/2k5 w - - 1 2',
		// 	},
		// 	{
		// 		color: 'b',
		// 		piece: 'k',
		// 		from: 'b2',
		// 		to: 'a2',
		// 		san: 'Ka1',
		// 		flags: 'n',
		// 		lan: 'b2a1',
		// 		before: '8/4P3/8/8/8/1K6/8/1k6 b - - 0 1',
		// 		after: '8/4P3/8/8/8/1K6/8/k7 w - - 1 2',
		// 	},

		// 	{
		// 		color: 'b',
		// 		piece: 'k',
		// 		from: 'b2',
		// 		to: 'b1',
		// 		san: 'Ka1',
		// 		flags: 'n',
		// 		lan: 'b2a1',
		// 		before: '8/4P3/8/8/8/1K6/8/1k6 b - - 0 1',
		// 		after: '8/4P3/8/8/8/1K6/8/k7 w - - 1 2',
		// 	},
		// 	{
		// 		from: 'b2',
		// 		to: 'c1',
		// 	},
		// 	{
		// 		from: 'b2',
		// 		to: 'a1',
		// 	},
		// 	{
		// 		from: 'e6',
		// 		to: 'e7',
		// 	},
		// ],
		// pieces: [
		// 	[null, null, null, null, null, null, null, null],
		// 	[null, null, null, null, { square: 'e7', type: 'p', color: 'w' }, null, null, null],
		// 	[null, null, null, null, { square: 'e6', type: 'q', color: 'b' }, null, null, null],
		// 	[null, null, null, null, null, null, null, null],
		// 	[null, { square: 'b4', type: 'k', color: 'w' }, null, null, null, null, null, null],
		// 	[null, null, null, null, null, null, null, null],
		// 	[null, { square: 'b2', type: 'k', color: 'b' }, null, null, null, null, null, null],
		// 	[null, null, null, null, null, null, null, null],
		// ],
		highlighted: [],
		overlay: false,
		overlayMessage: '',
		waitPromote: { status: false, offset: 0, from: null, to: null },
		color: 'w',
		players: [],
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const location = useLocation();

	const onUpdateBoard = (data) => {
		console.log(`Updating color to ${data.color != undefined ? data.color : state.color}`);
		setState({
			...state,
			pieces: data.board,
			legal: data.legal,
			overlay: data.over,
			overlayMessage: data.over ? data.reason : '',
			color: data.color != undefined ? data.color : state.color,
			players: data.players,
			turn: data.turn,
		});
	};

	useEffect(() => {
		onUpdateBoard(location.state);
	}, []);

	socket.on('update-board', (data) => {
		onUpdateBoard(data);
	});

	socket.on('disconnection', (data) => {
		setState({
			...state,
			overlay: true,
			overlayMessage: `Opponent "${state.players.filter((item) => item == localStorage.getItem('name'))[0]}" disconnected`,
		});
	});

	const copyBoard = (board) => {
		return JSON.parse(JSON.stringify(board));
	};

	const requestPromotion = (from, to) => {
		setState({
			...state,
			overlay: true,
			waitPromote: { status: true, offset: 'abcdefgh'.indexOf(to.split('')[0]) * cellSize, from: from, to: to },
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
		console.log(copyBoard(board));
		let { row: fromRow, rank: fromRank } = getBoardPieceByNotation(board, from);
		let { row: toRow, rank: toRank } = getBoardPieceByNotation(board, to);

		let piece = board[fromRow][fromRank];
		if (promotion != null) piece.type = promotion;

		board[fromRow][fromRank] = null;
		board[toRow][toRank] = piece;

		// console.log([fromRow, fromRank]);
		// console.log([toRow, toRank]);
		// { square: 'a4', type: 'k', color: 'b' }
		console.log(board);

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
		if (state.color == 'w') {
			return state.pieces;
		} else {
			let pieces = copyBoard(state.pieces);
			return pieces.map((row) => row.reverse()).reverse();
		}
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
					<div id='header'>{state.players.join(' vs ')}</div>
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
												{piece != null ? <img className='piece-icon' src={require(`../icons/${piece.color}${piece.type}.svg`)}></img> : null}
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
												<img src={require(`../icons/${state.color}${promotable}.svg`)}></img>
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
