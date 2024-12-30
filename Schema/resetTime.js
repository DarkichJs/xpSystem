const mongoose = require('mongoose')

const schema = mongoose.Schema({
    lastResetTime: String
});
module.exports = mongoose.model(`ResetTime`, schema)