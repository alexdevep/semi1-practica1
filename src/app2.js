const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./models/userPostgresql')
const port = 3000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/users', db.getUsers)
app.post('/users', db.createUser)
app.get('/users/:id', db.getUserById)
app.put('/users/:id', db.updateUser)
app.delete('/users/:id', db.deleteUser)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})


/*
EJECUTAR EN CONSOLA EL COMANDO
node src/app2.js
*/