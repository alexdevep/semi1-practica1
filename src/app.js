const express = require("express");
const app = express();

const morgan = require('morgan');
const bodyParser = require('body-parser');

// Instancias de conexion con BD
/*
const db_credentials = require('./db_creds');
var conn = mysql.createPool(db_credentials);
*/

// Settings
app.set('port', process.env.PORT || 3000);

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());

// Routes
require('./routes/userRoutes')(app); // MySQL

// Static files
// Sin static files aun

app.listen(app.get('port'), () => {
    console.log('Server on port 3000');
});

/*
EJECUTAR EN CONSOLA EL COMANDO
node src/app.js
*/