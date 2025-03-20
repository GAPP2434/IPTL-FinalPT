const express = require('express');
const passport = require('passport');

const router = express.Router();

router.get("/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

router.get("/google/callback",
    passport.authenticate("google", {
        successRedirect: "http://localhost:3000/dashboard",
        failureRedirect: "http://localhost:3000/login",
    })
);

router.get("/logout", (req, res) => {
    req.logout();
    res.redirect("http://localhost:3000");
});

router.get("/user", (req, res) => {
    res.send(req.user || null);
});

module.exports = router;