const express = require('express');
const app = express ();
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require("mongoose");
const passport = require('passport');
const localStrategy = require('passport-local');
//var auth = require('passport-local-authenticate');
const session = require('express-session');
const exphbs = require('express-handlebars');
const messagebird = require('messagebird')('thsMs0oPRrJbNEbwegMHgnFPp');
const flash = require('connect-flash');
const User = require('./models/user');
var nodemailer = require('nodemailer');
var bodyParser = require("body-parser");
const Notice = require("./models/Notices");
const Event = require("./models/Events");
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const server = http.createServer(app);
const io = socketio(server);

const botName = 'ChatBox';

mongoose.connect('mongodb+srv://mnarora:Pass@1234@cluster0.xdwit.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',{
    useNewUrlParser : true,
    useCreateIndex: true,
    useUnifiedTopology:true,
})

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine("ejs", ejsMate);
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(__dirname + '/staticfiles'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({extended:true}));

app.use(require("express-session")({
	secret: "Rusty is the best and cutest dog in the world",
	resave:false,
	saveUninitialized: false
}))

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
mongoose.set('useFindAndModify', false);
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.static(__dirname + '/staticfiles'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    if(req.user) {
        firstname = req.user.firstname;
        collegename= req.user.collegename;
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }    
    next();
}


// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room);
  
      socket.join(user.room);
  
      // Welcome current user
      socket.emit('message', formatMessage(botName, 'Welcome to ChatBox!'));
  
      // Broadcast when a user connects
      socket.broadcast
        .to(user.room)
        .emit(
          'message',
          formatMessage(botName, `${user.username} has joined the chat`)
        );
  
      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    });
  
    // Listen for chatMessage
    socket.on('chatMessage', msg => {
      const user = getCurrentUser(socket.id);
  
      io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
  
    // Runs when client disconnects
    socket.on('disconnect', () => {
      const user = userLeave(socket.id);
  
      if (user) {
        io.to(user.room).emit(
          'message',
          formatMessage(botName, `${user.username} has left the chat`)
        );
  
        // Send users and room info
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  });
  
  
  
  var PORT =  3000;

app.get("/home", isLoggedIn, async (req, res) => {
    const member = await User.findById(req.user._id);
    if (!member.isstudent) {
        req.flash("error", "Bad Request");
        return res.redirect('/');
    }
    var users = await User.find({});
    var alumnicount = 0, batchmates = 0, userinlocation = 0;
    for (let field of users) {
        if (!field.collegename)
            alumnicount++;
    }
    var users = await User.find({'acollegename': req.user.acollegename});
    batchmates = users.length;

    var users = await User.find({'currentlocation': req.user.currentlocation});
    userinlocation = users.length;
    var college = await User.find({collegename : req.user.acollegename}).populate('Events').populate('Notices');
    res.render('home.ejs', {alumnicount, batchmates, userinlocation, college});
})

app.get("/", async (req, res) => {
    if (req.user) {
        if (req.user.collegename) {
            return res.redirect('/college');
        }
        else {
            return res.redirect('/home');
        }
    }
    var users = await User.find({});
    var collegecount = 0, alumnicount = 0;
    for (let field of users) {
        if (field.collegename)
            collegecount++;
        else
            alumnicount++;
    }
    var events = await Event.find({}).sort('EventDate').exec(function(err, docs) { });
    res.render('landing_page.ejs', {collegecount, alumnicount});
})

app.get("/profile", isLoggedIn, async (req, res) => {
    const alumni = await User.findById(req.user._id);
    var alumnilogin = false, collegelogin = false, editprofile = true, profile=false;
    if (req.user.collegename)
        collegelogin = true;
    else
        alumnilogin=true;
    res.render('profile', {alumni, collegelogin, alumnilogin, editprofile, profile});
})

app.get('/verifyprofile/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const alumni = await User.findById(id);
    var alumnilogin = false, profile = true, collegelogin = false, editprofile = false;
    alumnilogin=true;

    res.render('profile', {alumni, collegelogin, alumnilogin, profile, editprofile});
})

app.get('/verifyaccount/:id', isLoggedIn, async (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'wethestockedpantry@gmail.com',
          pass: 'Thestockedpantry@1234'
        }
      });
      var alumni = await User.findById(req.params.id);
      var mailOptions = {
        from: 'wethestockedpantry@gmail.com',
        to: alumni.email,
        subject: 'Regarding Account Verification',
        text: `\nCongratulations Your account was verified as alumnus of ${req.user.collegename}.\nNow you can enjoy full range of services on the Portal.\n\nRegards,${req.user.collegename}\n${req.user.clocation}\n`
      };
      
      await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    const { id } = req.params;
    await User.findOneAndUpdate({"_id":id}, { "verified": true} );
    return res.redirect('/college');
})

app.get('/alumniprofile/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const alumni = await User.findById(id);
    var profile = false, collegelogin = false, alumnilogin=true, editprofile=false;
    res.render('profile', {alumni, collegelogin, alumnilogin, profile, editprofile});
})

app.get("/college", isLoggedIn, async (req, res) => {
    const member = await User.findById(req.user._id);
    if (member.isstudent) {
        req.flash("error", "Bad Request");
        backURL=req.header('Referer') || '/';
        return res.redirect(backURL);
    }
    if(req.user) {
        const college = await User.findById(req.user._id).populate('Events').populate('Notices');
        const allusers = await User.find({"acollegename":req.user.collegename});
        var verified = [], notverified = [];
        for (let alumni in allusers) {
            if (allusers[alumni].isstudent) {
                if (allusers[alumni].verified) {
                    verified.push(allusers[alumni]);
                }
                else {
                    notverified.push(allusers[alumni]);
                }
            }
        }
        res.render('college.ejs', {College : college, verified, notverified});
    }
    else {
        console.log("no id");
    }
})



app.get("/editprofile", isLoggedIn, async (req, res) => {
    const alumni = await User.findById(req.user._id);
    var alumnilogin = false, collegelogin = false;
    if (req.user.collegename)
        collegelogin = true;
    else
        alumnilogin=true;
    res.render('editprofile.ejs', {alumni, collegelogin, alumnilogin});
})

app.post('/editprofile', isLoggedIn, async (req, res) => {
    if (!req.body.password.length) {
        delete req.body.password;
    }
    else {
        req.user.setPassword(req.body.password, function() {
            req.user.save();
        })
    }
    var alumni = await User.findOneAndUpdate({"_id":req.user._id}, req.body);
    alumni = await User.findOne({"_id":req.user._id});
    req.flash("success", "Profile edited Successfully");
    return res.redirect("/profile");
})

app.get('/deleteaccount', isLoggedIn, async (req, res) => {
    if (req.user.collegename) {
        const colleges = await User.deleteMany({"acollegename":req.user.collegename});
        const user = await User.findOneAndDelete({"_id": req.user._id});
    }
    else {
        const user = await User.findOneAndDelete({"_id": req.user._id});
    }
    req.flash('success', 'Account Deleted');
    return res.redirect("/");
})

app.get('/invaliduser/:id', isLoggedIn, async (req, res) => {
    const {id} = req.params;
    await User.deleteOne({"_id": id});
    return res.redirect("/college");
})

app.get("/login", (req, res) => {
    if (req.user) {
        if (req.user.collegename)
            return res.redirect('/college');
        else
            return res.redirect('/home')
    }
    res.render('login');
})

app.get('/alumniregister', async (req, res) => {
    if (req.user) {
        if (req.user.collegename)
            return res.redirect('/college');
        else
            return res.redirect('/home')
    }
    var users = await User.find({});
    var allusers = [];
    for (let college of users) {
        if (college.collegename)
            allusers.push(college);
    }
    res.render('alumniregister.ejs', {allusers});
})

app.get('/collegeregister', (req, res) => {
    if (req.user) {
        if (req.user.collegename)
            return res.redirect('/college');
        else
            return res.redirect('/home')
    }
    res.render('collegeregister');
})
app.get("/contact-us", (req, res) => {
    res.render('contact-us.ejs');
})

app.get("/about-us", (req, res) => {
    res.render('about-us.ejs');
})

// app.post("/login", passport.authenticate("local",{
// 	successRedirect: "/home",
// 	failureRedirect: "/"
// 	}),function(req,res){
// })



app.post("/collegeNotice", isLoggedIn, async (req,res) => {
    if(req.user) {
        // console.log(req.body)
        const college = await User.findById(req.user._id);
        const notice = new Notice(req.body)
        college.Notices.push(notice);
        await notice.save();
        await college.save();   
        res.redirect("/college");
    }
    else {
        console.log("no id")
    }
})

app.get("/deletenotice/:id", isLoggedIn, async (req,res) => {
    const { id } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { Events: id } });
    await Notice.findByIdAndDelete(id);
    return res.redirect('/college');
})

app.get("/deleteevent/:id", isLoggedIn, async (req,res) => {
    const { id } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { Notices: id } });
    await Event.findByIdAndDelete(id);
    return res.redirect('/college');
})

app.post("/collegeEvent", async (req,res) => {
    if(req.user) {
        // console.log(req.body)
        const college = await User.findById(req.user._id);
        const event = new Event(req.body)
        college.Events.push(event);
        await event.save();
        await college.save();
        res.redirect("/college");
    }
    else {
        console.log("no id")
    }
})


app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: 'login' }), async (req, res) => {
    var df = '';
    const user = await User.find({'username' : req.body.username},'name skill', function(err,docs){
        if (err) {
            req.flash('error', err.message);
            console.log('error occured in the database');
        }
        df = docs;
    });

    console.log('df ' + df);
    temp = await User.findById(df).exec();
    console.log(temp);
    console.log(temp.ccontact);
    
    if (temp.isstudent) {
        req.flash('success', 'welcome back!');
        return res.redirect('/home');
    }
    else {
        req.flash('success', 'welcome back!');
        return res.redirect('/college');
    }
    
    //console.log(temp.password);
    

})

app.post("/register", async (req, res) => {
    var { collegename } = req.body;
    if (collegename) {
        var {collegeemail, cpass1, cpass2, ccontact, clocation, cpass1, cpass2} = req.body;
        var username = collegeemail;
        var password = cpass1;
        var isstudent = false;
        const user = new User({ collegeemail, collegename, ccontact, clocation, username, isstudent });
        const registeredUser = await User.register(user, password, 
            function(err, user) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect("/collegeregister");
                }
                req.flash('success', "Successfully Registered!!!!");
                return res.redirect("/login");
        });
    }
    else {
        var {firstname, lastname, currentworking, email, contact, currentlocation, acollegename, yearofpassing, degree, branch, pass1, pass2, gender} = req.body;
        var username = email;
        var password = pass1;
        var verified = false;
        var isstudent = true;
        const user = new User({ firstname, lastname, currentworking, email, contact, currentlocation, acollegename, yearofpassing, degree, branch, username, verified, isstudent, gender });
        const registeredUser = await User.register(user, password, 
            function(err, user) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect("/alumniregister");
                }

            req.flash('success', "Successfully Registered!!!!");
            return res.redirect("/login");
                });

    }
    
})

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', "Goodbye!");
    res.redirect('/');
})

app.post('/sendmessage/:id', async (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'wethestockedpantry@gmail.com',
          pass: 'Thestockedpantry@1234'
        }
      });

      var mailOptions = {
        from: 'wethestockedpantry@gmail.com',
        to: 'mnarora2000@gmail.com',
        subject: 'Query regarding alumniportal',
        text: `From - ${req.body.name}\nEmail - ${req.body.email}\n${req.body.message}`
      };
      
      await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
      res.redirect('/home');
})


app.get("/sendmail/:id", async (req, res) => {
    res.render('sendmail', {'id':req.params.id});
})

app.post('/sendmail/:id', async (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'wethestockedpantry@gmail.com',
          pass: 'Thestockedpantry@1234'
        }
      });
      var alumni = await User.findById(req.params.id);
      var mailOptions = {
        from: 'wethestockedpantry@gmail.com',
        to: alumni.email,
        subject: req.body.subject,
        text: req.body.mailbody
      };
      
      await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
      res.redirect('/searchalumni');
})

app.get('/searchalumni', isLoggedIn, async (req, res) => {
    if (!req.user.collegename)
        return res.redirect('/home');
    const alumni = await User.find({"acollegename" : req.user.collegename, "verified" : true});
    res.render('searchalumni', {alumni});
})

app.post('/searchalumni', isLoggedIn, async (req, res) => {
    if (req.body.yearofpassing == 'Passing Year')
        delete req.body.yearofpassing;
    if (req.body.degree == 'Degree')
        delete req.body.degree;
    if (req.body.branch == 'Branch')
        delete req.body.branch;
    req.body.acollegename = req.user.collegename;
    req.body.verified = true;
    const alumni = await User.find(req.body);
    res.render('searchalumni', {alumni});
})

app.get("/chat", isLoggedIn,(req,res) => {
    res.render("index.ejs");
})

app.get("/chatroom", (req,res) => {
    res.render("chat.ejs", {user :req.body.username, room : req.body.collegename})
})

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
