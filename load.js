var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var bodyParser = require('body-parser');
var cors = require('cors');

var pg = require('pg');
var conString = 'postgres://chessdb_v45n_user:7Zr7OW9AAX1PZXZXVw438bg1PpV6qDYU@dpg-cn1pv36d3nmc73bpl8r0-a.frankfurt-postgres.render.com/chessdb_v45n?ssl=true';

var client = new pg.Client(conString);
client.connect();

const dbget = async (identity, c_name) => {
	let result = await client.query('SELECT * from users where identity=$1', [identity]);
	if (result.rows.length == 0) {
		await client.query('INSERT INTO users (identity, name, elo) VALUES($1, $2, 600);', [identity, c_name]);

		return [c_name, 600];
	} else {
		let user = result.rows[0];

		let { name, elo } = user;

		return [name, elo];
	}
};

const dbupdate = async (identity, new_elo, c_name) => {
	// If doesn't exist, return
	let result = await client.query('SELECT * from users where identity=$1', [identity]);
	if (result.rows.length == 0) return;

	await client.query('UPDATE users SET elo=$1 WHERE identity=$2', [identity, new_elo]);
};

const dbreset = async () => {
	await client.query('TRUNCATE users;');
};

var environment = process.env.NODE_ENV || 'development';
console.log(`Running express backend in environment: ${environment}`);

const functions = {
	'update': dbupdate,
	'get': dbget,
};

app.use(cors());
app.use(bodyParser.json());
app.post('/db', async (req, res) => {
	let { fn, args } = req.body;

	let invoke = functions[fn];
	console.log('not your business');
	let result = await invoke(...args);
	console.log(result);

	res.json(result);
});

if (environment == 'production') {
	app.use(express.static(__dirname + '/build'));
	app.get('*', (req, res) => {
		res.sendFile(__dirname + '/build/index.html');
	});
}

let options =
	environment == 'development'
		? {
				cors: {
					// origin: 'http://localhost:3000/',
					origin: '*',
					methods: ['GET', 'POST'],
				},
		  }
		: {};

console.log(`Socket.io options: ${JSON.stringify(options)}`);

const io = require('socket.io')(server, options);

module.exports = {
	server: server,
	app: app,
	io: io,
};
