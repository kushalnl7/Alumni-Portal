const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NoticeSchema = new Schema({
    NoticeContent: String,
    NoticeDate: Date,
});

module.exports = mongoose.model("Notice", NoticeSchema);