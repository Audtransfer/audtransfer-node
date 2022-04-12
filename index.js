//Running Port
const PORT = 5000;

//Imports/Requires
const express = require('express');
const request = require('request');
const cors = require('cors');
const cookieParser = require('cookie-parser');

//Setup APP
var app = express();
app.use(express.static(__dirname))
	.use(cors())
	.use(cookieParser());

//Importants Vars
const frontEnd = "http://localhost:3000/"
	
// ----- SPOTIFY ENDPOINTS -----
const spotifyAuthEndpoint = "https://accounts.spotify.com/authorize?";
var stateKey = 'spotify_auth_state';
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

	for(var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};
	
//variáveis de ambiente spotify
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

app.get("/loginSpotify", (req, res) => {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  res.redirect(spotifyAuthEndpoint +
		"response_type=code" +
		"&client_id=" + client_id +
    "&scope=" + scopes +
    "&redirect_uri=" + redirect_uri +
    "&state=" + state
  );
})

app.get("/spotifyCallback", (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect("/#error=state_mismatch");
  } 
	else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
      json: true
    };

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token;
        var refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, (error, response, body) => { console.log(body.id) });

				res.redirect(`${frontEnd}spotify#access_token=${access_token}&refresh_token=${refresh_token}`);
      } 
			else { res.redirect(`${frontEnd}spotify#invalid_token`) }
    });
  }
})

// ----- DEEZER ENDPOINTS -----

//variáveis de ambiente deezer
const deezer_id = process.env.DEEZER_APP_ID;
const deezer_secret = process.env.DEEZER_APP_SECRET;
const deezer_redirect = process.env.DEEZER_APP_REDIRECT;

//permissões do Deezer necessárias TODO
const deezer_perms = [
  "basic_access",
  "manage_library",
  //"email",
  //"offline_access",
  //"manage_community",
  //"delete_library",
  //"listening_history",
].join(",");

//Deezer endpoint common
const deezerEndpoint = "https://connect.deezer.com/oauth/";

//etapa 1 da autenticação
app.get("/loginDeezer", (req, res) => {
	res.redirect(`${deezerEndpoint}auth.php?app_id=${deezer_id}&redirect_uri=${deezer_redirect}&perms=${deezer_perms}`);
});

//etapa 2 da autenticação
app.get("/deezerCallback", (req, res) => {
  // //req.query.code é o código retornado pelo Deezer ao bater no endpoint anterior
  var callbackCode = `${deezerEndpoint}access_token.php?app_id=${deezer_id}&secret=${deezer_secret}&code=${req.query.code}&output=json`;
	
	// Retorna o token para Front-End
	request.get(callbackCode, (error, response, body) =>{
		if(error || response.statusCode !== 200) return
		var bodyJson = JSON.parse(body);
		res.redirect("http://localhost:3000/deezer#" + bodyJson.access_token)
	})
});

//Setup, SHOUlD ALWAYS be last
app.listen(PORT, () => console.log(`Listening on ${PORT}`));