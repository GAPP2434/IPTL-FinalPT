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
  callbackURL: "/api/auth/google/callback"
},
async function(accessToken, refreshToken, profile, done) {
  try {
    // First check if user exists by googleId
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      // If no user with this googleId, check if user exists with the same email
      const email = profile.emails[0].value;
      const existingUser = await User.findOne({ email: email });
      
      if (existingUser) {
        // User exists with this email but doesn't have googleId - update the user
        existingUser.googleId = profile.id;
        // Update profile picture if needed
        if (profile.photos && profile.photos[0]) {
          existingUser.profilePicture = profile.photos[0].value;
        }
        user = await existingUser.save();
      } else {
        // No user with this email - create new user
        const avatarsDir = path.join(__dirname, '../frontend/avatars');
        const avatarFiles = fs.readdirSync(avatarsDir).filter(file => file.startsWith('Avatar_'));
        const randomAvatar = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
        
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : `avatars/${randomAvatar}`
        });
      }
    }
    
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});