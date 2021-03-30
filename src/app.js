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
const bucket = "practica1-g18-imagenes";
const client = new AWS.Rekognition({
    accessKeyId: aws_keys.rekognition.accessKeyId,
    secretAccessKey: aws_keys.rekognition.secretAccessKey,
    region: aws_keys.rekognition.region
});

// Settings
app.set('port', process.env.PORT || 5000);

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());

// Routes

app.get('/', (req, res) => {
    res.status(200).json({ "msg": "Conecto" });
});

//-------------------------------------------------- AUTHENTIFICATION ---------------------------------------*
app.post('/login', (req, res) => {

    const userData = {
        usuario: req.body.username,
        password: req.body.password
    };

    User.login(userData, (err, data) => {
        res.status(200).json(data);
    })
});


app.post('/loginFace', function (req, res) {
    User.getUsers((err, data) => {
        var foto = "vacio"; //Nombre de la foto actual del usuario a buscar
        var i;
        var extension = "jpg";
        var foto2 = req.body.foto;  //Contendrá los bytes de la captura tomada por la web cam

        //Búsqueda del usuario
        for (i = 0; i < data.length; i++) {
            if (data[i].usuario == req.body.username) {
                foto = data[i].foto;
                break;
            }
        }

        if (foto != "vacio") {
            //Subir imagen a S3
            let name = data[i].usuario;
            let decodedImage = Buffer.from(foto2, 'base64');
            let filename = `${name}-${uuid()}.${extension}`;
            let folder = 'Fotos_Perfil/';
            let filepath = `${folder}${filename}`;
            const params_ = {
                Bucket: bucket,
                Key: filepath,
                Body: decodedImage,
                ContentType: "image",
                ACL: 'public-read'
            };
            console.log(filepath);

            s3.upload(params_, function sync(err, datas) {
                if (err) {
                    console.log('Error uploading file:', err);
                    res.send({ 'message': 's3 failed' })

                } else {
                    // console.log("Comparando fotos:");
                    // console.log(foto);
                    // console.log(filepath);

                    //Proceso de comparación
                    const params = {
                        SourceImage: {
                            //Bytes: dataBase64,
                            S3Object: {
                                Bucket: bucket,
                                Name: foto
                            },
                        },
                        TargetImage: {
                            //Bytes: blob,//aquí irían los bytes del req.body.foto.
                            S3Object: {
                                Bucket: bucket,
                                Name: filepath  //Comentar esto, cuando se manden los bytes
                            },
                        },
                        SimilarityThreshold: 0  //Para que retorne algo, sino F
                    }

                    client.compareFaces(params, function (err, response) {
                        if (err) {
                            console.log(err, err.stack);
                        } else {
                            response.FaceMatches.forEach(data2 => {
                                let position = data2.Face.BoundingBox
                                let similarity = data2.Similarity
                                console.log(`The face at: ${position.Left}, ${position.Top} matches with ${similarity} % confidence`)

                                const paramsDelete = {
                                    Bucket: bucket,
                                    Key: filepath
                                };

                                if (similarity >= 75) {
                                    console.log("La captura coincide con la foto actual");
                                    res.status(200).json(data[i]);
                                }
                                else {
                                    console.log("La captura no coincide con la foto actual");
                                    res.json({ mensaje: 0 });
                                }
                                s3.deleteObject(paramsDelete, function (err, data) {
                                    if (err) {
                                        console.log(err, err.stack); // an error occurred
                                    }
                                    else {
                                        console.log(data);           // successful response
                                    }
                                });
                            }) // for response.faceDetails
                        } // if
                    });
                }
            });
        }
        else {
            console.log("User doesn't exist");
            res.json({ mensaje: 0 });
        }
    });
});


//------------------------------------------------- USERS ---------------------------------------
app.get('/users', (req, res) => {
    User.getUsers((err, data) => {
        res.status(200).json(data);
    });
});


app.get('/getUser/:id', (req, res) => {

    const userData = {
        id: req.params.id
    };

    User.getUser(userData, (err, data) => {
        res.status(200).json(data);
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
        if (data && data.msg) {
            res.json(data)
        }
        else {
            res.json({
                success: false,
                msg: 'error'
            })
        }
    })
});


app.delete('/users/:id', (req, res) => {
    User.deleteUser(req.params.id, (err, data) => {
        if (data && data.msg === 'deleted' || data.msg === 'not exists') {
            res.json({
                success: true,
                data
            })
        }
        else {
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
            Bucket: bucket,
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
        res.json({ mensaje: "Fallo al subir imagen", success: false })
    }
});

//obtener foto en s3
app.post('/getPhoto', function (req, res) {
    var id = req.body.id;
    var dataBase64;
    var getParams = {
        Bucket: bucket,
        Key: id
    }
    s3.getObject(getParams, function (err, data) {
        if (err)
            res.json({ mensaje: "error" })
        dataBase64 = Buffer.from(data.Body).toString('base64');
        res.json({ mensaje: dataBase64 })

    });
});

//------------------------------------------- sign up -----------------------------------
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
    let bucketname = bucket;
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
                if (data && data.insertId) {

                    console.log(data);

                    res.json({
                        success: true,
                        msg: 'ddb success',
                        data: data
                    })
                }
                else {
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
    let bucketname = bucket;
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
                if (data && data.msg) {
                    res.json(data)
                }
                else {
                    res.json({
                        success: false,
                        msg: 'error'
                    })
                }
            })
        }
    });
});


// ------------------------------------------------------ ALBUMS -----------------------------------------------------
app.post('/createAlbum', function (req, res) {
    try {
        const albumData = {
            id: null,
            name: req.body.name,
            idUser: req.body.idUser
        };
        
        User.insertAlbum(albumData, (err, data) => {
            if (data && data.insertId) {
                res.json({ mensaje: "Exito", success: true })
            }
            else if(err) {
                res.json({ mensaje: "Error, el álbum ya existe para este usuario", success: false })
            }
            else {
                if(data.length > 0){
                    res.status(500).json({
                        success: false,
                        msg: 'Error, el álbum ya existe para este usuario'
                    })
               }
               else{
                res.status(500).json({
                    success: false,
                    msg: 'ddb failed'
                })
               }
            }
        })

    }
    catch (e) {
        res.json({ mensaje: "Fallo al crear el álbum", success: false })
    }
});


//------------------------------------------------------ GET ALBUM --------------------------------------------------
app.get('/getAlbums/:id', (req, res) => {

    const albumData = {
        idUser: req.params.id
    };
    console.log(albumData)

    User.getAlbums(albumData, (err, data) => {
        res.status(200).json(data);
    })
});

app.get('/getAlbum', (req, res) => {

    const albumData = {
        id: req.body.id
    };
    console.log(albumData)

    User.getAlbum(albumData, (err, data) => {
        res.status(200).json(data);
    })
});



//--------------------------------------------------------- PHOTO ALBUM
app.post('/photoAlbum', (req, res) => {
    let body = req.body;
    let name = body.username;
    let base64String = body.foto;
    let extension = body.extension;

    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`;

    //Parámetros para S3
    let bucketname = bucket;
    let folder = 'Fotos_Publicadas/';
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
            const photoAlbumData = {
                id: null,
                photo: filepath,
                idAlbum: body.idAlbum
            };

            User.insertPhotoAlbum(photoAlbumData, (err, data) => {
                if (data && data.insertId) {
                    console.log(data);
                    res.json({
                        success: true,
                        msg: 'ddb success',
                        data: data
                    })
                }
                else {
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



// Static files
// Sin static files aun

app.listen(app.get('port'), () => {
    console.log('Server on port 5000');
});

/*
EJECUTAR EN CONSOLA EL COMANDO
node src/app.js
*/