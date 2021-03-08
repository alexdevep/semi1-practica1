const User = require('../models/user');

module.exports = function (app) {
    
    app.get('/users', (req, res) => {
        User.getUsers((err, data) => {
            res.status(200).json(data);
        });
    });
    
    app.post('/users', (req, res) => {
        
        const userData = {
            id: null,
            usuario: req.body.usuario,
            nombre: req.body.nombre,
            password: req.body.password,
            foto: req.body.foto
        };

        User.insertUser(userData, (err, data) => {
            if (data &&  data.insertId) {
                
                console.log(data);

                res.json({
                    success: true,
                    msg: 'Usuario insertado',
                    data: data
                })
            }
            else 
            {
                res.status(500).json({
                    success: false,
                    msg: 'Error'
                })
            }
        })
    });

    app.put('/users/:id', (req, res) => {

        const userData = {
            id: null,
            usuario: req.body.usuario,
            nombre: req.body.nombre,
            password: req.body.password,
            foto: req.body.foto
        };

        User.updateUser(userData, (err, data) => {
            if (data && data.msg){
                res.json(data)
            }
            else{
                res.json({
                    success: false,
                    msg: 'error'
                })
            }
        })
    });

    app.delete('/users/:id', (req, res) => {
        User.deleteUser(req.params.id, (err, data) => {
            if(data && data.msg === 'deleted' || data.msg === 'not exists'){
                res.json({
                    success: true,
                    data
                })
            }
            else{
                res.status(500).json({
                    msg: 'Error'
                })
            }
        });
    });
}