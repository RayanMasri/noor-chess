let socket = io();

// TODO: When it is not your turn, highlight all possible moves for a piece

let board = document.querySelector('#board');
let ranks = 'abcdefgh';
let legal = [];
// let fen = '8/4P3/8/8/k7/8/K7/8 w - - 0 1';

let color = 'w';

// Initial board creation
for (let i = 0; i < 64; i++) {
	let row = Math.floor((63 - i) / 8) + 1;
	let rank = ranks[i % 8];
	let position = `${rank}${row}`;

	// console.log([i, i % 2, Math.floor(i / 8)]);
	let square = document.createElement('div');

	square.setAttribute('data-position', position);

	square.className = `square ${row % 2 == 0 ? (i % 2 == 0 ? 'light' : 'dark') : i % 2 == 0 ? 'dark' : 'light'}`;
	square.style.backgroundColor = board.appendChild(square);

	square.addEventListener('click', () => {
		onPickPiece(square, square.getAttribute('data-position'));
	});
}

// let fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const updateSquareAttributes = () => {
	const squares = Array.from(document.querySelectorAll('.square'));
	squares.map((square, i) => {
		let row, rank;

		if (color == 'w') {
			row = Math.floor((63 - i) / 8) + 1;
			rank = ranks[i % 8];
		} else {
			row = 8 - Math.floor((63 - i) / 8);
			rank = ranks.split('').reverse()[i % 8];
		}

		square.setAttribute('data-position', `${rank}${row}`);
	});
};

const setOverlay = (status) => {
	let overlay = document.querySelector('#overlay');
	let board = document.querySelector('#board');
	board.style.pointerEvents = status ? 'none' : 'grid';
	overlay.style.display = status ? 'flex' : 'none';
};

const requestPromotion = (position, callback) => {
	let overlay = document.querySelector('#overlay');
	let board = document.querySelector('#board');
	// board.style.pointerEvents = 'none';
	// overlay.style.display = 'block';

	setOverlay(true);

	let promotionColumn = document.createElement('div');
	promotionColumn.className = 'promotion-column';
	promotionColumn.style.left = `${ranks.indexOf(position.split('')[0]) * 64}px`;

	for (let promotable of ['q', 'n', 'r', 'b']) {
		let div = document.createElement('div');
		div.addEventListener('click', () => {
			promotionColumn.remove();
			// board.style.pointerEvents = 'all';
			// overlay.style.display = 'none';
			setOverlay(false);

			callback(promotable);
		});

		let img = document.createElement('img');
		img.src = `/icons/${color}${promotable}.svg`;

		div.appendChild(img);
		promotionColumn.appendChild(div);
	}

	overlay.appendChild(promotionColumn);
};

const fenTo2D = (fen) => {
	fen = fen.split(' ')[0];
	let total = 0;
	[...fen.matchAll(/\d/g)].map((match, index) => {
		let replacement = 'e'.repeat(parseInt(match[0]));
		let increase = replacement.length - 1;

		fen = fen.split('');
		fen.splice(match.index + total, 1, replacement);
		fen = fen.join('');

		total += increase;
	});

	let array = fen.split('/').map((row, index) => row.split(''));
	return array;
};

const sendMove = (from, to, promotion = null) => {
	socket.emit('move', { from: from, to: to, promotion: promotion }, (response) => {
		if (response.status) {
			console.log(`Successfully moved ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}`);
			let fromSquare = document.querySelector(`.square[data-position=${from}]`);
			let toSquare = document.querySelector(`.square[data-position=${to}]`);
			fromSquare.classList.remove('has-piece');
			toSquare.classList.add('has-piece');
		} else {
			console.log(`Failed to move ${from} -> ${to}${promotion != null ? ` (Promotion-${promotion})` : ''}: ${response.reason}`);
		}
	});
};

let selected = null;
const onPickPiece = (square, position) => {
	Array.from(document.querySelectorAll('.highlight-circle')).map((element) => element.remove());
	const squares = Array.from(document.querySelectorAll('.square'));

	squares.map((item) => item.classList.remove('selected'));

	// Check if a piece is currently selected, and if this square is legal
	if (
		selected != null &&
		legal
			.filter((move) => move.from == selected)
			.map((move) => move.to)
			.includes(position)
	) {
		let moves = legal.filter((move) => move.from == selected).filter((move) => move.to == position);
		// If moves to the same square are greater than one, it's a promotion
		if (moves.length > 1) {
			console.log('Requesting promotion...');
			requestPromotion(position, (promoted) => {
				sendMove(selected, position, promoted);
			});
			return;
		} else {
			sendMove(selected, position);
			console.log(`Legal move ${position} for selected ${selected}`);
			selected = null;
			return;
		}
	}

	// If there isn't a piece there
	if (!Array.from(square.classList).includes('has-piece')) {
		// Otherwise, ignore
		console.log('No piece in square, ignoring');
		selected = null;
		return;
	}

	// Highlight selected position square
	selected = position;
	square.classList.add('selected');

	// Ignore if piece doesn't have any legal moves
	if (!legal.map((move) => move.from).includes(position)) {
		console.log('No legal moves for this piece, ignoring');
		selected = null;
		return;
	}

	// Highlight all legal moves for this position
	let highlighted = legal.filter((move) => move.from == position).map((move) => move.to);
	highlighted = squares.filter((square) => highlighted.includes(square.getAttribute('data-position')));
	highlighted.map((element) => {
		let circle = document.createElement('img');
		// If element has a piece, place stroke circle
		circle.src = Array.from(element.classList).includes('has-piece') ? '/icons/stroke-circle.svg' : '/icons/fill-circle.svg';
		circle.className = 'highlight-circle';
		circle.draggable = false;
		element.appendChild(circle);
	});

	console.log(`Highlighted legal moves for: ${position}`);
};

const updateBoard = (fen) => {
	// Clear board
	Array.from(document.querySelectorAll('.square')).map((item) => item.classList.remove('has-piece'));
	Array.from(document.querySelectorAll('.square > img')).map((item) => item.remove());

	fenTo2D(fen).map((row, index) => {
		let rowIndex = 8 - index;

		row.map((point, index) => {
			let rankIndex = ranks[index];
			let square = document.querySelector(`.square[data-position=${rankIndex}${rowIndex}]`);
			if (point != 'e') {
				let color = point.toLowerCase() != point ? 'w' : 'b';

				let img = document.createElement('img');
				img.src = `/icons/${color}${point.toLowerCase()}.svg`;
				img.draggable = false;

				square.appendChild(img);
				square.classList.add('has-piece');
			}
		});
	});
};

const join = (id) => {
	console.log(id);
	socket.emit('join', { id: id }, (response) => {
		if (response.status) {
			console.log(`Successfully joined room "${id}"`);
		} else {
			console.log(`Failed to join room "${id}": ${response.reason}`);
		}
	});
};

const create = () => {
	socket.emit('create', {}, (code) => {
		console.log(`Successfully created room "${code}"`);
		navigator.clipboard.writeText(code);
	});
};

// updateBoard(fen);
socket.on('update-board', (data) => {
	updateBoard(data.fen);

	if (data.over) {
		console.log(data.reason);
		setOverlay(true);
		overlay.innerHTML = data.reason;

		return;
	}

	legal = data.legal;
});

socket.on('start', (data) => {
	color = data.color;
	legal = data.legal;
	updateSquareAttributes();
	updateBoard(data.fen);
});

socket.on('disconnection', (data) => {
	setOverlay(true);

	overlay.innerHTML = 'Opponent disconnected';
});

// color = data.color;
// legal = data.legal;
// updateSquareAttributes();
// updateBoard(fen);

document.querySelector('#join').addEventListener('click', () => {
	join(document.querySelector('#join-id').value);
});
document.querySelector('#create').addEventListener('click', create);
