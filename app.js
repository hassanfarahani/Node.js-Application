const express = require('express');

// importing Mongoose database
const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const flash = require('connect-flash');

const session = require('express-session');

const passport = require('passport');

const { ensureAuthenticated } = require('./config/auth');

const app = express();

//passport config
require('./config/passport')(passport);

// DataBase config
const db = require('./config/keys').MongoURI;

// Connect to the Database (Mongoose)
mongoose.connect(db, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log('MongoDB Connected ...!'))
    .catch(err => console.log(err))

// bodyParser middleware to handle the passing of our POST data to the req object
app.use(express.urlencoded({ extended: false }));

// Express session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
})

// Set up template engine
app.set('view engine', 'ejs');

// Serving Static files
app.use(express.static('./public'));

// User model
const User = require('./models/User');

// login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Welcome page
app.get('/', (req, res) => {
    res.render('dashboard');
})

// register page
app.get('/register', (req, res) => {
    res.render('register');
});

// profile page
app.get('/profile', ensureAuthenticated, (req, res) => {
    // console.log(req.user);
    res.render('profile', { user: req.user });
});

// Posting the register form data to the database
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    let errors = [];

    // Check required form fields
    if (!name || !email || !password) {
        errors.push({ msg: 'Please fill in all fields'})
    }   

    // if there is an error in the registeration form
    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            password
        })
    } else {
        // no error in the registeration form
        User.findOne({ email: email })
            .then(user => {
                // console.log(user);
                if (user) {
                    errors.push({ msg: 'Email is already registered'});
                    res.render('register', {
                        errors,
                        name,
                        email,
                        password
                    })
                } else {
                    const newUser = new User({
                        name,
                        email,
                        password
                    });
                    // Hash password
                    bcrypt.genSalt(10, (err, salt) =>
                      bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        // set password to hashed
                        newUser.password = hash;
                        // save user
                        newUser.save()
                            .then(user => {
                                // Creating a flash message
                                req.flash('success_msg', 'You are now registered and can log in!');
                                res.redirect('/login');
                            })
                            .catch(err => console.log(err))
                    }))
                }
            })
    }
});

// login handle using passport.js file
app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
})

// Load Update form
app.get('/update/:id', (req, res) => {
    User.findById(req.params.id, (err, user) => {
        res.render('update', { user });
        console.log(user)
    })
})

// Update the form
app.post('/update/:id', (req, res) => {
    let user = {};
    console.log(req.body);
    user.name = req.body.name;
    user.email = req.body.email;
    let query = { _id: req.params.id };
    User.update(query, user, (err) => {
        if (err) {
            console.log(err);
            return;
        } else {
            res.redirect('/profile');
        }
    })
})

//Logout handle
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are successfully logged out!');
    res.redirect('/login');
})

// Catch our 404s
app.use(function(req, res, next) {
    res.status(404);
    res.send('404: File Not Found');
});

app.listen(3000);

console.log(`Server started on port 3000`);






// app.use() acts as a middleware in express apps. Unlike app.get() and app.post() or so, 
// you actually can use app.use() without specifying the request URL. In such a case what it does is,
// it gets executed every time no matter what URL's been hit.
// Each app.use(middleware) is called every time a request is sent to the server.

// app.use([path],callback,[callback]) : we can add a callback on the same.

// app.use('/test', function(req, res, next) {
//   // write your callback code here.
//     });


// The flash is a special area of the session used for storing messages. 
// Messages are written to the flash and cleared after being displayed to the user. 
// The flash is typically used in combination with redirects, ensuring that the message is available to the next page that is to be rendered.
// With the flash middleware in place, all requests will have a req.flash() function that can be used for flash messages.