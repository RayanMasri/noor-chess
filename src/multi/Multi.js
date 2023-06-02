import React, { useState, useEffect, useRef } from 'react';
import { Divider, TextField, Button, IconButton } from '@mui/material';
import Input from '@mui/material/Input';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { socket } from '../socket.js';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import calculateTextWidth from 'calculate-text-width';

import './Multi.scss';

// TODO: Add sophisticated settigns

let colors = {
	'w': 'White',
	'b': 'Black',
};

const times = {
	'1:00': 60,
	'3:00': 180,
	'5:00': 300,
	'10:00': 600,
};

const Board = (props) => {
	return (
		<div className='preview-board'>
			{props.board.map((row, rowIndex) => {
				return (
					<div className='row'>
						{row.map((square, index) => {
							return (
								<div className={`square ${rowIndex % 2 == 0 ? (index % 2 == 0 ? 'light' : 'dark') : index % 2 == 0 ? 'dark' : 'light'}`}>
									{square != null ? <img draggable='false' src={require(`../icons/${square.color}${square.type}.svg`)}></img> : null}
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
};

const Room = (props) => {
	let white_index = 0;
	let black_index = 0;
	if (props.room.names.length > 1) {
		white_index = props.room.names.findIndex((user) => user.color == 'w');
		black_index = white_index == 0 ? 1 : 0;
	}

	return (
		<div className='room'>
			<div className='top'>
				<div className='inner'>
					{props.room.names.length < 2 ? (
						<div className='players'>
							<div className='player'>
								<div>{props.room.names[0].name}</div>
								<div
									className='color'
									style={{
										position: 'absolute',
										right: `-${calculateTextWidth(colors[props.room.names[0].color], 'normal 12px Arial')}px`,
									}}
								>
									{colors[props.room.names[0].color]}
								</div>
							</div>
						</div>
					) : (
						<div className='players'>
							<div className='player'>
								<div>{props.room.names[black_index].name}</div>
								<div
									className='color'
									style={{
										right: `-${calculateTextWidth(colors[props.room.names[black_index].color], 'normal 12px Arial')}px`,
									}}
								>
									{colors[props.room.names[black_index].color]}
								</div>
							</div>
							<div>vs</div>
							<div className='player'>
								<div>{props.room.names[white_index].name}</div>
								<div
									className='color'
									style={{
										right: `-${calculateTextWidth(colors[props.room.names[white_index].color], 'normal 12px Arial')}px`,
									}}
								>
									{colors[props.room.names[white_index].color]}
								</div>
							</div>
						</div>
					)}
					<div
						style={{
							textAlign: 'right',
						}}
					>{`Time: ${props.room.duration / 60}:00`}</div>
				</div>

				<Board board={props.room.board} />
				{/* <img src={require('../icons/chess-board.svg').default}></img> */}
			</div>

			<Button className='join-btn' disabled={props.room.names.length > 1 || props.room.id == props.createId} onClick={props.onJoin}>
				Join{props.room.names.length > 1 ? ' (full)' : props.room.id == props.createId ? ' (in room)' : ''}
			</Button>
		</div>
	);
};

export default function Multi(props) {
	const [state, _setState] = useState({
		name: localStorage.getItem('name') || '',
		joinId: '',
		createId: '',
		joinError: '',
		game: false,
		// rooms: [
		// 	{
		// 		'id': 'IBW0y7mabd',
		// 		'names': [{ 'name': 'consoleas', 'color': 'w', 'elapsed': 0 }],
		// 		'duration': 300,
		// 		'board': [
		// 			[
		// 				{ 'square': 'a8', 'type': 'r', 'color': 'b' },
		// 				{ 'square': 'b8', 'type': 'n', 'color': 'b' },
		// 				{ 'square': 'c8', 'type': 'b', 'color': 'b' },
		// 				{ 'square': 'd8', 'type': 'q', 'color': 'b' },
		// 				{ 'square': 'e8', 'type': 'k', 'color': 'b' },
		// 				{ 'square': 'f8', 'type': 'b', 'color': 'b' },
		// 				{ 'square': 'g8', 'type': 'n', 'color': 'b' },
		// 				{ 'square': 'h8', 'type': 'r', 'color': 'b' },
		// 			],
		// 			[
		// 				{ 'square': 'a7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'b7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'c7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'd7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'e7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'f7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'g7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'h7', 'type': 'p', 'color': 'b' },
		// 			],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[
		// 				{ 'square': 'a2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'b2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'c2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'd2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'e2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'f2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'g2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'h2', 'type': 'p', 'color': 'w' },
		// 			],
		// 			[
		// 				{ 'square': 'a1', 'type': 'r', 'color': 'w' },
		// 				{ 'square': 'b1', 'type': 'n', 'color': 'w' },
		// 				{ 'square': 'c1', 'type': 'b', 'color': 'w' },
		// 				{ 'square': 'd1', 'type': 'q', 'color': 'w' },
		// 				{ 'square': 'e1', 'type': 'k', 'color': 'w' },
		// 				{ 'square': 'f1', 'type': 'b', 'color': 'w' },
		// 				{ 'square': 'g1', 'type': 'n', 'color': 'w' },
		// 				{ 'square': 'h1', 'type': 'r', 'color': 'w' },
		// 			],
		// 		],
		// 	},
		// 	{
		// 		'id': 'IBW0y7mabd',
		// 		'names': [
		// 			{ 'name': 'consoleas', 'color': 'w', 'elapsed': 0 },
		// 			{ 'name': 'consoleas', 'color': 'b', 'elapsed': 0 },
		// 		],
		// 		'duration': 300,
		// 		'board': [
		// 			[
		// 				{ 'square': 'a8', 'type': 'r', 'color': 'b' },
		// 				{ 'square': 'b8', 'type': 'n', 'color': 'b' },
		// 				{ 'square': 'c8', 'type': 'b', 'color': 'b' },
		// 				{ 'square': 'd8', 'type': 'q', 'color': 'b' },
		// 				{ 'square': 'e8', 'type': 'k', 'color': 'b' },
		// 				{ 'square': 'f8', 'type': 'b', 'color': 'b' },
		// 				{ 'square': 'g8', 'type': 'n', 'color': 'b' },
		// 				{ 'square': 'h8', 'type': 'r', 'color': 'b' },
		// 			],
		// 			[
		// 				{ 'square': 'a7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'b7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'c7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'd7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'e7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'f7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'g7', 'type': 'p', 'color': 'b' },
		// 				{ 'square': 'h7', 'type': 'p', 'color': 'b' },
		// 			],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[null, null, null, null, null, null, null, null],
		// 			[
		// 				{ 'square': 'a2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'b2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'c2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'd2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'e2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'f2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'g2', 'type': 'p', 'color': 'w' },
		// 				{ 'square': 'h2', 'type': 'p', 'color': 'w' },
		// 			],
		// 			[
		// 				{ 'square': 'a1', 'type': 'r', 'color': 'w' },
		// 				{ 'square': 'b1', 'type': 'n', 'color': 'w' },
		// 				{ 'square': 'c1', 'type': 'b', 'color': 'w' },
		// 				{ 'square': 'd1', 'type': 'q', 'color': 'w' },
		// 				{ 'square': 'e1', 'type': 'k', 'color': 'w' },
		// 				{ 'square': 'f1', 'type': 'b', 'color': 'w' },
		// 				{ 'square': 'g1', 'type': 'n', 'color': 'w' },
		// 				{ 'square': 'h1', 'type': 'r', 'color': 'w' },
		// 			],
		// 		],
		// 	},
		// ],
		rooms: [],
		color: 'w',
		time: '5:00',
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const navigate = useNavigate();

	const onRoomsUpdate = (data) => {
		console.log(JSON.stringify(data));
		setState({
			..._state.current,
			rooms: data,
		});
	};

	// useEffect(() => {
	// 	onRoomsUpdate([
	// 		{
	// 			id: 'a9PXRzzGLp',
	// 			names: ['Unnamed'],
	// 		},
	// 		{
	// 			id: 'OxaXRzzGsp',
	// 			names: ['John'],
	// 		},
	// 		{
	// 			id: 'sDEXRzzGsp',
	// 			names: ['Bon', 'Don'],
	// 		},
	// 	]);
	// }, []);

	useEffect(() => {
		socket.emit('sync-unix', Date.now(), (offset) => {
			console.log(`Client to server offset: ${offset}ms`);
			localStorage.setItem('unix-offset', offset);
		});

		socket.emit('join-lobby', (data) => {
			onRoomsUpdate(data);
			// console.log(state);
		});

		socket.on('lobby-update', (data) => {
			setTimeout(() => {
				onRoomsUpdate(data);
				// console.log(state);
			}, 1);
		});

		socket.on('start', (data) => {
			// console.log(data);
			// console.log(navigate);
			navigate('/game', {
				state: data,
			});
			// color = data.color;
			// legal = data.legal;
			// updateSquareAttributes();
			// updateBoard(data.fen);
		});
	}, []);

	const onJoin = (id) => {
		socket.emit('join', { name: state.name, id: id }, (response) => {
			if (!response.status) {
				setState({
					...state,
					joinError: response.reason,
				});
			}
		});
	};

	const onCreate = () => {
		socket.emit('create', { name: state.name, color: state.color, time: times[state.time] }, (code) => {
			setState({
				...state,
				createId: code,
			});
		});
	};

	return (
		<div id='multi' className='page'>
			<div id='sidebar'>
				{/* <TextField label='Name' variant='outlined' style={{ marginTop: '20px' }} /> */}
				<div className='out-container'>
					<Input
						placeholder='Name'
						style={{ marginTop: '20px', padding: '12px' }}
						value={state.name}
						onChange={(event) => {
							let value = event.target.value.match(/[a-zA-Z0-9]+/g).join('');

							localStorage.setItem('name', value);

							setState({
								...state,
								name: value,
							});
						}}
					/>
				</div>
				<Divider />
				<div className='btn-group btn-group-join'>
					<Button
						style={{ backgroundColor: '#266308' }}
						onClick={() => {
							if (state.joinId == '') return;
							onJoin(state.joinId);
						}}
					>
						Join
					</Button>
					<Input
						placeholder='ID...'
						value={state.joinId}
						onChange={(event) => {
							setState({
								...state,
								joinId: event.target.value,
							});
						}}
					/>
				</div>

				<div
					className='error'
					style={{
						display: state.joinError == '' ? 'none' : 'block',
					}}
				>
					{state.joinError}
				</div>

				<Divider />
				<div className='btn-group btn-group-create'>
					<Button style={{ backgroundColor: '#266308' }} onClick={onCreate}>
						Create
					</Button>
					<div className='option-group'>
						<div className='options'>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, color: 'w' })} className={state.color == 'w' ? 'selected' : ''}>
								White
							</Button>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, color: 'b' })} className={state.color == 'b' ? 'selected' : ''}>
								Black
							</Button>
						</div>
						<div className='options'>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, time: '1:00' })} className={state.time == '1:00' ? 'selected' : ''}>
								1:00
							</Button>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, time: '3:00' })} className={state.time == '3:00' ? 'selected' : ''}>
								3:00
							</Button>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, time: '5:00' })} className={state.time == '5:00' ? 'selected' : ''}>
								5:00
							</Button>
							<Button style={{ backgroundColor: '#266308' }} onClick={() => setState({ ...state, time: '10:00' })} className={state.time == '10:00' ? 'selected' : ''}>
								10:00
							</Button>
						</div>
					</div>
				</div>

				<div className='out-container'>
					<div
						id='created'
						style={{
							display: state.createId == '' ? 'none' : 'flex',
						}}
					>
						<div id='code'>
							<div>{state.createId}</div>

							<IconButton
								style={{ marginLeft: '2px' }}
								onClick={() => {
									navigator.clipboard.writeText(state.createId);
								}}
							>
								<ContentCopyIcon
									sx={{
										width: '16px',
										height: '16px',
										color: 'green',
									}}
								/>
							</IconButton>
						</div>
						<div id='players'>Waiting...</div>
					</div>
				</div>
			</div>
			<div id='rooms'>
				{state.rooms.map((room) => {
					console.log(room);
					return (
						<Room
							room={room}
							createId={state.createId}
							onJoin={() => {
								onJoin(room.id);
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
