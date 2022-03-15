const PORT = 5000;

const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = process.env.CLIENT_ID || "";
const client_secret = process.env.CLIENT_SECRET || "";
const redirect_uri = process.env.REDIRECT_URI || "";

const spotifyAuthEndpoint = "https://accounts.spotify.com/authorize?";
const scopes = [
	"user-read-private",
	"user-read-email",
	"user-library-read",
	"playlist-read-collaborative",
	"playlist-read-private",
	"playlist-modify-private",
	"playlist-modify-public",
].join("%20");

const generateRandomString = (length) => {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();
app.use(express.static(__dirname))
   .use(cors())
   .use(cookieParser());

app.get("/loginSpotify", (req,res) => {
	var state = generateRandomString(16);
  res.cookie(stateKey, state);

	res.redirect(spotifyAuthEndpoint + querystring.stringify({
		response_type: 'code',
		client_id: client_id,
		scope: scopes,
		redirect_uri: redirect_uri,
		state: state
	}));
})

app.get("/spotifyCallback", (req, res) => {
	var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
				
        request.get(options, function(error, response, body) {
          console.log(body.id);
        });
				
        res.redirect('http://localhost:3000/spotify#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('http://localhost:3000/spotify#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
})

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));