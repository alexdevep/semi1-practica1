const Pool = require('pg').Pool

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'practicas',
    password: 'postgresql',
    port: 5433,
})

const getUsers = (request, response) => {
    pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}


const createUser = (request, response) => {
    const { usuario, nombre, password, foto } = request.body
  
    pool.query('INSERT INTO users(usuario,nombre,password,foto) VALUES ($1, $2, $3, $4)', [usuario, nombre, password, foto], (error, results) => {
        if (error) {
            throw error
        }
        
        console.log(results);
        response.status(201).send(`User added with ID: ${results.insertId}`);
        
    })
}

const getUserById = (request, response) => {
    const id = parseInt(request.params.id)
  
    pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { usuario, nombre, password, foto } = request.body
  
    pool.query(
        'UPDATE users SET usuario=$1,nombre=$2,password=$3,foto=$4 WHERE id = $5',
        [usuario, nombre, password, foto, id],
        (error, results) => {
            if (error) {
                throw error;
            }
            response.status(200).send(`User modified with ID: ${id}`)
        }
    )
}
  
const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)
  
    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}


module.exports = {
    getUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
  }