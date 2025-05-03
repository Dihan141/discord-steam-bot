const mongoose = require('mongoose')

const savedGameSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String },
    appid: { type: Number, required: true },
    name: String,
    image: String,
    is_free: Boolean,
    price: Object,
    description: String,
    recommendation: Number,
}, { timestamps: true });

module.exports = mongoose.model('SavedGame', savedGameSchema);