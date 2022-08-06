require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('express');
//const mongoose = require('mongoose');
const SpotifyWebApi = require('spotify-web-api-node');
const crypto = require('crypto');
const buffer = require('buffer');
const passport = require('passport');
const session = require('express-session');
const { access } = require('fs');
const SpotifyStrategy = require('passport-spotify').Strategy;
const app = express();


app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({secret: process.env.SECRET}));
app.use(passport.initialize());
app.use(passport.session());


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
var expires_in = 0;

const spotifyAPI = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
});

passport.use(new SpotifyStrategy(
    { 
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: REDIRECT_URI,
        passReqToCallback: true

    }, function(request, accessToken, refreshToken, expiresIn, profile, done){
        spotifyAPI.setAccessToken(accessToken);
        spotifyAPI.setRefreshToken(refreshToken);
        return done(null, profile);
    }
));

passport.serializeUser(function(user, done){
    return done(null, user);
});

passport.deserializeUser(function(user, done){
    return done(null, user);
});


var toptrack_ids = [];

var audioFeatures = {
    danceability: 0.0,
    valence: 0.0,
    energy: 0.0,
    instrumentalness: 0.0
};


app.use(bodyParser.urlencoded({extended : true}));

var scopes = ['user-read-private', 'ugc-image-upload', 'user-top-read'];
var state = Math.random().toString(36).substring(1, 37);

// const spotifyAPI = new SpotifyWebApi({
//     clientId:CLIENT_ID,
//     clientSecret:CLIENT_SECRET,
//     redirectUri:REDIRECT_URI,
// });

// var authorizeURL = spotifyAPI.createAuthorizeURL(scopes, state);


// ----------------------------------- SPOTIFY WEB API AUTHORIZATION --------------------------------


function isLoggedIn(req, res, next){
    req.user ? next() : res.redirect("/login");
}


app.get('/login', passport.authenticate('spotify', { scope: scopes,
      showDialog: true})

);

app.get('/callback', passport.authenticate('spotify', { successRedirect: '/dashboard', failureRedirect: '/'}));

    // var code = req.query.code;
    // var state = req.query.state;

    // spotifyAPI.authorizationCodeGrant(code).then(function(data){
    //     spotifyAPI.setAccessToken(data.body.access_token);
    //     spotifyAPI.setRefreshToken(data.body.refresh_token);
    //     expires_in = data.body.expires_in;

    //     console.log(spotifyAPI.getAccessToken());

    //     res.redirect('/');

    // }, function(err) {
    //   res.status(err.code);
    //   res.send(err.message);
    // });

//});


function getExtraversion(num){
    if(num >= 0.0 && num <= 0.40){
        return "Introvert";
    } else if (num > 0.40 && num <= 0.75){
        return "Ambivert";
    } else {
        return "Extrovert";
    }
}

function getOutlook(num){
    if (num >= 0.0 && num <= 0.50){
        return "Pessimistic";
    } else {
        return "Optimistic";
    }
}


function getEnergy(num){
    if (num >= 0.0 && num <= 0.50){
        return "Calm";
    } else {
        return "Energetic";
    }
}


function getTaste(num){
    if (num >= 0.0 && num <= 0.50){
        return "Simple";
    } else {
        return "Sophisticated";
    }
}


function getExplanation(str){
    var paragraph = "";
    switch(str){
        case "Extrovert":
            paragraph = "Your music taste indicates that you are a people person!" + 
            "Social gatherings and parties are your favorite places to be." + 
            "One of your greatest strengths is communication, which allows to assume roles of leadership naturally.";
            break;

        case "Introvert":
            paragraph = "Your music taste indicates that you are an introvert!" + 
            " Social gatherings feel draining and you prefer to recharge by yourself." + 
            " You are a great listener and are careful with your words, which are some of your greatest strengths.";
            break;

        case "Ambivert":
            paragraph = "Your music taste indicates that you are an ambivert! " + 
            "While you enjoy social gatherings occasionally, time alone sounds equally as exciting." + 
            " You are able to adapt to different situations  and people, which is one of your greatest strengths.";
            break;

        case "Pessmistic":
            paragraph = "According to your music taste, you tend to believe that there will be negative outcomes for most situations." 
            + " Despite experiencing more negative emotions and constant worries, you are very resilient.";
            break;
        
        case "Optimistic":
            paragraph = "According to your music taste, you have a positive outlook in general! " + 
            "Regardless of whether or not you are self-confident, you are always confident in the fact that things will work out.";
            break;
        
        case "Calm":
            paragraph = "You have a calm, laid-back personality! You tend thrive more in cooperative, uplifting environments instead of competitive environments. " + 
            "Patience and creativity are your greatest strengths!";
            break;

        case "Energetic":
            paragraph = "You are enthusiastic and thrive even under high stress. " + 
            "You are deadline driven and will continue to push yourself until you meet your goals. " + 
            "You are self-motivated and very organized, which are some of your greatest strengths!";
            break;
        
        case "Simple":
            paragraph = "Your music taste indicates that you enjoy a broad range of music. " + 
            "You are not difficult to please and are quite adventurous.";
            break;

        case "Sophisticated":
            paragraph = "Your music taste indicates that you have specific music preferences. " + 
            "You are very particular on how you want certain things to be done and have a great attention to detail.";
            break;
    }

    return paragraph;
}

    

app.get('/dashboard', isLoggedIn, function(req, res){

    spotifyAPI.getMyTopTracks().then(function(data) {

        data.body.items.forEach(getTopTracks);
        var tracks_length = (toptrack_ids.length).toFixed(2);
        
        spotifyAPI.getAudioFeaturesForTracks(toptrack_ids).then(function(data){

            var danceability = data.body.audio_features.map(a => a.danceability);
            var energy = data.body.audio_features.map(a => a.energy);
            var valence = data.body.audio_features.map(a => a.valence);
            var instrumentalness = data.body.audio_features.map(a => a.instrumentalness);

            var d = danceability.reduce((a, b) => a + b, 0) / toptrack_ids.length;
            var e = energy.reduce((a, b) => a + b, 0) / toptrack_ids.length;
            var v = valence.reduce((a, b) => a + b, 0) / toptrack_ids.length;
            var i = instrumentalness.reduce((a, b) => a + b, 0) / toptrack_ids.length;

            var extraversion = getExtraversion(d);
            var energyTrait = getEnergy(e);
            var outlook = getOutlook(v);
            var taste = getTaste(i);

            var trait1exp = getExplanation(extraversion);
            var trait2exp = getExplanation(outlook);
            var trait3exp = getExplanation(energyTrait);
            var trait4exp = getExplanation(taste);


            spotifyAPI.getMe().then(function(data){
                var name = data.body.display_name;

                var picUrl = "";

                if(data.body.images.at(0) === undefined){
                    picUrl = "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/271deea8-e28c-41a3-aaf5-2913f5f48be6/de7834s-6515bd40-8b2c-4dc6-a843-5ac1a95a8b55.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzI3MWRlZWE4LWUyOGMtNDFhMy1hYWY1LTI5MTNmNWY0OGJlNlwvZGU3ODM0cy02NTE1YmQ0MC04YjJjLTRkYzYtYTg0My01YWMxYTk1YThiNTUuanBnIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.BopkDn1ptIwbmcKHdAOlYHyAOOACXW0Zfgbs0-6BY-E";
                } else picUrl = data.body.images.at(0).url;


                res.render('dashboard.ejs', {
                    url: picUrl,
                    username: name,
                    trait1: extraversion,
                    expl1: trait1exp, 
                    trait2: outlook,
                    expl2: trait2exp,
                    trait3: energyTrait,
                    expl3: trait3exp,
                    trait4: taste,
                    expl4: trait4exp,
                });

            }, function(err){
                console.log("Something went wrong!", err);
            });


           


        }, function(err){
            console.log('Something went wrong!', err);
        });

    }, function(err) {
        console.log('Something went wrong!', err);
    });


});


function getTopTracks(item){
    toptrack_ids.push(item.id);
}


// ----------------------------------- ROUTE HANDLING FRONT-END -----------------------------------


app.get("/signout", function(req, res, next){
    req.logout(function(err){
        if(err) {return next(err);}
        res.redirect("/");
    });
    
});

app.get("/", function(req, res){
    res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.get("/about", function(req, res){
    res.sendFile(path.join(__dirname + "/public/about.html"));
})


app.listen(3000, function(){
    console.log("Server started on Port 3000!");
});


