// Importar las librerías
require('dotenv').config()
const Partido = require('./partido._schema');

const { Telegraf, session } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN);

// Conectar a la base de datos de MongoDB
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a la base de datos:'));
db.once('open', () => {
  console.log('Conexión exitosa a la base de datos.');
});

// Definir el esquema y el modelo para los partidos


bot.use(session());

// Crear una instancia del bot de Telegram

// Comando /start
bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply('¡Bienvenido al bot de Sebastian! Para agendar una cita y jugar un partido, elige un día de la semana, presiona el siguiente comando:');
  await ctx.reply('/dias');
});

// Comando /dias
bot.command('dias', (ctx) => {
  ctx.reply('Elige un día de la semana:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Lunes', callback_data: 'Lunes' }],
        [{ text: 'Martes', callback_data: 'Martes' }],
        [{ text: 'Miércoles', callback_data: 'Miércoles' }],
        [{ text: 'Jueves', callback_data: 'Jueves' }],
        [{ text: 'Viernes', callback_data: 'Viernes' }],
      ],
    },
  });
});

// Manejar la selección del día
bot.action(/Lunes|Martes|Miércoles|Jueves|Viernes/, async (ctx) => {
  const dia = ctx.match[0];
  session.dia = dia;

  await ctx.reply('Selecciona una ciudad:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Ciudad 1', callback_data: 'Ciudad 1' }],
        [{ text: 'Ciudad 2', callback_data: 'Ciudad 2' }],
        [{ text: 'Ciudad 3', callback_data: 'Ciudad 3' }],
      ],
    },
  });
});

// Manejar la selección de la ciudad
bot.action(/Ciudad 1|Ciudad 2|Ciudad 3/, async (ctx) => {
  const ciudad = ctx.match[0];
  session.ciudad = ciudad;

  await ctx.reply('Selecciona un parque:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Parque 1', callback_data: 'Parque 1' }],
        [{ text: 'Parque 2', callback_data: 'Parque 2' }],
        [{ text: 'Parque 3', callback_data: 'Parque 3' }],
      ],
    },
  });
});

// Manejar la selección del parque
bot.action(/Parque 1|Parque 2|Parque 3/, async (ctx) => {
    const parque = ctx.match[0];
    session.parque = parque;
  
    // Obtener los partidos existentes para el día, ciudad y parque seleccionados
    const partidos = await Partido.find({ dia: session.dia, ciudad: session.ciudad, parque: session.parque });
  
    if (partidos.length === 0) {
      ctx.reply('No hay partidos programados para este parque. Pero puedes crear uno con el comando /crear');
    } else {
      //const message = 'Partidos existentes:\n';
      /* for (const partido of partidos) {
        message += `- Fecha: ${partido.fecha}, Hora: ${partido.hora}, Asistentes: ${partido.asistentes}\n`;
      } */
      try {
        const partidos = await Partido.find().exec();
    
        if (partidos.length === 0) {
          await ctx.reply('No hay partidos programados actualmente. Pero puedes crear uno con el comando /crear');
          //await ctx.reply()
        } else {
          let message = 'Partidos existentes:\n';
    
          partidos.forEach((partido) => {
            message += `- Día: ${partido.dia}, Ciudad: ${partido.ciudad}, Parque: ${partido.parque}\n`;
            message += `- Fecha: ${partido.fecha}, Hora: ${partido.hora}, Asistentes: ${partido.asistentes}\n\n`;
          });
          await ctx.reply(message);
          await ctx.reply('Si deseas entrar al partido actual, confirma tu asistencia con el comando /seleccionar_partido');
        }
      } catch (error) {
        console.error('Error al recuperar los partidos:', error);
        await ctx.reply('Ocurrió un error al recuperar los partidos. Por favor, intenta nuevamente.');
      }
    }
  });

  // Mostrar los partidos existentes
bot.command('partidos', async (ctx) => {
    try {
      const partidos = await Partido.find().exec();
  
      if (partidos.length === 0) {
        await ctx.reply('No hay partidos programados actualmente.');
      } else {
        let message = 'Partidos existentes:\n';
  
        partidos.forEach((partido) => {
          message += `- Día: ${partido.dia}, Ciudad: ${partido.ciudad}, Parque: ${partido.parque}\n`;
          message += `- Fecha: ${partido.fecha}, Hora: ${partido.hora}, Asistentes: ${partido.asistentes}\n\n`;
          
        });
        
        await ctx.reply(message);
        ctx.reply('Si deseas entrar al partido actual, confirma tu asistencia con el comando /seleccionar_partido');
      }
    } catch (error) {
      console.error('Error al recuperar los partidos:', error);
      await ctx.reply('Ocurrió un error al recuperar los partidos. Por favor, intenta nuevamente.');
    }
  });

  // Manejar la selección de un partido existente
bot.command('seleccionar_partido', async (ctx) => {
    const { dia, ciudad, parque } = session;
  
    try {
      const partidos = await Partido.find({ dia, ciudad, parque }).exec();
  
      if (partidos.length === 0) {
        await ctx.reply(`No hay partidos programados para el día ${dia}, en la ciudad ${ciudad}, en el parque ${parque}.`);
      } else {
        const buttons = partidos.map((partido) => ({
          text: `Fecha: ${partido.fecha}, Hora: ${partido.hora}`,
          callback_data: partido._id.toString(),
        }));
  
        await ctx.reply('Selecciona un partido existente:', {
          reply_markup: {
            inline_keyboard: [buttons],
          },
        });
      }
    } catch (error) {
      console.error('Error al recuperar los partidos:', error);
      await ctx.reply('Ocurrió un error al recuperar los partidos. Por favor, intenta nuevamente.');
    }
  });
  
  // Manejar la confirmación de asistencia a un partido existente
  bot.action(/^[a-fA-F0-9]{24}$/, async (ctx) => {
    const partidoId = ctx.match[0];
  
    try {
      const partido = await Partido.findById(partidoId).exec();
  
      if (!partido) {
        await ctx.reply('El partido seleccionado no existe.');
      } else {
        partido.asistentes += 1;
        await partido.save();
  
        await ctx.reply('Has confirmado tu asistencia al partido. ¡Disfruta!');
        await ctx.reply('Si deseas seleccionar otra fecha para crear o confirmar tu asistencia a un partido usa el comando /dias')
      }
    } catch (error) {
      console.error('Error al confirmar la asistencia:', error);
      await ctx.reply('Ocurrió un error al confirmar la asistencia. Por favor, intenta nuevamente.');
    }
  });
  
// Comando /crear
bot.command('crear', async (ctx) => {
    ctx.reply('Ingresa el día del mes para el nuevo partido:');
    session.state = 'crear_fecha';
  });
  
  // Manejar la creación de un nuevo partido
  bot.on('text', async (ctx) => {
    if (session.state === 'crear_fecha') {
      const fecha = ctx.message.text;
      session.fecha = fecha;
  
      ctx.reply('Ingresa la hora para el nuevo partido:');
      session.state = 'crear_hora';
    } else if (session.state === 'crear_hora') {
      const hora = ctx.message.text;
      session.hora = hora;
  
      // Crear el nuevo partido en la base de datos
      const partidoNuevo = new Partido({
        dia: session.dia,
        ciudad: session.ciudad,
        parque: session.parque,
        fecha: session.fecha,
        hora: session.hora,
        asistentes: 1, // El creador se inscribe automáticamente
      });
  
      await partidoNuevo.save();
  
      ctx.reply('¡El partido ha sido creado exitosamente!');
      ctx.reply('para ver los partidos creados y que estan disponibles usa el comando /partidos');
      session.state = null; // Restablecer el estado
    } else {
      ctx.reply('Comando o mensaje inválido.');
    }
  });
  bot.use(session());
  
  // Iniciar el bot
  bot.launch().then(() => {
    console.log('Bot iniciado');
  });  
