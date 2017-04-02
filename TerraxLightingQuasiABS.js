//=============================================================================
// Terrax Plugins - Quasi ABS support for  Terrax Lighting system
// TerraxLighting.js
// Version: 1.1
//=============================================================================
//

//=============================================================================
 /*:
 * @plugindesc v1.1 Support for linking QuasiABS with TerraxLightingSystem
 * @author Terrax
 *
 * @help
 *
 * ONLY USE THIS PLUGIN WHEN YOU HAVE QUASI ABS INSTALLED, PUT THIS SCRIPT BELOW THE QUASI ABS PLUGIN!!!
 *
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
 * tx_state: 50, #FFAA00, 300 , FADEOUT, 20
 * Will give a 300 frame lightsource to the NPC, used to display burning, it will fadeout on the last 20 frames
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
 *   tx_state: 50, #FFAA00, 300 , FADEOUT, 20
 * </absSettings>
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

			action.absApply(targets[i].battler(),tx_x,tx_y,tx_set);

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

	Game_Action.prototype.absApply = function(target,tx_x,tx_y,tx_set) {
		this._isAbs = true;
		var result = target.result();
		this._realSubject.clearResult();
		result.clear();
		result.physical = this.isPhysical();
		result.drain = this.isDrain();
		if (this.item().damage.type > 0) {
			result.critical = (Math.random() < this.itemCri(target));
			var value = this.makeDamageValue(target, result.critical);
			this.executeDamage(target, value);
			target.startDamagePopup();
		}

		target.result().success = false;
		this.item().effects.forEach(function(effect) {
			this.applyItemEffect(target, effect);
		}, this);

		if (target.result().success == true) {
			// TX ADDED OnState
			Terrax_ABS_blast_x.push(tx_x);
			Terrax_ABS_blast_y.push(tx_y);
			Terrax_ABS_blast.push(tx_set);
			Terrax_ABS_blast_duration.push(-1);
			Terrax_ABS_blast_fade.push(-1);
			Terrax_ABS_blast_grow.push(-1);
			Terrax_ABS_blast_mapid.push($gameMap.mapId());
		}

		this.applyItemUserEffect(target);
		if (Imported.Quasi_QEvents) {
			this.applyQEvent(target);
		} else {
			this.applyGlobal(); // Run common events
		}
		this._isAbs = false;
	};



})();

	
	