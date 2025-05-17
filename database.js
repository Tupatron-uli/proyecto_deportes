const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'deportes_db'
});

connection.connect(err => {
  if (err) throw err;
  console.log('Conectado a la base de datos');
});

module.exports = connection;
