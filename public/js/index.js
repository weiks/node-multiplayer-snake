// Create quarters client
var client = new Quarters({
  appKey: 'U0ohUzcFLdIc7Q2oPrro',
  appSecret: 'bs12k7jd8sct626ocf6y8r5p3udr35ddn',
  quartersURL: 'https://dev.pocketfulofquarters.com',
  apiURL: 'https://api.dev.pocketfulofquarters.com/v1/'
})

var app = new Vue({
  el: '#app',
  data: {
    user: null,
    loading: false,
    error: null,
    result: false,
    quarters: null,
    reward: null
  },
  mounted: function() {
    // check if already logged in
    var refreshToken = window.localStorage.getItem('snake-refresh-token')

    // load user
    var that = this
    if (refreshToken) {
      this.loadUser(refreshToken).then(function() {
        return that.loadBalance()
      })
    }
  },
  methods: {
    authorize: function() {
      var that = this

      // show loading
      this.loading = true

      // authorize
      client.authorize('iframe', function(data) {
        if (data.code) {
          // fetch refresh token using code
          return fetch('/code', {
            method: 'POST',
            headers: {
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code: data.code
            })
          })
            .then(function(res) {
              return res.json()
            })
            .then(function(res) {
              // stop loading
              that.loading = false
              // res.refresh_token => you can store into local-storage or cookies
              window.localStorage.setItem(
                'snake-refresh-token',
                res.refreshToken
              )

              // set refresh token to quarters client
              return that.loadUser(res.refreshToken).then(function() {
                return that.loadBalance()
              })
            })
            .catch(function(e) {
              // stop loading
              that.loading = false

              console.log(e)
            })
        } else {
          // stop loading
          that.loading = false
        }
      })
    },

    // load user
    loadUser: function(refreshToken) {
      var that = this

      // start loading
      this.loading = true

      return client
        .setRefreshToken(refreshToken)
        .then(function() {
          return client.me()
        })
        .then(function(user) {
          // saving user for later user
          that.user = user
          // stop loading
          window.localStorage.setItem('displayName', user.displayName)
          window.localStorage.setItem('quartersId', user.userId)
          console.log(user.displayName)
          that.loading = false
        })
        .catch(function(e) {
          // stop loading
          that.loading = false
        })
    },

    loadBalance: function() {
      return client.getBalance().then(
        function(data) {
          this.quarters = parseInt(data.quarters)
        }.bind(this)
      )
    },

    // startGame
    startGame: function(chance) {
      var that = this
      this.error = null
      this.result = null
      this.reward = null

      // start loading
      this.loading = true

      // first create request transfer from quarters server
      console.log(client)
      client
        .requestTransfer({
          tokens: 2, // 2 quarters
          description: 'Play Multi-Snake' // transfer description
        })
        .then(function(request) {
          // add iframe on the page and ask player to authorize transfer
          client.authorizeTransfer(request.id, 'iframe', function(data) {
            // stop loading
            that.loading = false

            if (data.error) {
              // data.message
            } else if (data.cancel) {
              // player canceled transfer
            } else {
              // data.txId => Ethereum transaction tx id
              // data.requestId => Request Id to get details about order (/v1/requests/:requestId)

              // change quarters
              that.loadBalance()

              // Send server that we have paid 10 quarters and check if I won
              //that.playNow(data.txId, data.requestId, chance)
              window.location.href = "/play";
            }
          })
        })
        .catch(function(e) {
          // stop loading
          that.loading = false
        })
    },

    // Play with system as you have already place your stake using `placeBet` method
    playNow: function(txId, requestId, chance) {
      var that = this

      this.error = null
      this.result = null
      this.reward = null

      // stop loading
      that.loading = true

      return fetch('/play', {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txId: txId,
          requestId: requestId,
          chance: chance,
          userId: that.user.id
        })
      })
        .then(function(res) {
          return res.json()
        })
        .then(function(data) {
          // stop loading
          that.loading = false

          that.result = data.won ? 'won' : 'lose'
          if (data.won) {
            // change quarters
            that.quarters += data.amount
            that.reward = data.amount
          }
        })
        .catch(function(e) {
          // stop loading
          that.loading = false

          // error
          that.error = e.message
        })
    }
  }
})
