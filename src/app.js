const express = require("express");
const bodyParser = require('body-parser');
const app = express();

const morgan = require('morgan');
const cors = require('cors');
var uuid = require('uuid').v4;

var corsOptions = { origin: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const aws_keys = require('./creds');
const User = require('./models/user');

//instanciamos el sdk
var AWS = require('aws-sdk');
//instanciamos los servicios a utilizar con sus respectivos accesos.
const s3 = new AWS.S3(aws_keys.s3);

// Settings
app.set('port', process.env.PORT || 5000);

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());

// Routes

//--------------------------------------------------BASE DE DATOS---------------------------------------*
app.get('/users', (req, res) => {
    User.getUsers((err, data) => {
        res.status(200).json(data);
    });
});

app.post('/users', (req, res) => {
        
    const userData = {
        id: null,
        usuario: req.body.username,
        nombre: req.body.name,
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

    //console.log(req.body);
    const userData = {
        id: req.params.id,
        usuario: req.body.username,
        nombre: req.body.name,
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

//--------------------------------------------------ALMACENAMIENTO---------------------------------------

//subir foto en s3
app.post('/subirfoto', function (req, res) {

    try {
        var id = req.body.id;
        var foto = req.body.foto;
        //carpeta y nombre que quieran darle a la imagen

        var nombrei = "Fotos_Perfil/" + id + ".jpg";
        // en la base de datos guardar el nombrei
        //se convierte la base64 a bytes
        let buff = new Buffer.from(foto, 'base64');

        const params = {
            Bucket: "s1bucket-practica1",
            Key: nombrei,
            Body: buff,
            ContentType: "image",
            ACL: 'public-read'
        };
        const putResult = s3.putObject(params).promise();
        console.log(params);
        res.json({ mensaje: "Exito", success: true })
    }
    catch (e) {
        res.json({ mensaje: "Fallo al subir imagen" , success: false })
    }
});

//obtener foto en s3
app.post('/obtenerfoto', function (req, res) {
    var id = req.body.id;
    //direcccion donde esta el archivo a obtener
    var nombrei = "Fotos_Perfil/" + id + ".jpg";
    var getParams = {
        Bucket: 's1bucket-practica1',
        Key: nombrei
    }
    s3.getObject(getParams, function (err, data) {
        if (err)
        res.json({ mensaje: "error" })
        //de bytes a base64
        var dataBase64 = Buffer.from(data.Body).toString('base64');
        res.json({ mensaje: dataBase64 })

    });
});

//subir foto y guardar en mysql
app.post('/saveImageInfoDDB', (req, res) => {
    let body = req.body;

    const userData = {
        id: null,
        usuario: req.body.username,
        nombre: req.body.name,
        password: req.body.password,
        foto: req.body.foto
    };
    
    let name = body.username;
    let base64String = body.image;
    let extension = body.extension;

    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3

    //Parámetros para S3
    let bucketname = 's1bucket-practica1';
    let folder = 'Fotos_Perfil/';
    let filepath = `${folder}${filename}`;
    var uploadParamsS3 = {
        Bucket: bucketname,
        Key: filepath,
        Body: decodedImage,
        ACL: 'public-read',
    };

    s3.upload(uploadParamsS3, function sync(err, data) {
        if (err) {

            console.log('Error uploading file:', err);
            res.send({ 'message': 's3 failed' })

        } else {

            //console.log('Upload success at:', data.Location);
            
            userData.foto = filepath;

            //console.log('Info:', userData);
        
            User.insertUser(userData, (err, data) => {
                if (data &&  data.insertId) {
                    
                    console.log(data);
        
                    res.json({
                        success: true,
                        msg: 'ddb success',
                        data: data
                    })
                }
                else 
                {
                    console.log(err);

                    res.status(500).json({
                        success: false,
                        msg: 'ddb failed'
                    })
                }
            })

        }
    });
});

app.put('/editUserInfo/:id', (req, res) => {
    let body = req.body;

    //console.log(body);

    const userData = {
        id: req.params.id,
        usuario: req.body.username,
        nombre: req.body.name,
        password: req.body.password,
        foto: req.body.foto
    };
    
    let name = body.username;
    let base64String = body.image;
    let extension = body.extension;

    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`; //uuid() genera un id unico para el archivo en s3

    //Parámetros para S3
    let bucketname = 's1bucket-practica1';
    let folder = 'Fotos_Perfil/';
    let filepath = `${folder}${filename}`;
    var uploadParamsS3 = {
        Bucket: bucketname,
        Key: filepath,
        Body: decodedImage,
        ACL: 'public-read',
    };

    s3.upload(uploadParamsS3, function sync(err, data) {
        if (err) {

            console.log('Error uploading file:', err);
            res.send({ 'message': 's3 failed' })

        } else {

            //console.log('Upload success at:', data.Location);
            
            userData.foto = filepath;

            //console.log('Info:', userData);

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
        }
    });
});

// Static files
// Sin static files aun

app.listen(app.get('port'), () => {
    console.log('Server on port 5000');
});

/*
EJECUTAR EN CONSOLA EL COMANDO
node src/app.js
*/