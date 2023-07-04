
const mongoose = require('mongoose');

const { Schema } = mongoose;

const partidoSchema = new Schema({
    dia: String,
    ciudad: String,
    parque: String,
    fecha: String,
    hora: String,
    asistentes: { type: Number, default: 0 },
  });
  const Partido = mongoose.model('Partido', partidoSchema);
  module.exports = Partido;