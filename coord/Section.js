const VALUES = require('../VALUES');
const Entity = require('./Entity');

class Section {
	constructor(num, col, row) {
		this.num = num;
		this.col = col;
		this.row = row;
		this.x = col * VALUES.SECTION_WIDTH;
		this.y = row * VALUES.SECTION_HEIGHT;
		this.entities = {};

		this.onChannelMsg = (data) => {
			switch(data[0]) {
	            case "enter world": {
	       		
	              var username = data[1];
	              var entityname = data[2];
	              var x = data[3];
	              var y = data[4];
	              var hp = data[5];
	              // generate id here
	              var id = Math.random() * 1000000;

	              var entity = new Entity(username, id, entityname, x, y, hp);

	              this.addEntity(entity); 

	              // send back channel reply message
	              process.scServer.exchange.publish("cl_" + username, ["enter realm"]);

	            } break; 

	            case "char entered section": {

	              var username = data[1];
              	  var id = data[2];
	              var entityname = data[3];
	              var x = data[4];
	              var y = data[5];
	              var hp = data[6];	
	              var fromCol = data[7]; //col, row
	              var fromRow = data[8];

	              var entity = new Entity(username, id, entityname, x, y, hp);

	              console.log("creating new entity because it moved to a new section");

	              this.addEntity(entity);

	              // send back reply that char successfully switched to this new section
	              process.scServer.exchange.publish('wkr_section_' + fromCol + ',' + fromRow, ['char pass success', id]); // 1 for success

	              // send new relevant info to user, even the fact that they have entered a new section

	              // send back channel reply message
	              //process.scServer.exchange.publish("cl_" + username, ["enter realm"]);

	            } break; 

	            case "char pass success": {
	            	console.log("on char pass reply at " + col + ", " + row);

	            	//this.chars[data[1]].afterSectionPass();
	            	delete this.entities[data[1]];
	            } break;

	            // also, char pass failure

	            // todo: entity entered, like a mob
	            case "entity entered section": {

	                var id = data[1];
	                var entityname = data[2];
	                var x = data[3];
	                var y = data[4];
	                var hp = data[5];	
	                var fromCol = data[6]; //col, row
	                var fromRow = data[7];
	                
	            	var entity = new Entity(null, id, entityname, x, y, hp);

	            	this.addEntity(entity);

		            // send back reply that char successfully switched to this new section
		            process.scServer.exchange.publish('wkr_section_' + fromCol + ',' + fromRow, ['entity pass success', id]); // 1 for success

	            } break;

	            case "char pass success": {
	            	console.log("on entity pass reply received at " + col + ", " + row);

	            	//this.chars[data[1]].afterSectionPass();
	            	delete this.entities[data[1]];
	            } break;

	            /*
	            "enter world", 0
	            username, 1
	            charname, 2
	            x, 3
	            y, 4
	            hp 5
	            */
	          }
		};

		var channelName = 'wkr_section_' + col + ',' + row;
		this.sectionChannel = process.scServer.exchange.subscribe(channelName);
		this.sectionChannel.watch(this.onChannelMsg);
	}

	/*
	var sectionChannel = scServer.exchange.subscribe('wkr_section_' + sectionsArr[i].x + ',' + sectionsArr[i].y); // to client

            //'wkr_section_' + col + ',' + row, 
            //var svChannel = socket.sub

            sectionChannel.watch(section.onChannelMsg);
	
            */

	addEntity(entity) {
		
		this.entities[entity.id] = entity;
		console.log(entity.id + " added to section " + this.num);

		// watch the users sv_username channel
	}

	// sections can either be local or external
	
	// local = same machine? no need to send messages between broker in that case, there has to be a more effficient way to send info 
	// among processes on the same virtual machine 
	// external = different worker (especially on a different machine)

	passToSection(entity, col, row) {
		// check if it's actually possible for this section to exist
		// first, for now, check if col or row is less than 0
		// right now, (at least for the purposes of testing, all sections must be positive)

		entity.isMovingToNewSection = true;

		if(col < 0 || row < 0 || col > 15 || row > 15) {
			
			// don't do anything, or mark this entity as having a section problem to be rectified later
			console.log("CANNOT PLACE entity IN SECTION");
			entity.markSectionProblem("cannot place in section");

		} else {
			// attempt to move

			// first check if the section exists in this worker

			entity.beforeSectionPass();

			console.log("moving " + entity.name + " to new section col: " + col + " row: " + row);

			process.scServer.exchange.publish('wkr_section_' + col + "," + row, ['char entered section',
				entity.username, 
				entity.id, 
	          	entity.name, 
              	entity.x, 
              	entity.y, 
              	entity.hp, 
              	this.col, 
              	this.row
	              
              	]);

			// pseudo msgCode	

			// msgCode: "move to new section"
			// entity: { <char object> }  
			// 
		}

	}

	update(delta) {
		//console.log('updating section ' + this.num);

		Object.values(this.entities).forEach(entity => {
			if(!entity.isMovingToNewSection) {
				entity.update();

			// todo: check if entity has moved from this section's bounds,

			// check if it's moved up, down, left, right

				// a new way of implementing this could be detecting whether the entity is in the sections bounds,
				// if not, looking up the section based on their new x,y position, instead of only moving to a neighbouring
				// section. This can account for teleportation, which essential for development alone.

				if(entity.y > this.y + VALUES.SECTION_HEIGHT ||
					entity.y < this.y ||
					entity.x > this.x + VALUES.SECTION_WIDTH ||
					entity.x < this.x) 
				{
					var col = Math.floor(entity.x / VALUES.SECTION_WIDTH);
        			var row = Math.floor(entity.y / VALUES.SECTION_HEIGHT);

        			this.passToSection(entity, col, row);
				}

				

        		/*

				//down
				if(char.y > this.y + VALUES.SECTION_HEIGHT) {
					// could check if it's gone left or right as well, for the rare care of traversing a corner
					if(this.charHasGoneLeft(char)) {
						
						//bottom left
						this.passToSection(char, this.col - 1, this.row + 1);

					} else if(this.charHasGoneRight(char)) {
						
						//bottom right
						this.passToSection(char, this.col + 1, this.row + 1);

					} else {
						//directly below
						this.passToSection(char, this.col, this.row + 1);
					}
				} else if(char.y < this.y) {
					if(this.charHasGoneLeft(char)) {
						
						//top left
						this.passToSection(char, this.col - 1, this.row - 1);

					} else if(this.charHasGoneRight(char)) {
						
						//top right
						this.passToSection(char ,this.col + 1, this.row - 1);

					} else {
						
						//directly above
						this.passToSection(char, this.col, this.row - 1);
					}
				} else if(char.x < this.x) {

					this.passToSection(char, this.col - 1, this.row);

				} else if(char.x > this.x + VALUES.SECTION_WIDTH) {

					this.passToSection(char, this.col + 1, this.row);
				}

				*/

			// if so, find out what section it needs to move to,
			// check if it exists on this worker,
			// if not, publish a message to move this char from this section to the other section residing on the other worker
			}
		});
	}

	charHasGoneLeft(char) {
		if(char.x < this.x) {
			return true;
		} return false;
	}

	charHasGoneRight(char) {
		if(char.x > this.x + VALUES.SECTION_WIDTH) {
			return true;
		} return false;
	}
}

module.exports = Section;