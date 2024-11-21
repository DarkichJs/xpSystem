const mongoose = require('mongoose')

const schema = mongoose.Schema({
    userID: String,
    messages: Number,
    status: Boolean,
    inactivedays: Number
});
module.exports = mongoose.model(`User`, schema)