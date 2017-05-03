//=============================================================================
// Terrax Plugins - Quasi ABS support for  Terrax Lighting system
// TerraxLighting.js
// Version: 1.2
//=============================================================================
//

//=============================================================================
 /*:
 * @plugindesc v1.2 Support for linking QuasiABS with TerraxLightingSystem
 * @author Terrax
 *
 * @help
 * The following definitions can be added to the QuasiABS settings in the database - skill-settings
 *
 * tx_missle: 25, #FF0000
 * Will give the missle a small (radius 25) red (color #FF0000) lightsource
 *
 * tx_onhit: 30, #FFAA00, 10, FADEOUT, 5
 * Will give a small yellow lightflash whenever the missle impacts on a wall or flies out of view, it will fadeout on the last 5 frames
 *
 * tx_onhitNPC: 100, #FFAA00, 15
 * Will give a large yellow lightflash when the missle impacts with an NPC character.
 *
 *
 * Example :
 *
 * <absSettings>
 *   collider: circle, 13, 13
 *   cooldown: 45
 *   through: 3
 *   tx_missle: 25, #FF0000
 *   tx_onhit: 30, #FFAA00, 10, FADEOUT, 5
 *   tx_onhitNPC: 100, #FFAA00, 15
 * </absSettings>
 *
 *
 * To make a state give light (for burning for example) you can define the radius and color in the note-tag of the state
 * with the following definition.
 * Database -> States -> Notetag ->  <TX>TX:50,#FFAA00;</TX>
 * for a light effect with radius 50 and color #FFAA00.
 *
 * Released under the MIT license,
 * if used for commercial projects feel free to make a donation or 
 * better yet, give me a free version of what you have created.
 * e-mail : fox(AT)caiw.nl / terraxz2 on steam.
 * 
 * Thanks to everyone in the rpgmakerweb community for idea's, support and interest.
*/
//=============================================================================
//  ps.. if my code looks funky, i'm an old guy..
// object orientated programming bugs the hell out of me.
var Imported = Imported || {};
Imported.TerraxLightingQuasiABS = true;

(function() {


	// OVERWRITTEN FROM QUASI ABS TO ADD LIGHTSOURCES TO MISSLES AND END ANIMATIONS
	// Skill_Sequencer

	Skill_Sequencer.prototype.update = function() {

		if (this._skill.break) {
			var i = this._character._skillLocked.indexOf(this._skill);
			if (i >= 0) {
				this._character._skillLocked.splice(i, 1);
			}
			this._character._casting = false;
			QuasiABS.Manager.removePicture(this._skill.picture);
			QuasiABS.Manager.removePicture(this._skill.trail);
			QuasiABS.Manager.removePicture(this._skill.pictureCollider);
			i = this._character._activeSkills.indexOf(this._skill);
			this._character._activeSkills.splice(i, 1);
			return;
		}
		if (this._skill.moving) {

			// ADDED
			Terrax_ABS_skill_x.push(this._skill.collider.center.x);
			Terrax_ABS_skill_y.push(this._skill.collider.center.y);
			Terrax_ABS_skill.push(this._skill.settings.tx_missle);
			this.updateSkillPosition();
		}
		if (this._waitCount > 0) {
			this._waitCount--;
			return;
		}
		if (this._waitForUserMove || this._waitForUserJump || this._waitForPose) {
			if (!this._character.isMoving())   this._waitForUserMove = false;
			if (!this._character.isJumping())  this._waitForUserJump = false;
			if (!this._character._posePlaying) this._waitForPose = false;
		}
		if (this._waitForMove || this._waitForUserMove ||
			this._waitForUserJump || this._waitForPose) {
			return;
		}
		var sequence = this._skill.sequence.shift();
		if (sequence) {
			var action = sequence.split(' ');

			// TX ADDED Trigger
			if (action[0].toLowerCase() == "trigger") {
				Terrax_ABS_blast_x.push(this._skill.collider.center.x);
				Terrax_ABS_blast_y.push(this._skill.collider.center.y);
				Terrax_ABS_blast.push(this._skill.settings.tx_blast);
				Terrax_ABS_blast_duration.push(-1);
				Terrax_ABS_blast_fade.push(-1);
				Terrax_ABS_blast_grow.push(-1);
				Terrax_ABS_blast_mapid.push($gameMap.mapId());
			}

			this.startAction(action);
		}
		if (this._skill.sequence.length === 0) {
			if (!this._skill.moving) {
				var i = this._character._activeSkills.indexOf(this._skill);
				QuasiABS.Manager.removePicture(this._skill.picture);
				QuasiABS.Manager.removePicture(this._skill.trail);
				QuasiABS.Manager.removePicture(this._skill.pictureCollider);
				this._character._activeSkills.splice(i, 1);

				// TX ADDED On hit
				//Graphics.Debug2('coors xy',this._skill.collider.center.x+'-'+this._skill.collider.center.y+' '+this._skill.settings.tx_onhit);

				Terrax_ABS_blast_x.push(this._skill.collider.center.x-$gameMap.tileWidth()/2);
				Terrax_ABS_blast_y.push(this._skill.collider.center.y-$gameMap.tileHeight()/2);
				Terrax_ABS_blast.push(this._skill.settings.tx_onhit);
				Terrax_ABS_blast_duration.push(-1);
				Terrax_ABS_blast_fade.push(-1);
				Terrax_ABS_blast_grow.push(-1);
				Terrax_ABS_blast_mapid.push($gameMap.mapId());

			}
		}


	};

	Skill_Sequencer.prototype.updateState = function() {

	}


	Graphics.Debug2 = function(name, message) {
		if (this._errorPrinter) {
			this._errorPrinter.innerHTML = this._makeErrorHtml(name, message);
		}
	};


	QuasiABS.Manager.startAction = function(self, targets, item) {
		if (!item.animationTarget || targets.length === 0) {
			this.startAnimation(item.data.animationId, item.collider.center.x, item.collider.center.y);
		}
		for (var i = 0; i < targets.length; i++) {
			if (item.animationTarget === 1) {
				var x = targets[i].cx();
				var y = targets[i].cy();
				this.startAnimation(item.data.animationId, x, y);
			}

			var action = new Game_Action(self.battler(), true);
			action.setSkill(item.data.id);

			var tx_x = targets[i].cx()-$gameMap.tileWidth()/2;
			var tx_y = targets[i].cy()-$gameMap.tileHeight()/2;
			var tx_set = item.settings.tx_state;

			action.absApply(targets[i].battler());

			// TX ADDED OnHitNPC
			Terrax_ABS_blast_x.push(targets[i].cx()-$gameMap.tileWidth()/2);
			Terrax_ABS_blast_y.push(targets[i].cy()-$gameMap.tileHeight()/2);
			Terrax_ABS_blast.push(item.settings.tx_onhitNPC);
			Terrax_ABS_blast_duration.push(-1);
			Terrax_ABS_blast_fade.push(-1);
			Terrax_ABS_blast_grow.push(-1);
			Terrax_ABS_blast_mapid.push($gameMap.mapId());

			var id = self === $gamePlayer ? 0 : self.eventId();
			targets[i].addAgro(id, item.data);
		}
	};

	Game_CharacterBase.prototype.updateABS = function() {
		if (this.battler())  {
			if (this.battler().hp <= 0) return this.onDeath();
			this.updateSkills();
			this.battler().updateABS(this._realX,this._realY);
		}
	};

	Game_Battler.prototype.updateABS = function(x,y) {
		for (var i = 0; i < this.states().length; i++) {
			this.updateStateSteps(this.states()[i],x,y);
		}
		//this.showAddedStates();   //Currently does nothing, so no need to run it
		//this.showRemovedStates(); //Currently does nothing, so no need to run it
	};

	Game_Battler.prototype.updateStateSteps = function(state,x,y) {
		if (!state.removeByWalking) return;
		if (this._stateSteps[state.id] >= 0) {
			if (this._stateSteps[state.id] % this.stepsForTurn() === 0) {
				this.onTurnEnd();
				this.result().damageIcon = $dataStates[state.id].iconIndex;
				this.startDamagePopup();
				if (this._stateSteps[state.id] === 0) this.removeState(state.id);
			}
			this._stateSteps[state.id]--;

			// ADDED
			var statenote = $dataStates[state.id].note;

			if (statenote) {
				var searchnote = statenote.indexOf("TX:");
				if (searchnote >= 0) {
					var closetag = statenote.indexOf(";",searchnote);
					var txdata = statenote.substring(searchnote+3, closetag);

					//Graphics.Debug2('state',$dataStates[state.id].note+ " "+txdata);

					var tw = $gameMap.tileWidth();
					var ty = $gameMap.tileHeight();
					var x1 = (x * tw) + (tw/2);
					var y1 = (y * ty) + (ty/2);

					Terrax_ABS_skill_x.push(x1);
					Terrax_ABS_skill_y.push(y1);
					Terrax_ABS_skill.push(txdata);

				}
			}

		}
	};

})();

	
	