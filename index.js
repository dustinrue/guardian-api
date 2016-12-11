'use strict';

// https://www.bungie.net/en/Help/Article/45481
var urlParser = require('url');
var https = require('https');
var timestamp = require('unix-timestamp');

var guardianApi = (function() {
  var accessToken, 
    refreshToken, 
    accessTokenExpires, 
    refreshTokenExpires,
    apiKey,
    appId,
    newTokenCallback;

  var postRequest = function(url, post_data, callback) {
    var responseData = ''; 

    var request_options = {
      hostname: 'www.bungie.net',
      path: url,
      method: 'POST',
      headers: {
        'X-API-Key': guardianApi.apiKey,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': Buffer.byteLength(post_data)
      }
    }

    if (typeof(guardianApi.accessToken) !== "undefined") {
      request_options.headers.Authorization = "Bearer " + guardianApi.accessToken;
    }

    var post_req = https.request(request_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        responseData += chunk;
      });
      res.on('end', function() {
        responseData = JSON.parse(responseData);
        callback(responseData);
      });
    });

    post_req.write(post_data);
    post_req.end();
  };

  var getRequest = function(url, callback) {
    var responseData = ''; 

    var request_options = {
      hostname: 'www.bungie.net',
      path: url,
      method: 'GET',
      headers: {
        'X-API-Key': guardianApi.apiKey,
        'Content-Type': 'application/json; charset=UTF-8',
      }
    }

    if (typeof(guardianApi.accessToken) !== "undefined") {
      request_options.headers.Authorization = "Bearer " + guardianApi.accessToken;
    }

    var get_req = https.request(request_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        responseData += chunk;
      });
      res.on('end', function() {
        responseData = JSON.parse(responseData);
        callback(responseData);
      });
    });

    get_req.end();
  };

  var setAccessToken = function(accessToken) {
    this.accessToken = accessToken;
  };

  var setRefreshToken = function(refreshToken) {
    this.refreshToken = refreshToken;
  };

  var setAccessTokenExpires = function(accessTokenExpires) {
    this.accessTokenExpires = accessTokenExpires;
  };

  var refreshTokens = function(callback) {

    if (typeof(guardianApi.refreshToken) == "undefined") {
      callback({})
    }
    else {
      var post_data = {
        'refreshToken': guardianApi.refreshToken,
      }

      post_data = JSON.stringify(post_data);

      postRequest('/Platform/App/GetAccessTokensFromRefreshToken/', post_data, function(responseData) {
        
        if (responseData.ErrorStatus == "Success") {
          var now = timestamp.now();

          guardianApi.accessTokenExpires = now + responseData.Response.accessToken.expires;
          guardianApi.refreshTokenExpires = now + responseData.Response.refreshToken.expires;
          guardianApi.accessToken = responseData.Response.accessToken.value;
          guardianApi.refreshToken = responseData.Response.refreshToken.value;

          var tokenData = {
            'accessToken': guardianApi.accessToken,
            'accessTokenExpires': guardianApi.accessTokenExpires,
            'refreshToken': guardianApi.refreshToken,
            'refreshTokenExpires': guardianApi.refreshTokenExpires
          }
          guardianApi.newTokenCallback(tokenData);
          callback(tokenData);
        }
        else {
          console.log(responseData);
          callback({});
        }
      });
    }
  };

  return {
    setApiKey: function(apiKey) {
      this.apiKey = apiKey;
    },

    setAppID: function(appId) {
      this.appId = appId;
    },

    authorize: function(res, state) {
      if (typeof(state) != "undefined" && state != "") {
        res.redirect(302, "https://www.bungie.net/en/Application/Authorize/" + this.appId + "?state=" + state);
      }
      else {
        res.redirect(302, "https://www.bungie.net/en/Application/Authorize/" + this.appId);
      }
      
    },

    setTokenData: function(tokenData) {
      console.log(tokenData);
    },

    setNewTokenCallback: function(callback) {
      this.newTokenCallback = callback;
      this.newTokenCallback({});
    },

    parseCode: function(url, state, callback) {
      var url_parts = urlParser.parse(url, true);
      var code = url_parts.query.code;
      var response = '';

      var post_data = {
        'code': code,
      }

      post_data = JSON.stringify(post_data);

      postRequest('/Platform/App/GetAccessTokensFromCode/', post_data, function(responseData) {
        if (responseData.ErrorStatus == "Success") {
          var now = timestamp.now();

          guardianApi.accessTokenExpires = now + responseData.Response.accessToken.expires;
          guardianApi.refreshTokenExpires = now + responseData.Response.refreshToken.expires;
          guardianApi.accessToken = responseData.Response.accessToken.value;
          guardianApi.refreshToken = responseData.Response.refreshToken.value;

          var tokenData = {
            'accessToken': guardianApi.accessToken,
            'accessTokenExpires': guardianApi.accessTokenExpires,
            'refreshToken': guardianApi.refreshToken,
            'refreshTokenExpires': guardianApi.refreshTokenExpires
          }
          guardianApi.newTokenCallback(tokenData);
          callback(tokenData);
        }
        else {
          callback({});
        }
      });
    },

    refresh: refreshTokens,

    isAuthorized: function() {
      return (typeof(guardianApi.accessToken) !== "undefined");
    },

    getBungieNetUser: function(callback) {
      getRequest('/Platform/User/GetBungieNetUser/', function(responseData) {
        callback(responseData);
      });
    }
  }
})();

var parseCode = function(url, callback) {
  
}

module.exports = guardianApi; 