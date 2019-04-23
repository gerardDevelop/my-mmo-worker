class Char extends Entity {
	constructor(username, id, name, x, y, hp) {
		super(username, id, name, x, y, hp);

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

	update(deltaTime) {
		
	}
}