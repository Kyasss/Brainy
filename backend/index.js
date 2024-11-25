const express = require('express');
const path = require('path');
const app = express();
const PORT = 5000;


app.use(express.static(path.join(__dirname, '../frontend')));

// Importar rutas
const homeRoutes = require('./routes/home.js');
const resumenRoutes = require('./routes/resumen');
const cuestionarioRoutes = require('./routes/cuestionario');
const acercaDeRoutes = require('./routes/acercade');

// Usar rutas
app.use('/', homeRoutes);
app.use('/resumen', resumenRoutes);
app.use('/cuestionario', cuestionarioRoutes);
app.use('/acercade', acercaDeRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).send('<h1>404 - Página no encontrada</h1>');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
