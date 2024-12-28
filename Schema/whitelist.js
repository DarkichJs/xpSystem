const mongoose = require('mongoose')

const schema = mongoose.Schema({
    userID: String,
    addedBy: String,
    addedAt: Date,
});
module.exports = mongoose.model(`Whitelist`, schema)