import React, { useState } from 'react';
import './App.scss';
import Mode from './Mode.js';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

// FIXME: Offset is increased by one cell for black promotion
// FIXME: Stroke circle on piece capture highlights pours out of cell *
// FIXME: Slow piece move responsiveness *
// FIXME: Not making moves for a long time destroys any functionality of the game
// FIXME: Playing a game and then playing another game prevents a user from seeing the other user's moves,
// TODO: Add color selection
// TODO: Add room grid viewing
// TODO: Add piece animation
// TODO: Add premoves
// TODO: Add score tally
// TODO: Add spectating
// TODO: Add resignation
// TODO: Add draw request capabilities
// TODO: Add chat
// TODO: Add game history
// TODO: Add ability to see all possible moves of a piece regards of legality while not in turn
// TODO: Add ability to move back and forth between moves
// TODO: Add highlight on last move
// TODO: Add sounds

function App() {
	const navigate = useNavigate();
	const [state, setState] = useState({
		identity: undefined,
	});

	const onSubmit = () => {
		if (state.identity != undefined) {
			sessionStorage.setItem('identity', state.identity);
		} else {
			sessionStorage.setItem('identity', undefined);
		}
		navigate('/multiplayer');
	};

	return (
		<div id='app' className='page'>
			<div id='main-container'>
				<TextField
					label='Identity'
					variant='outlined'
					onChange={(event) => {
						setState({
							...state,
							identity: event.target.value,
						});
					}}
					value={state.identity || ''}
				/>
				<Button onClick={onSubmit} variant='contained'>
					Submit
				</Button>
			</div>

			{/* onClick={() => {
						navigate('/multiplayer');
					}} */}
			{/* <div id='main'>
				<Mode title='Local' icon={PersonIcon} onClick={() => {}} />
				<Mode
					title='Multiplayer'
					icon={PeopleIcon}
					onClick={() => {
						navigate('/multiplayer');
					}}
				/>
			</div> */}
		</div>
	);
}

export default App;
