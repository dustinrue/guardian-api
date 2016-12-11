'use strict';

var express = require('express');
var fs = require('fs');
var url = require('url');
var sqlite3 = require('sqlite3').verbose();
var https = require('https');
var querystring = require('querystring');
var db = new sqlite3.Database(':memory:');


var apiKey = '9b9d966677e44029b28da69312b960ed';
var bungieInitialTokenURL = '/en/Application/Authorize/10767';
var tokens = '';
var accessToken = '';
var refreshToken = '';

var app = express();

// the username is always RealAngryMonkey
app.get('/', function(req, res) {
  db.serialize(function() {
    db.get("SELECT username, token, refreshToken FROM token WHERE username = 'RealAngryMonkey'", function(err, row) {
      if (typeof(row) === "undefined") {
        res.redirect(302, 'https://www.bungie.net' + bungieInitialTokenURL + "?state=test");
        /*
        res.send("Adding user<br/>");
        try {
	  
        }
        catch (e) {
          console.log("Failed to create user");
          console.log(e);
        }
        */
      }
      else {
        res.send(row);
      }
    });
  });
});

app.get('/initial', function(req, res) {
  var url_parts = url.parse(req.url, true);
  var code = url_parts.query.code;
  var response = '';

  var post_data = {
    'code': code,
  }
  post_data = JSON.stringify(post_data);

  var request_options = {
    hostname: 'www.bungie.net',
    path: '/Platform/App/GetAccessTokensFromCode/',
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': Buffer.byteLength(post_data)
    }

  }
  var post_req = https.request(request_options, function(tokenRes) {
    tokenRes.setEncoding('utf8');
    tokenRes.on('data', function(chunk) {
      tokens += chunk;
      
    });
    tokenRes.on('end', function() {
      console.log(tokens.Response);
      console.log(tokens);
      if (tokens.ErrorStatus == "Success") {
        var now = Date.getTime();
        var accessTokenExpires = now + tokens.Response.accessToken.expires;
        var refreshTokenExpires = now + tokens.Response.refreshToken.expires;
        accessToken = tokens.Response.accessToken.value;
        refreshToken = tokens.Response.refreshToken.value;
        db.serialize(function() {
          db.run("INSERT INTO token (username, accessToken, refreshToken, accessTokenExpires, refreshTokenExpires) \
          VALUES($username, $accessToken, $refreshToken, $accessTokenExpires, $refreshTokenExpires)", { 
            $username: 'RealAngryMonkey',
            $accessToken: accessToken,
            $refreshToken: refreshToken,
            $accessTokenExpires: accessTokenExpires,
            $refreshTokenExpires: refreshTokenExpires,
            $tokensAdded: now
          });
        });
        res.send("added!");
      }
      else {
        res.send("sigh");
      }
    });
  });

  post_req.write(post_data);
  post_req.end();

});

// http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
https.createServer({
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
}, app).listen(3000, function() {
  db.serialize(function() {
    db.run("CREATE TABLE token (username TEXT, \
      accessToken TEXT, \
      refreshToken TEXT, \
      accessTokenExpires INTEGER, \
      refreshTokenExpires INTEGER\
      tokensAdded INTEGER)");
  });
  
  console.log("Ready on port 3000");
});
