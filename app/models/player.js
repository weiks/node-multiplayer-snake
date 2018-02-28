'use strict';

const Quarters = require('node-quarters')

var quartersClient = new Quarters({
  key: 'U0ohUzcFLdIc7Q2oPrro',
  webSecret: 'bs12k7jd8sct626ocf6y8r5p3udr35ddn',
  secret: '29ys3xlpfg5yhh3ii16zl9qusffdqk7kxgt08imvb5aruptpttsf',
  address: '0x347b0bfc4a86b1402c9dd92fea727235e92888c0',
  quartersURL: 'https://dev.pocketfulofquarters.com',
  apiURL: 'https://api.dev.pocketfulofquarters.com/v1/'
})


class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.growAmount = 0;
        this.moveCounter = 0;
        this.quartersId = '';
    }

    changeDirection(newDirection) {
        this.direction = newDirection;
    }

    clearAllSegments() {
        this._segments = [];
    }

    getHeadCoordinate() {
        return this._segments[0];
    }

    getSegments() {
        return this._segments.slice(0);
    }

    // Growing is not done immediately, but on the next turn
    grow(amount) {
        this.growAmount += amount;
    }

    hasSegments() {
        return this._segments.length > 0;
    }

    move(newHeadCoordinate) {
        // Record the last drawn player direction, to limit the player from moving too quickly back into themselves
        this.directionBeforeMove = this.direction;
        if (this.growAmount > 0) {
            this.growAmount--;
        } else {
            // pop tail and make it the head
            this._segments.pop();
        }
        this._segments.unshift(newHeadCoordinate);
        this.moveCounter++;
    }

    setStartingSpawn(newDirection, headCoordinate, growAmount) {
        this.direction = newDirection;
        this.directionBeforeMove = newDirection;
        this.growAmount = growAmount;
        this._segments = [headCoordinate];
        this.moveCounter = 0;
    }

    setBase64Image(base64Image) {
        this.base64Image = base64Image;
    }

    swapBodies(segments, direction, directionBeforeMove, growAmount) {
        this.moveCounter = 0;
        this._segments = segments;
        this.direction = direction;
        this.directionBeforeMove = directionBeforeMove;
        this.growAmount = growAmount;
    }

    sendQuarters(amount) {
        console.log("send a quarter", this.quartersId)
        quartersClient.transferQuarters({
            user: this.quartersId,
            amount: amount
        })
        .then((txId) => console.log(txId))
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            direction: this.direction,
            segments: this.getSegments(),
            growAmount: this.growAmount,
            color: this.color,
            moveCounter: this.moveCounter,
            base64Image: this.base64Image,
            quartersId: this.quartersId,
        };
    }
}

module.exports = Player;
