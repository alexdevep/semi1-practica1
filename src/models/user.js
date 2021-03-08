const mysql = require('mysql');

/*
connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password:'Admin!3699',
    database: 'testapimysql'
});
*/
connection = mysql.createConnection({
    host: 'mysqldb.cahzfivbuo9y.us-east-2.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password:'admin_mysql',
    database: 'practica1'
});


let userModel = {};

userModel.getUsers = (callback) => {
    if (connection){
        //console.log('SI CONECTO!');
        connection.query(
            'SELECT * FROM users ORDER BY id',
            (err, rows) => {
                if (err) {
                    throw err;
                }
                else{
                    //callback => res.json...
                    callback(null, rows);
                }
            }
        )
    }
    else {
        //console.log('NO CONECTO!');
    }
};

userModel.insertUser = (userData, callback) => {
    if (connection) {
        connection.query(
            'INSERT INTO users SET ?', userData,
            (err, result) => {
                if(err) {
                    throw err;
                }
                else
                {
                    //callback => res.json...
                    callback(null, {
                        'insertId': result.insertId
                    });
                }
            }
        )
    }
};

userModel.updateUser = (userData, callback) => {
    if (connection){

        //const sql = 'Update users SET' + connection.escape(userData.username) + ....
        const sql = `
            UPDATE users SET
            usuario = ${connection.escape(userData.usuario)},
            nombre = ${connection.escape(userData.nombre)},
            password = ${connection.escape(userData.password)},
            foto = ${connection.escape(userData.foto)}
            WHERE id = ${connection.escape(userData.id)}
        `;

        connection.query(sql, (err, result) => {
            if (err) {
                throw err;
            } 
            else{
                //callback => res.json...
                callback(null, {
                    "msg": "success"
                });
            }
        })
    }
};

userModel.deleteUser = (id, callback) => {

    if (connection) {
        let sql = `
        SELECT * FROM users WHERE id = ${connection.escape(id)}
        `;
        connection.query(sql, (err, row) => {
            if (row) {
                let sql = `
                        DELETE FROM users WHERE id = ${connection.escape(id)}
                        `;
                connection.query( sql, (err, result) => {
                    if (err) {
                        throw err;
                    }
                    else{
                        //callback => res.json...
                        callback(null, {
                            msg: 'deleted'
                        })
                    }
                })
            }
            else{
                //callback => res.json...
                callback(null, {
                    msg: 'not exists'
                })
            }
        });
    }
};

module.exports = userModel;