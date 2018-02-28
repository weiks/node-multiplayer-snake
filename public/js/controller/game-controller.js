import ClientConfig from 'config/client-config';
import AudioController from 'controller/audio-controller';
import TextToDraw from 'model/text-to-draw';
import CanvasFactory from 'view/canvas-factory';
import GameView from 'view/game-view';

/**
 * Controls all game logic
 */
export default class GameController {
    constructor() {
        this.gameView = new GameView(this.backgroundImageUploadCallback.bind(this),
                                     this.botChangeCallback.bind(this),
                                     this.foodChangeCallback.bind(this),
                                     this.imageUploadCallback.bind(this),
                                     this.joinGameCallback.bind(this),
                                     this.keyDownCallback.bind(this),
                                     this.muteAudioCallback.bind(this),
                                     this.playerColorChangeCallback.bind(this),
                                     this.playerNameUpdatedCallback.bind(this),
                                     this.spectateGameCallback.bind(this),
                                     this.speedChangeCallback.bind(this),
                                     this.startLengthChangeCallback.bind(this),
                                     this.toggleGridLinesCallback.bind(this)
                                     );
        this.audioController = new AudioController();
        this.players = [];
        this.food = {};
        this.textsToDraw = [];
        this.walls = [];
        this.client = new Quarters({
            appKey: 'U0ohUzcFLdIc7Q2oPrro',
            appSecret: 'bs12k7jd8sct626ocf6y8r5p3udr35ddn',
            quartersURL: 'https://dev.pocketfulofquarters.com',
            apiURL: 'https://api.dev.pocketfulofquarters.com/v1/'
        })
        this.refreshToken = window.localStorage.getItem('snake-refresh-token')
        this.displayName = window.localStorage.getItem('displayName')
        this.quartersId = window.localStorage.getItem('quartersId')
    }

    connect(io) {
        this.client.setRefreshToken(this.refreshToken)
        this.socket = io();
        this._initializeSocketIoHandlers();
        const storedName = localStorage.getItem(ClientConfig.LOCAL_STORAGE.PLAYER_NAME);
        const storedBase64Image = localStorage.getItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE);
        this.socket.emit(ClientConfig.IO.OUTGOING.NEW_PLAYER, storedName, storedBase64Image);
        this.playerNameUpdatedCallback(this.displayName)
        this.playerIdUpdatedCallback(this.quartersId)
    }

    renderGame() {
        this.canvasView.clear();
        for (const foodId in this.food) {
            if ({}.hasOwnProperty.call(this.food, foodId)) {
                const food = this.food[foodId];
                this.canvasView.drawSquare(food.coordinate, food.color);
            }
        }

        this.canvasView.drawSquares(this.walls, ClientConfig.WALL_COLOR);

        for (const player of this.players) {
            if (player.segments.length === 0) {
                continue;
            }
            // Flash around where you have just spawned
            if (`/#${this.socket.id}` === player.id &&
                    player.moveCounter <= ClientConfig.TURNS_TO_FLASH_AFTER_SPAWN &&
                    player.moveCounter % 2 === 0) {
                this.canvasView.drawSquareAround(player.segments[0], ClientConfig.SPAWN_FLASH_COLOR);
            }

            if (player.base64Image) {
                this.canvasView.drawImages(player.segments, player.base64Image);
            } else {
                this.canvasView.drawSquares(player.segments, player.color);
            }
        }

        for (let i = this.textsToDraw.length - 1; i >= 0; i--) {
            const textToDraw = this.textsToDraw[i];
            if (textToDraw.counter === ClientConfig.TURNS_TO_SHOW_FOOD_TEXT) {
                this.textsToDraw.splice(i, 1);
            } else {
                this.canvasView.drawFadingText(textToDraw, ClientConfig.TURNS_TO_SHOW_FOOD_TEXT);
                textToDraw.incrementCounter();
            }
        }

        const self = this;
        // Run in a loop
        setTimeout(() => {
            requestAnimationFrame(self.renderGame.bind(self));
        }, 1000 / ClientConfig.FPS);
    }

    /*******************
     *  View Callbacks *
     *******************/

    botChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.BOT_CHANGE, option);
    }

    foodChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.FOOD_CHANGE, option);
    }

    backgroundImageUploadCallback(image, imageType) {
        if (!(image && imageType)) {
            this.socket.emit(ClientConfig.IO.OUTGOING.CLEAR_UPLOADED_BACKGROUND_IMAGE);
            return;
        }
        const resizedBase64Image = this.canvasView.resizeUploadedBackgroundImageAndBase64(image, imageType);
        this.socket.emit(ClientConfig.IO.OUTGOING.BACKGROUND_IMAGE_UPLOAD, resizedBase64Image);
    }

    canvasClicked(x, y) {
        this.socket.emit(ClientConfig.IO.OUTGOING.CANVAS_CLICKED, x, y);
    }

    // optional resizedBase64Image
    imageUploadCallback(image, imageType, resizedBase64Image) {
        if (!(image && imageType)) {
            this.socket.emit(ClientConfig.IO.OUTGOING.CLEAR_UPLOADED_IMAGE);
            localStorage.removeItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE);
            return;
        }
        let newResizedBase64Image;
        if (resizedBase64Image) {
            newResizedBase64Image = resizedBase64Image;
        } else {
            newResizedBase64Image = this.canvasView.resizeUploadedImageAndBase64(image, imageType);
        }
        this.socket.emit(ClientConfig.IO.OUTGOING.IMAGE_UPLOAD, newResizedBase64Image);
        localStorage.setItem(ClientConfig.LOCAL_STORAGE.PLAYER_IMAGE, newResizedBase64Image);
    }

    joinGameCallback() {
        console.log("join game", this.client)
        var that = this

      this.client
        .requestTransfer({
          tokens: 2, // 2 quarters
          description: 'Play Multi-Snake' // transfer description
        })
        .then(function(request) {
            console.log("then")
          // add iframe on the page and ask player to authorize transfer
          that.client.authorizeTransfer(request.id, 'iframe', function(data) {
            // stop loading
            //that.loading = false
            console.log("authorize")
            if (data.error) {
              // data.message
            } else if (data.cancel) {
              // player canceled transfer
            } else {
              // data.txId => Ethereum transaction tx id
              // data.requestId => Request Id to get details about order (/v1/requests/:requestId)

              // change quarters

              // Send server that we have paid 10 quarters and check if I won
              //that.playNow(data.txId, data.requestId, chance)
              that.socket.emit(ClientConfig.IO.OUTGOING.JOIN_GAME);
            }
          })
        })
        .catch(function(e) {
          // stop loading
          //that.loading = false
          console.error(e)
        })
    }

    keyDownCallback(keyCode) {
        this.socket.emit(ClientConfig.IO.OUTGOING.KEY_DOWN, keyCode);
    }

    muteAudioCallback() {
        this.audioController.toggleMute();
        this.gameView.setMuteStatus(this.audioController.isMuted);
    }

    playerColorChangeCallback() {
        this.socket.emit(ClientConfig.IO.OUTGOING.COLOR_CHANGE);
    }

    playerNameUpdatedCallback(name) {
        this.socket.emit(ClientConfig.IO.OUTGOING.NAME_CHANGE, name);
        localStorage.setItem(ClientConfig.LOCAL_STORAGE.PLAYER_NAME, name);
    }

    playerIdUpdatedCallback(id) {
        console.log("id updated")
        this.socket.emit(ClientConfig.IO.OUTGOING.ID_CHANGE, id);
        localStorage.setItem(ClientConfig.LOCAL_STORAGE.ID_NAME, id);
    }

    spectateGameCallback() {
        console.log("spectate")
        this.socket.emit(ClientConfig.IO.OUTGOING.SPECTATE_GAME);
    }

    speedChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.SPEED_CHANGE, option);
    }

    startLengthChangeCallback(option) {
        this.socket.emit(ClientConfig.IO.OUTGOING.START_LENGTH_CHANGE, option);
    }

    toggleGridLinesCallback() {
        this.canvasView.toggleGridLines();
    }

    /*******************************
     *  socket.io handling methods *
     *******************************/

    _createBoard(board) {
        this.canvasView =
            CanvasFactory.createCanvasView(
                board.SQUARE_SIZE_IN_PIXELS, board.HORIZONTAL_SQUARES, board.VERTICAL_SQUARES, this.canvasClicked.bind(this));
        this.canvasView.clear();
        this.gameView.ready();
        this.renderGame();
    }

    _handleBackgroundImage(backgroundImage) {
        if (backgroundImage) {
            this.canvasView.setBackgroundImage(backgroundImage);
        } else {
            this.canvasView.clearBackgroundImage();
        }
    }

    _handleFoodCollected(text, coordinate, color, isSwap) {
        this.textsToDraw.unshift(new TextToDraw(text, coordinate, color));
        if (isSwap) {
            this.audioController.playSwapSound();
        } else {
            this.audioController.playFoodCollectedSound();
        }
    }

    _handleNewGameData(gameData) {
        this.players = gameData.players;
        this.food = gameData.food;
        this.walls = gameData.walls;
        this.gameView.showFoodAmount(Object.keys(gameData.food).length);
        this.gameView.showSpeed(gameData.speed);
        this.gameView.showStartLength(gameData.startLength);
        this.gameView.showNumberOfBots(gameData.numberOfBots);
        this.gameView.showPlayerStats(gameData.playerStats);
    }


    _initializeSocketIoHandlers() {
        this.socket.on(ClientConfig.IO.INCOMING.NEW_PLAYER_INFO, this.gameView.updatePlayerName);
        this.socket.on(ClientConfig.IO.INCOMING.BOARD_INFO, this._createBoard.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NEW_STATE, this._handleNewGameData.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NEW_BACKGROUND_IMAGE, this._handleBackgroundImage.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.FOOD_COLLECTED, this._handleFoodCollected.bind(this));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.GENERAL, this.gameView.showNotification);
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.KILL, this.gameView.showKillMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.KILLED_EACH_OTHER,
            this.gameView.showKilledEachOtherMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.RAN_INTO_WALL,
            this.gameView.showRanIntoWallMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.SUICIDE, this.gameView.showSuicideMessage.bind(this.gameView));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.YOU_DIED,
            this.audioController.playDeathSound.bind(this.audioController));
        this.socket.on(ClientConfig.IO.INCOMING.NOTIFICATION.YOU_MADE_A_KILL,
            this.audioController.playKillSound.bind(this.audioController));
    }
}
