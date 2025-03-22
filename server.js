// Importar dependencias
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccount = require('./firebase-config.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://aebin-5bc40-default-rtdb.firebaseio.com",
});

const db = firebaseAdmin.database();

// Crear aplicación Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Lista local de registros
let registros = [];

// Mapeo de tipos esperados para el gráfico
const tiposOrdenados = ['Plástico', 'Papel', 'Vidrio', 'Orgánico', 'Metal', 'No Reciclable'];

// Ruta POST para recibir datos desde Arduino o frontend
app.post('/api/datos', (req, res) => {
  const { tipo, cantidad } = req.body;

  if (!tipo || typeof cantidad !== 'number') {
    return res.status(400).send({ error: "Se requiere tipo y cantidad numérica" });
  }

  const nuevoRegistro = {
    tipo,
    cantidad,
    timestamp: new Date().toISOString()
  };

  // Guardar en Firebase
  const ref = db.ref('sensor/data').push(); // push para múltiples entradas
  ref.set(nuevoRegistro)
    .then(() => {
      // Guardar en memoria
      registros.push(nuevoRegistro);
      res.status(200).send({ message: "Datos recibidos correctamente" });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({ error: "Error al guardar los datos en Firebase" });
    });
});

// Ruta GET para enviar datos al dashboard (agrupados)
app.get('/api/datos', (req, res) => {
  const wasteMap = {};

  // Sumar cantidades por tipo
  registros.forEach(registro => {
    if (!wasteMap[registro.tipo]) {
      wasteMap[registro.tipo] = 0;
    }
    wasteMap[registro.tipo] += registro.cantidad;
  });

  // Construir arreglo ordenado para el dashboard
  const wasteDistribution = tiposOrdenados.map(tipo => wasteMap[tipo] || 0);

  res.json({
    wasteDistribution
  });
});

// Ruta para visualizar en HTML
app.get('/visualizar', (req, res) => {
  let html = `
    <html>
    <head><title>Datos del Sensor</title></head>
    <body>
      <h1>Registros del sensor</h1>
      <table border="1"><tr><th>Tipo</th><th>Cantidad</th><th>Hora</th></tr>
  `;

  registros.forEach(dato => {
    html += `<tr><td>${dato.tipo}</td><td>${dato.cantidad}</td><td>${dato.timestamp}</td></tr>`;
  });

  html += `</table></body></html>`;
  res.send(html);
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
