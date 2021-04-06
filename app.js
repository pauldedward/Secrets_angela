//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const bcrypt = require("bcrypt");
const saltRounds = 10;

 const { Schema } = mongoose;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use( bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true} );



const userScema = new Schema({
    email: String,
    password: String
});

const User = new mongoose.model("User", userScema);

app.get("/", function(req, res) {
    res.render("home");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/register", function(req, res) {

    bcrypt.hash(req.body.password, saltRounds, function(error, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });

        newUser.save(function(err) {
            if(!err) {
                res.render("secrets");
            } else {
                console.log(err);
            }
        });
    });

});

app.post("/login", function(req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser) {
        if(!err) {
            if(foundUser) {
                bcrypt.compare(password, foundUser.password, function(error, result) {
                    if(result === true) {
                        res.render("secrets");
                    } else {
                        console.log("wrong password");
                        res.render("login");
                    }
                });

            } else {
                console.log("no user");
                res.render("login");
            }
        } else {
            console.log("cant log");
        }
    });
});





app.listen("3000", function() {
        console.log("up and running in 3000");
})
