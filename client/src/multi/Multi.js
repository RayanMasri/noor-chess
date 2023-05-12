import React, { useState, useEffect } from 'react';
import { Divider, TextField, Button, IconButton } from '@mui/material';
import Input from '@mui/material/Input';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { socket } from '../socket.js';
import { useNavigate } from 'react-router-dom';
import './Multi.scss';

export default function Multi(props) {
	const [state, setState] = useState({
		name: localStorage.getItem('name') || '',
		joinId: '',
		createId: '',
		joinError: '',
		game: false,
	});
	const navigate = useNavigate();

	// useEffect(() => {
	// 	navigate('/game', {
	// 		state: {
	// 			fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 			legal: [
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'a2',
	// 					to: 'a3',
	// 					san: 'a3',
	// 					flags: 'n',
	// 					lan: 'a2a3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'a2',
	// 					to: 'a4',
	// 					san: 'a4',
	// 					flags: 'b',
	// 					lan: 'a2a4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/P7/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'b2',
	// 					to: 'b3',
	// 					san: 'b3',
	// 					flags: 'n',
	// 					lan: 'b2b3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'b2',
	// 					to: 'b4',
	// 					san: 'b4',
	// 					flags: 'b',
	// 					lan: 'b2b4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/1P6/8/P1PPPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'c2',
	// 					to: 'c3',
	// 					san: 'c3',
	// 					flags: 'n',
	// 					lan: 'c2c3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/2P5/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'c2',
	// 					to: 'c4',
	// 					san: 'c4',
	// 					flags: 'b',
	// 					lan: 'c2c4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'd2',
	// 					to: 'd3',
	// 					san: 'd3',
	// 					flags: 'n',
	// 					lan: 'd2d3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/3P4/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'd2',
	// 					to: 'd4',
	// 					san: 'd4',
	// 					flags: 'b',
	// 					lan: 'd2d4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'e2',
	// 					to: 'e3',
	// 					san: 'e3',
	// 					flags: 'n',
	// 					lan: 'e2e3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'e2',
	// 					to: 'e4',
	// 					san: 'e4',
	// 					flags: 'b',
	// 					lan: 'e2e4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'f2',
	// 					to: 'f3',
	// 					san: 'f3',
	// 					flags: 'n',
	// 					lan: 'f2f3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'f2',
	// 					to: 'f4',
	// 					san: 'f4',
	// 					flags: 'b',
	// 					lan: 'f2f4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'g2',
	// 					to: 'g3',
	// 					san: 'g3',
	// 					flags: 'n',
	// 					lan: 'g2g3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/6P1/PPPPPP1P/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'g2',
	// 					to: 'g4',
	// 					san: 'g4',
	// 					flags: 'b',
	// 					lan: 'g2g4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/6P1/8/PPPPPP1P/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'h2',
	// 					to: 'h3',
	// 					san: 'h3',
	// 					flags: 'n',
	// 					lan: 'h2h3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/7P/PPPPPPP1/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'p',
	// 					from: 'h2',
	// 					to: 'h4',
	// 					san: 'h4',
	// 					flags: 'b',
	// 					lan: 'h2h4',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/7P/8/PPPPPPP1/RNBQKBNR b KQkq - 0 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'n',
	// 					from: 'b1',
	// 					to: 'a3',
	// 					san: 'Na3',
	// 					flags: 'n',
	// 					lan: 'b1a3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/N7/PPPPPPPP/R1BQKBNR b KQkq - 1 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'n',
	// 					from: 'b1',
	// 					to: 'c3',
	// 					san: 'Nc3',
	// 					flags: 'n',
	// 					lan: 'b1c3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'n',
	// 					from: 'g1',
	// 					to: 'f3',
	// 					san: 'Nf3',
	// 					flags: 'n',
	// 					lan: 'g1f3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
	// 				},
	// 				{
	// 					color: 'w',
	// 					piece: 'n',
	// 					from: 'g1',
	// 					to: 'h3',
	// 					san: 'Nh3',
	// 					flags: 'n',
	// 					lan: 'g1h3',
	// 					before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	// 					after: 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
	// 				},
	// 			],
	// 			color: 'b',
	// 		},
	// 	});
	// }, []);

	// { state: { id: 7, color: 'green' } }

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

	const onJoin = () => {
		socket.emit('join', { name: state.name, id: state.joinId }, (response) => {
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
						onJoin();
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
		</div>
	);
}
