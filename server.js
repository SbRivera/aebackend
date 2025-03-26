// Importar dependencias
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');

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

// Mapeo de tipos esperados para el gráfico
const tiposOrdenados = ['Plástico', 'Papel', 'Vidrio', 'Orgánico', 'Metal', 'No Reciclable'];

// Ruta POST para recibir datos desde Arduino o frontend
app.post('/api/datos', async (req, res) => {
  const { tipo, cantidad } = req.body;

  if (!tipo || typeof cantidad !== 'number') {
    return res.status(400).send({ error: "Se requiere tipo y cantidad numérica" });
  }

  try {
    // Guardar en Firebase, reemplazando la cantidad anterior solo para ese tipo
    const ref = db.ref(`sensor/data/${tipo}`);
    await ref.set({ tipo, cantidad, timestamp: new Date().toISOString() });

    res.status(200).send({ message: "Datos actualizados correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error al guardar los datos en Firebase" });
  }
});

// Ruta GET para obtener los datos almacenados
app.get('/api/datos', async (req, res) => {
  try {
    const snapshot = await db.ref('sensor/data').once('value');
    const datos = snapshot.val() || {};

    // Construir arreglo ordenado para el dashboard
    const wasteDistribution = tiposOrdenados.map(tipo => datos[tipo]?.cantidad || 0);

    res.json({ wasteDistribution });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error al obtener los datos" });
  }
});

// Ruta DELETE para eliminar un tipo de material específico
app.delete('/api/datos/:tipo', async (req, res) => {
  const { tipo } = req.params;

  try {
    await db.ref(`sensor/data/${tipo}`).remove();
    res.status(200).send({ message: `Datos de ${tipo} eliminados correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error al eliminar los datos" });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
