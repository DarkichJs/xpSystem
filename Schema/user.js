const mongoose = require('mongoose')

const schema = mongoose.Schema({
    userID: String,
    messages: Number,
    xp: Number,
    lvl: Number,
    threedays: Number
});
module.exports = mongoose.model(`User`, schema)