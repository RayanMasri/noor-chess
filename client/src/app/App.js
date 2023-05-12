import React, { useState } from 'react';
import './App.scss';
import Mode from './Mode.js';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';

function App() {
	const navigate = useNavigate();

	return (
		<div id='app' className='page'>
			<div id='main'>
				<Mode title='Local' icon={PersonIcon} onClick={() => {}} />
				<Mode
					title='Multiplayer'
					icon={PeopleIcon}
					onClick={() => {
						navigate('/multiplayer');
					}}
				/>
			</div>
		</div>
	);
}

export default App;
