const getPrivatePlayerInGameByUserName = (game, userName) => game.private.seatedPlayers.find(player => player.userName === userName),
	secureGame = game => {
		const _game = Object.assign({}, game);

		delete _game.private;
		return _game;
	};

module.exports.sendInProgressGameUpdate = game => { // todo-release make this accept a socket argument and emit only to it if it exists
	const seatedPlayerNames = game.seatedPlayers.map(player => player.userName),
		combineInProgressChats = (game, userName) => {
			let player;

			if (userName) {
				player = getPrivatePlayerInGameByUserName(game, userName);
			}

			console.log(player);
			console.log(game.private);
			const gameChats = player ? player.gameChats : game.private.unSeatedGameChats;

			return gameChats.concat(game.chats);
		};

	let roomSockets, playerSockets, observerSockets;

	if (io.sockets.adapter.rooms[game.general.uid]) {
		roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

		playerSockets = roomSockets.filter(socket => socket.handshake.session.passport && Object.keys(socket.handshake.session.passport).length && seatedPlayerNames.includes(socket.handshake.session.passport.user));

		observerSockets = roomSockets.filter(socket => !socket.handshake.session.passport || !seatedPlayerNames.includes(socket.handshake.session.passport.user));
	}

	if (playerSockets) {
		playerSockets.forEach(sock => {
			const _game = Object.assign({}, game),
				{user} = sock.handshake.session.passport;

			if (!game.gameState.isCompleted) {
				_game.playersState = _game.private.seatedPlayers.find(player => user === player.userName).playersState;
			}

			_game.chats = combineInProgressChats(_game, user);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}

	if (observerSockets) {
		observerSockets.forEach(sock => {
			const _game = Object.assign({}, game);

			_game.chats = combineInProgressChats(_game);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}
};

module.exports.getPrivatePlayerInGameByUserName = getPrivatePlayerInGameByUserName;
module.exports.secureGame = secureGame;