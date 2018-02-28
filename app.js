'use strict';
const path = require('path');
const GameController = require('./app/controllers/game-controller');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const favicon = require('serve-favicon');
const lessMiddleware = require('less-middleware');


const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

var Quarters = require('node-quarters')
// Create quarters client
var quartersClient = new Quarters({
  key: 'U0ohUzcFLdIc7Q2oPrro',
  webSecret: 'bs12k7jd8sct626ocf6y8r5p3udr35ddn',
  secret: '29ys3xlpfg5yhh3ii16zl9qusffdqk7kxgt08imvb5aruptpttsf',
  address: '0x347b0bfc4a86b1402c9dd92fea727235e92888c0',
  quartersURL: 'https://dev.pocketfulofquarters.com',
  apiURL: 'https://api.dev.pocketfulofquarters.com/v1/'
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())

app.post('/code', function(req, res, next) {
  var code = req.body.code

  // create refresh token for user and fetch user
  return quartersClient
    .createRefreshToken(code)
    .then(function(data) {
      // get refresh_token
      var refresh_token = data.refresh_token

      // get access_token
      var access_token = data.access_token

      // send refresh token
      return res.json({
        refreshToken: refresh_token
      })
    })
    .catch(function(e) {
      return res.status(400).json({
        message: (e.data && e.data.message) || e.message
      })
    })
})

app.use(lessMiddleware(path.join(__dirname, 'public')));
// Expose all static resources in /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));

// Redirect to the main page
app.set('views', path.join(__dirname, 'app/views'))
app.set('view engine', 'ejs')
app.get('/', function(req, res, next) {
  return res.render('index')
})

app.get('/play', (request, response) => {
    response.sendFile('game.html', { root: path.join(__dirname, 'app/views') });
});

// Create the main controller
const gameController = new GameController();
gameController.listen(io);

const SERVER_PORT = process.env.PORT || 3000;
app.set('port', SERVER_PORT);

// Start Express server
server.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
