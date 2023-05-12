import React from 'react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { IconButton } from '@mui/material';

export default function Mode(props) {
	return (
		<div className='mode'>
			<div className='title'>{props.title}</div>
			<div className='icon'>
				<props.icon
					sx={{
						width: '300px',
						height: '300px',
					}}
				/>
			</div>
			<div className='button'>
				<IconButton onClick={props.onClick}>
					<ArrowForwardRoundedIcon
						sx={{
							color: '#07ff52',
							width: '64px',
							height: '64px',
						}}
					/>
				</IconButton>
			</div>
		</div>
	);
}
