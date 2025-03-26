// backend/passportSetup.js
const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('./models/Users');
const dotenv = require("dotenv");
const path = require('path');
const fs = require('fs');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
dotenv.config();

passport.use(new LocalStrategy(
  {
    usernameField: 'username', // The field name for username in your login form
    passwordField: 'password'  // The field name for password in your login form
  },
  async function(username, password, done) {
    try {
      // Try to find the user by username (name field in your schema)
      let user = await User.findOne({ name: username });
      
      // If not found by username, try email
      if (!user) {
        user = await User.findOne({ email: username });
      }
      
      // If user not found with either username or email
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      // If user found but it's a Google account without password
      if (user.googleId && !user.password) {
        return done(null, false, { message: 'Please login with Google' });
      }
      
      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      // Success, return the user
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

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