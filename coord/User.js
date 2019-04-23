// memory should be very simplistic, so it's easy to send across to other worker processes

class User {
	constructor(username) {
		this.username = username, 
		this.channelName = "cl_" + username; // to send messages to client, todo: socket should have a link to this too, or at least an ID
		this.chars = []; // can be here for now.. (1 char for the time being)

	}

	

	// subscribe here and watch
}

module.exports = User;