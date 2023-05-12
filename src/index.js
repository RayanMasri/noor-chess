import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './app/App.js';
import Multi from './multi/Multi.js';
import Game from './game/Game.js';
import './index.css';

const router = createBrowserRouter([
	{
		path: '/',
		element: <App />,
		// errorElement: <Error/>
	},
	{
		path: '/multiplayer',
		element: <Multi />,
		// errorElement: <Error/>
	},
	{
		path: '/game',
		element: <Game />,
		// errorElement: <Error/>
	},
]);

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
