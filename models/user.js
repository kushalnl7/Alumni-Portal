const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Notice = require("./Notices");
const Event = require("./Events");

const UserSchema = new Schema({
    username: String,
    contact : String,
    email : String,
    isstudent: Boolean,
    firstname: String,
    lastname: String,
    acollegename: String,
    password:String,
    yearofpassing: String,
    currentworking: String,
    currentlocation : String,
    branch : String,
    gender: String,
    degree : String,
    verified:Boolean,
    collegeemail: String,
    collegename: String,
    ccontact: String,
    clocation: String,
    Notices:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Notice'
        }
    ],
    Events: [ 
        {
            type : Schema.Types.ObjectId,
            ref: 'Event'
        }
    ],
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);