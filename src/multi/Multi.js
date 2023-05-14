import React, { useState, useEffect, useRef } from 'react';
import { Divider, TextField, Button, IconButton } from '@mui/material';
import Input from '@mui/material/Input';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { socket } from '../socket.js';
import { useNavigate } from 'react-router-dom';
import './Multi.scss';

const Room = (props) => {
	return (
		<div className='room'>
			<div className='top'>
				<div>
					{props.room.names.length < 2
						? `Owner: ${props.room.names[0]}`
						: `${props.room.names[0]}\nvs\n${props.room.names[1]}`.split('\n').map((line) => {
								return <div>{line}</div>;
						  })}
				</div>
				<img src={require('../icons/chess-board.svg').default}></img>
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
		rooms: [],
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const navigate = useNavigate();

	const onRoomsUpdate = (data) => {
		console.log(`Lobby update:`);
		console.log(data);
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
		socket.emit('join-lobby', (data) => {
			onRoomsUpdate(data);
			console.log(state);
		});

		socket.on('lobby-update', (data) => {
			setTimeout(() => {
				onRoomsUpdate(data);
				console.log(state);
			}, 1);
		});

		socket.on('start', (data) => {
			console.log(data);
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
		socket.emit('create', { name: state.name }, (code) => {
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
				<Divider />
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
					style={{ marginTop: '10px' }}
					value={state.joinId}
					onChange={(event) => {
						setState({
							...state,
							joinId: event.target.value,
						});
					}}
				/>
				<div
					className='error'
					style={{
						display: state.joinError == '' ? 'none' : 'block',
					}}
				>
					{state.joinError}
				</div>

				<Divider />
				<Button style={{ backgroundColor: '#266308' }} onClick={onCreate}>
					Create
				</Button>
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
