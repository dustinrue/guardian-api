# Guardian API
Simplified access to Bungie's Destiny API including OAuth.

## Example Usage

```javascript
'use strict';

var bungie = require('../guardian-api');
var express = require('express');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var https = require('https');
var querystring = require('querystring');
var db = new sqlite3.Database(':memory:');
var events = require('events');

var app = express();

// Tell Guardian API what our API key is was well as our app id.
// The app id is used to generate the authroziation URL
bungie.setApiKey('9b9d966677e44029b28da69312b960ed');
bungie.setAppID('10767');

// When Guardian API receives new token data, either initially or
// when it has refreshed the tokens because the access token expired
// this function will be called. You can store the info and when the 
// visitor returns set the token data from the stored info saving you
// the authorization step
var tokenDataArrived = function(data) {
  // handle new token data arriving, or don't
  console.log(data);
}

bungie.setNewTokenCallback(tokenDataArrived);

app.get('/', function(req, res) {
  if (!bungie.isAuthorized()) {
    bungie.authorize(res);
  }
  else {
    bungie.getBungieNetUser(function(data) {
      res.send(data);
    });
  }
  
});

app.get('/refresh', function(req, res) {
  bungie.refresh(function(data) {
    console.log("refreshed token");
  });
  res.send("requested token refresh");
});

app.get('/code', function(req, res) {
  var state;
  bungie.parseCode(req.url, state, function(data) {
    
    if (Object.keys(data).length > 0) {
      res.redirect(302, '/');
    }
    else {
      res.redirect(302, '/authorization-failure')
    }
  });
});

app.get('/authorization-failure', function(req, res) {
  res.send("Something went wrong, maybe they denied?");
});


https.createServer({
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
}, app).listen(3000, function() {
  
  
  console.log("Ready on port 3000");
});
```