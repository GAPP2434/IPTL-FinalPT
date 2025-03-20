// backend/passportSetup.js
const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('./models/Users');
const dotenv = require("dotenv");
const path = require('path');
const fs = require('fs');

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback" // Adjusted to match your API routes
  },
  async function(accessToken, refreshToken, profile, done) {
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
        // Generate random avatar like you do in the register route
        const avatarsDir = path.join(__dirname, '../frontend/avatars');
        const avatarFiles = fs.readdirSync(avatarsDir).filter(file => file.startsWith('Avatar_'));
        const randomAvatar = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
        
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : `avatars/${randomAvatar}`
        });
      }

    done(null, user);
  }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});