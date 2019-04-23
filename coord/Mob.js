class Mob extends Entity {
	constructor(id, name, x, y, hp) {
		super(null, id, name, x, y, hp);

		this.roam = () => {

		};
	}

	update(deltaTime) {
		this.entityUpdate(); // test if this works
	}
}