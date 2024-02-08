import React, { useState, useRef, useEffect } from 'react';
import { socket } from '../socket.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Divider } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useMediaPredicate } from 'react-media-hook';
import { v4 as uuidv4 } from 'uuid';
import './Game.scss';
import { Chess } from 'chess.js';

const engine = new Chess();

class Notation {
	constructor(notation) {
		this.notation = notation;
	}

	fromCoords(x, y) {
		this.notation = `${'abcdefgh'[x]}${8 - y}`;
	}

	get() {
		return this.notation;
	}
}

export default function Game() {
	const navigate = useNavigate();

	useEffect(() => {
		let canvas = document.querySelector('canvas');
		let context = canvas.getContext('2d');

		// Draw Background
		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				let fill = y % 2 == 0 ? (x % 2 == 0 ? '#d18b47' : '#ffce9e') : x % 2 == 0 ? '#ffce9e' : '#d18b47';
				context.fillStyle = fill;

				context.fillRect(x * 80, y * 80, 80, 80);

				if (x == 7) {
					let size = 15;
					let padding = 3;

					context.fillStyle = fill == '#d18b47' ? '#ffce9e' : '#d18b47';
					context.font = `${size}px Arial`;

					let notation = new Notation();
					notation.fromCoords(x, y);

					context.fillText(notation.get(), 640 - context.measureText(notation.get()).width - padding, y * 80 + size + padding);
				}

				if (y == 7) {
					let size = 15;
					let padding = 3;

					context.fillStyle = fill == '#d18b47' ? '#ffce9e' : '#d18b47';
					context.font = `${size}px Arial`;

					let notation = new Notation();
					notation.fromCoords(x, y);

					context.fillText(notation.get(), x * 80 + padding, 640 - padding);
				}
			}
		}
	}, []);

	return (
		<div id='game' className='page'>
			<div
				id='board'
				style={{
					// pointerEvents: state.overlay ? 'none' : 'all',
					pointerEvents: 'none',
				}}
			>
				<canvas width='640' height='640' />
			</div>
		</div>
	);
}
