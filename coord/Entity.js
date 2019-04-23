class Entity {
	constructor(username, id, name, x, y, hp) { // username is optional
		this.username = username; // if null, this entity is not a player char
		this.id = id; // can just be a number
		this.name = name;
		// todo: entityID
		this.x = x;
		this.y = y;
		this.hp = hp;

		this.isMovingToNewSection = false;
		// maybe reference to the section this char resides in too

		/* - todom remove the commented out section here

		if(username) {

			// need to make sure this process.svServer.exchange is listening for sv_username messages
			this.svChannel = process.scServer.exchange.subscribe('sv_' + name);
			console.log('sv_' + name);	
			this.svChannel.watch((data) => {
				// handle incoming messages here
				console.log("char sv handler: " + data);

				var code = data[0];

				switch(code) {
					case "pos": {

						// check if this char is the char to be moved (because each user may have multiple chars)	
						this.setPos(data[1], data[2]);		

					} break;
				}			

				//this.svChannel.unwatch();
			});

			this.beforeSectionPass = () => {
				this.svChannel.unwatch();
				this.svChannel.unsubscribe();
			};
		}

		*/

	}

	setPos(x, y) {
		this.x = x;
		this.y = y;

		console.log("setting new pos: x: " + x + " y: " + y);
	}

	entityUpdate(delta) {
		// auto attacks etc
	}

	onDestory() {
		// unwatch
		this.svChannel.unwatch();
	}

	markSectionProblem(problem) {
		console.log("section problem marked");
	}
}

module.exports = Entity;