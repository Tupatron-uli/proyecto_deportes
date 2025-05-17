const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database'); // Tu conexión mysql con callbacks

const app = express();
const PORT = 8000;

// Configuración
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secreto123',
  resave: false,
  saveUninitialized: false
}));

// Rutas

// Página principal (login y registro)
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

// Registro de usuario
app.post('/register', async (req, res) => {
  const { nombre, email, password, confirmar } = req.body;
  if (password !== confirmar) {
    return res.send('Las contraseñas no coinciden');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
    [nombre, email, hashedPassword],
    (err) => {
      if (err) return res.send('Error al registrar');
      res.redirect('/');
    }
  );
});

// Inicio de sesión
app.post('/login', (req, res) => {
  const { nombre, password } = req.body;

  db.query('SELECT * FROM usuarios WHERE nombre = ?', [nombre], async (err, results) => {
    if (err) return res.send('Error en la consulta');
    if (results.length === 0) return res.send('Usuario no encontrado');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      req.session.user = user;
      res.redirect('/dashboard');
    } else {
      res.send('Contraseña incorrecta');
    }
  });
});

// Panel con botones de deportes
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('dashboard');
});

// Mostrar formulario de un deporte (nuevo registro o editar)
app.get('/form/:deporte', (req, res) => {
  const deporte = req.params.deporte;
  res.render('form', { deporte, datos: null });
});

// Guardar nuevo registro
app.post('/guardar/:deporte', (req, res) => {
  const deporte = req.params.deporte;
  const { nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo } = req.body;

  db.query(
    'INSERT INTO registros (deporte, nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [deporte, nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo],
    (err) => {
      if (err) throw err;
      res.redirect('/consultar');
    }
  );
});

// Mostrar todos los registros
app.get('/consultar', (req, res) => {
  db.query('SELECT * FROM registros', (err, registros) => {
    if (err) throw err;
    res.render('crud', { registros });
  });
});

// Editar registro
app.get('/editar/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM registros WHERE id = ?', [id], (err, rows) => {
    if (err) throw err;
    const datos = rows[0];
    if (!datos) return res.send('Registro no encontrado');

    // Formatear fecha para el input date
    if (datos.fecha_nacimiento) {
      datos.fecha_nacimiento = datos.fecha_nacimiento.toISOString().split('T')[0];
    }

    res.render('form', { deporte: datos.deporte, datos });
  });
});

// Actualizar registro
app.post('/actualizar/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo } = req.body;

  db.query(
    'UPDATE registros SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, fecha_nacimiento=?, salud=?, domicilio=?, telefono=?, sexo=? WHERE id=?',
    [nombre, apellido_paterno, apellido_materno, email, fecha_nacimiento, salud, domicilio, telefono, sexo, id],
    (err) => {
      if (err) throw err;
      res.redirect('/consultar');
    }
  );
});

// Eliminar registro
app.get('/eliminar/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM registros WHERE id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/consultar');
  });
});


// Mostrar todos los registros del padre
app.get('/formtutor', (req, res) => {
  db.query('SELECT * FROM padres', (err, results) => {
    if (err) throw err;
    res.render('formtutor', { padres: results });
  });
});

// Insertar nuevo registro
app.post('/add', (req, res) => {
  const data = req.body;
  db.query('INSERT INTO padres SET ?', data, (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

// Eliminar
app.get('/delete/:id', (req, res) => {
  db.query('DELETE FROM padres WHERE id = ?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

// Editar (mostrar formulario)
app.get('/edittutor/:id', (req, res) => {
  db.query('SELECT * FROM padres WHERE id = ?', [req.params.id], (err, results) => {
    if (err) throw err;
    res.render('edittutor', { padre: results[0] });
  });
});

// Actualizar registro
app.post('/update/:id', (req, res) => {
  const data = req.body;
  db.query('UPDATE padres SET ? WHERE id = ?', [data, req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/formtutor');
  });
});

////////////////////////////////////
app.get('/formdescuento', (req, res) => {
  res.render('formdescuento');
});

//formulario de descuento
app.post('/guardar', (req, res) => {
  const { gastos, ingresos, miembros } = req.body;

  const sql = 'INSERT INTO datos_familiares (gastos_mensuales, ingresos_familiares, miembros_trabajando) VALUES (?, ?, ?)';
  db.query(sql, [gastos, ingresos, miembros], (err, result) => {
    if (err) throw err;
    res.send('<h2>solicitud enviada esperando respuesta</h2><a href="formdescuento">Volver</a>');
  });
});

app.get('/reglas', (req, res) => {
    res.render('reglas');
});

app.get('/cierre', (req, res) => {
  res.render('cierre');
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
