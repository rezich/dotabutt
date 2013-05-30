dotabutt is a sweet and awesome Dota 2 API app thing that's awesome and kicks ass and is rad

it's written in node and express and jade and stuff

you gotta either make a file called api_key in your app directory and put your Steam developer API key in it, or set your key to the STEAM_API_KEY environment variable

database setup:

	db.matches.ensureIndex( { match_id: 1 })
	db.matches.ensureIndex( { start_time: -1 })
	db.players.ensureIndex( { account_id: 1 })
