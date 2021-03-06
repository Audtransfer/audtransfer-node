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
const scopes = [
	"user-read-private",
	"user-read-email",
	"user-library-read",
	"playlist-read-collaborative",
	"playlist-read-private",
	"playlist-modify-private",
	"playlist-modify-public",
].join("%20");

//variáveis de ambiente spotify
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

app.get("/loginSpotify", (req, res) => {
	res.redirect(spotifyAuthEndpoint +
		"response_type=code" +
		"&client_id=" + client_id +
    "&scope=" + scopes +
    "&redirect_uri=" + redirect_uri
  );
})

app.get("/spotifyCallback", (req, res) => {
  var code = req.query.code || null;
	
	var authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		form: {
			code: code,
			redirect_uri: redirect_uri,
			grant_type: 'authorization_code'
		},
		headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')) },
		json: true
	};
	
	request.post(authOptions, (error, response, body) => {
		res.redirect(`${frontEnd}spotify#access_token=${body.access_token}`);
	});
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
  "email"
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
		res.redirect("http://localhost:3000/deezer#access_token=" + bodyJson.access_token)
	})
});

// DEEZER BACK-END
const deezerApi = "https://api.deezer.com"

app.get("/deezerUser", (req, res) => {
	let userEndpoint = `${deezerApi}/user/me?output=json&access_token=${req.query.access}`
	request.get(userEndpoint, (error, response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body));
	})
})

app.get("/deezerPlaylist", (req, res) => {
	let userEndpoint = `${deezerApi}/user/${req.query.id}/playlists?output=json&access_token=${req.query.access}`
	request.get(userEndpoint, (error, response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body));
	})
})

app.get("/deezerAnyPlaylist", (req, res) => {
	const getPlaylistEndPoint = `${deezerApi}/playlist`;
	request.get(`${getPlaylistEndPoint}/${req.query.id}`, (error, response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body));
	})
})

app.get("/deezerCreatePlaylist", (req,res) => {
	let createUrl = `${deezerApi}/user/${req.query.id}/playlists?output=json&access_token=${req.query.access}&title=${req.query.title}`;

	request.post(createUrl, (error, response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body));
	})
})

app.get("/deezerSearchTrack", (req,res) => {
	let searchUrl = `${deezerApi}/search?q=artist:"${req.query.artist}"track:"${req.query.track}"`

	request.get(searchUrl, (error, response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body));
	})
})

app.get("/deezerAddTrack", (req, res) => {
	let addUrl = `${deezerApi}/playlist/${req.query.id}/tracks?output=json&access_token=${req.query.access}&songs=${req.query.trackId}`;

	request.post(addUrl, (error,response, body) => {
		if(error || response.statusCode !== 200) return
		res.json(JSON.parse(body))
	})
})

// ----- YOUTUBE MUSIC ENDPOINTS -----

//variáveis de ambiente Youtube Music
const youtube_id = process.env.YOUTUBE_CLIENT_ID;
//const youtube_secret = process.env.YOUTUBE_CLIENT_SECRET; //aparentemente não é necessário para obter access_token
const youtube_redirect = process.env.YOUTUBE_REDIRECT_URI;

//permissões do Youtube necessárias TODO
const youtubeAuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth?";

app.get("/loginYoutube", (req, res) => {

  res.redirect(youtubeAuthEndpoint +
		"scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutubepartner" +
		"&include_granted_scopes=true" +
    "&redirect_uri=" + youtube_redirect +
    "&response_type=token" +
    "&client_id=" + youtube_id
  );
});

//Setup, SHOUlD ALWAYS be last
app.listen(PORT, () => console.log(`Listening on ${PORT}`));