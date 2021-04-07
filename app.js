//jshint esversion:6
require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;



 const { Schema } = mongoose;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use( bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-user:"+process.env.PASSWORD+"@cluster0.hyqg9.mongodb.net/UserDB?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true} );

mongoose.set("useCreateIndex", true);

const userScema = new Schema({
    email: String,
    password: String,
    googleId: String,
    secret: [String]
});

userScema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userScema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-by-edward.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOne( {googleId : profile.id}, function( err, foundUser ){
      if( !err ){                                                          //Check for any errors
          if( foundUser ){                                          // Check for if we found any users
              return cb( null, foundUser );                  //Will return the foundUser
          }else {                                                        //Create a new User
              const newUser = new User({
                  googleId : profile.id,
                  username: profile.displayName
              });
              newUser.save( function( err ){
                  if(!err){
                      return cb(null, newUser);                //return newUser
                  }
              });
          }
      }else{
          console.log( err );
      }
  });
  }
));

app.get("/", function(req, res) {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

 app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
});


app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/secrets", function(req, res) {
    User.find({"secret":{$ne:null}}, function(err, foundUsers) {
        if(!err) {
            if(foundUsers) {
                res.render("secrets",{usersWithSecrets:foundUsers});
            }
        } else {
            console.log(err);
        }
    });
});
app.get("/submit", function(req, res) {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    User.findById(req.user._id, function(err, foundUser) {
        if(!err) {
            if(foundUser) {
                foundUser.secret.push(submittedSecret);
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        } else {
            console.log(err);
        }
    });

});

app.post("/register", function(req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if(!err) {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        } else {
            console.log(err);
            res.redirect("/login");
        }
    });
});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if(!err) {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        } else {
            console.log(err);
        }
    })
});





app.listen(process.env.PORT||"3000", function() {
        console.log("up and running in 3000");
})
