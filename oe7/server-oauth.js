const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const passport = require('passport');
const cors = require('cors');
require("./passportSetup");

dotenv.config();

const app = express();

app.use(
    cookieSession({
        name: "session",
        keys: [process.env.SESSION_SECRET],
        maxAge: 24 * 60 * 60 * 1000,
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use("/auth", require("./authRoutes"));