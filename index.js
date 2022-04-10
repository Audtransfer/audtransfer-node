const PORT = 5000;

const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

//variáveis de ambiente
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const dzr_id = process.env.DZR_ID;
const dzr_secret = process.env.DZR_SECRET;
const dzr_redirect = process.env.DZR_REDIRECT;

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

//permissões do Deezer necessárias
const dzr_perms = [
  "basic_access",
  //"email",
  //"offline_access",
  "manage_library",
  //"manage_community",
  //"delete_library",
  //"listening_history",
].join(",");

var app = express();
app.use(express.static(__dirname))
  .use(cors())
  .use(cookieParser());

// ----- Spotify Endpoints -----

app.get("/loginSpotify", (req, res) => {
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

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, function (error, response, body) {
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

// ----- Deezer Endpoints -----

app.get("/deezerPlaceholder", (req, res) => {
  res.json("Endpoint placeholder"); //response http
});

app.get("/loginDeezer", (req, res) => {
  //etapa 1 da autenticação
  var urlAskPerms = `https://connect.deezer.com/oauth/auth.php?app_id=${dzr_id}&redirect_uri=${dzr_redirect}&perms=${dzr_perms}`;
  res.redirect(urlAskPerms);
});

app.get("/deezerCallback", (req, res) => {
  //etapa 2 da autenticação
  var urlAccessToken = `https://connect.deezer.com/oauth/access_token.php?app_id=${dzr_id}&secret=${dzr_secret}&code=${req.query.code}&output=json`;
  //req.query.code é o código retornado pelo Deezer ao bater no endpoint anterior

  request.get(urlAccessToken, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      //console.log(error.ToString())
      return;
    }
    var bodyJson = JSON.parse(body);
    res.redirect(`/deezerPlaceholder#${bodyJson.access_token}`); //node retorna o token para cliente
  });
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));