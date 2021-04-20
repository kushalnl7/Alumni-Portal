const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
    EventAgenda: String,
    EventVenue: String,
    EventDate : Date,
});

module.exports = mongoose.model("Event", EventSchema);