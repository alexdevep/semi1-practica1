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
const translate = new AWS.Translate(aws_keys.translate);

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
            else if (err) {
                res.json({ mensaje: "Error, el álbum ya existe para este usuario", success: false })
            }
            else {
                if (data.length > 0) {
                    res.status(500).json({
                        success: false,
                        msg: 'Error, el álbum ya existe para este usuario'
                    })
                }
                else {
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

//Este no.
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
// Primera práctica
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


// Segunda práctica
app.post('/insertPhotoAlbum', (req, res) => {
    let body = req.body;
    let name = body.name;
    let base64String = body.foto;
    let extension = body.extension;

    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}-${uuid()}.${extension}`;
    //let filename = `${name}.${extension}`;

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
            var params = {
                Image: {
                    S3Object: {
                        Bucket: bucket,
                        Name: filepath
                    }
                },
                MaxLabels: 123,
                MinConfidence: 75
            };

            //Detectamos los labels para crear los albumes de la foto
            client.detectLabels(params, function (err, response) {
                if (err) {
                    console.log(err, err.stack);
                    res.json({ mensaje: "Error, al obtener los álbumes", success: false })
                } else {
                    //Recorremos cada label
                    response.Labels.forEach(data => {
                        //console.log(`  Name:      ${data.Name}`);
                        // Traducimos cada label, Si se tarda mucho. Comentar desde aquí
                        let text = data.Name
                        let params = {
                            SourceLanguageCode: 'auto',
                            TargetLanguageCode: 'es',
                            Text: text || 'Hello World'
                        };
                        translate.translateText(params, function (err, data) {
                            if (err) {
                                console.log(err, err.stack);
                            } else { //Hasta aca y las llaves de abajo
                                //console.log(data.TranslatedText);

                                //Proceso para la creacón de albumes
                                const albumData = {
                                    id: null,
                                    name: data.TranslatedText,
                                    idUser: body.idUser
                                };

                                User.insertAlbum(albumData, (err, data) => {
                                    // Descomentar esto si se desea ver el proceso de creación de album.
                                    // if (data && data.insertId) {
                                    //     console.log("Si se creo el album");
                                    // }
                                    // else if (err) {
                                    //     console.log("El album ya existe");
                                    // }
                                    // else {
                                    //     if (data.length > 0) {
                                    //         console.log("El album ta existe para este usuario");
                                    //     }
                                    //     else {
                                    //         console.log("Falló");
                                    //     }
                                    // }
                                    // console.log(albumData)


                                    //Luego de la creación de albumes, se procede a obtener el id del album creado.
                                    // Hago esto, porque me daba error al traer el id en el proceso anterior
                                    User.getAlbumFilter(albumData, (err2, data3) => {
                                        //console.log("Insertando foto en album");

                                        //Procesos para insertar foto en cada album
                                        const photoAlbumData = {
                                            id: null,
                                            photo: filepath,
                                            description: body.description,
                                            idAlbum: data3[0].id
                                        };
                                        User.insertPhotoAlbum(photoAlbumData, (err, data4) => {
                                            if (data4 && data4.insertId) {
                                                console.log(`Se insertó foto en el album: ${photoAlbumData.idAlbum}`)
                                            }
                                            else {
                                                console.log("Hubo error papu :(");
                                            }
                                        })
                                        //console.log("-")
                                    });
                                })
                            } //Esta
                        }); //Y esta comentar.
                    });

                    //res.status(200).json(response);
                    res.json({ mensaje: "Éxito", success: true })
                }
            });
        }
    });
});


app.post('/getPhotosAlbum', (req, res) => {
    const albumData = {
        idAlbum: req.body.idAlbum
    };
    console.log(albumData)

    User.getPhotos(albumData, (err, data) => {
        res.status(200).json(data);
    })
});


//--------------------------------------------------------- PROFILE ANALYSIS -----------------------------------------------------------
app.post('/profileAnalysis', function (req, res) {
    var params = {
        Image: {
            S3Object: {
                Bucket: bucket,
                Name: req.body.foto
            }
        },
        Attributes: ['ALL']
    };

    client.detectFaces(params, function (err, response) {
        var data_response = {}
        if (err) {
            console.log(err, err.stack);
            res.json({ mensaje: "Error al analizar la foto de perfil", success: false })
        } else {
            response.FaceDetails.forEach(data => {
                let low = data.AgeRange.Low
                var vars = []
                let high = data.AgeRange.High
                console.log(`The detected face is between: ${low} and ${high} years old`)
                console.log("EStos son los atributos que tenes acceder y mostrar papu:")
                console.log(`  Age.Range.Low:          ${data.AgeRange.Low} - ${data.AgeRange.High}`)
                //data_response.ageRange = `${data.AgeRange.Low} - ${data.AgeRange.High}`
                var it1 = {'ageRange': `${data.AgeRange.Low} - ${data.AgeRange.High}`}
                console.log(`  Gender.Confidence:      ${data.Gender.Value}`)
                console.log(`  Gender.Confidence:      ${data.Gender.Confidence}`)
                //data_response.Gender = data.Gender.Value
                var it2 = {'Gender': data.Gender.Value}
                vars.push(it1)
                vars.push(it2)
                if (data.Smile.Value) {
                    console.log(`  Smile.Confidence:       ${data.Smile.Confidence}`)
                    //data_response.Smile = "True"
                    var it = {'Smile': "True"}
                    vars.push(it)
                }
                else if (!data.Smile.Value) {
                    //data_response.Smile = "False"
                    var it = {'Smile': "False"}
                    vars.push(it)
                }
                if (data.Eyeglasses.Value) {
                    console.log(`  Eyeglasses.Confidence:  ${data.Eyeglasses.Confidence}`)
                    //data_response.Eyeglasses = "True"
                    var it = {'Eyeglasses': "True"}
                    vars.push(it)
                }
                else if (!data.Eyeglasses.Value) {
                    //data_response.Eyeglasses = "False"
                    var it = {'Eyeglasses': "False"}
                    vars.push(it)
                }
                if (data.Sunglasses.Value) {
                    console.log(`  Sunglasses.Confidence:  ${data.Sunglasses.Confidence}`)
                    //data_response.Sunglasses = "True"
                    var it = {'Sunglasses': "True"}
                    vars.push(it)
                }
                else if (!data.Sunglasses.Value) {
                    //data_response.Sunglasses = "False"
                    var it = {'Sunglasses': "False"}
                    vars.push(it)
                }
                if (data.Beard.Value) {
                    console.log(`  Beard.Confidence:       ${data.Beard.Confidence}`)
                    //data_response.Beard = "True"
                    var it = {'Beard': "True"}
                    vars.push(it)
                }
                else if (!data.Beard.Value) {
                    //data_response.Beard = "False"
                    var it = {'Beard': "False"}
                    vars.push(it)
                }
                if (data.Mustache.Value) {
                    console.log(`  Mustache.Confidence:    ${data.Mustache.Confidence}`)
                    //data_response.Mustache = "True"
                    var it = {'Mustache': "True"}
                    vars.push(it)
                }
                else if (!data.Mustache.Value) {
                    //data_response.Mustache = "False"
                    var it = {'Mustache': "False"}
                    vars.push(it)
                }
                if (data.EyesOpen.Value) {
                    console.log(`  EyesOpen.Confidence:    ${data.EyesOpen.Confidence}`)
                    //data_response.EyesOpen = "True"
                    var it = {'EyesOpen': "True"}
                    vars.push(it)
                }
                else if (!data.EyesOpen.Value) {
                    //data_response.EyesOpen = "False"
                    var it = {'EyesOpen': "False"}
                    vars.push(it)
                }
                if (data.MouthOpen.Value) {
                    console.log(`  MouthOpen.Confidence:   ${data.MouthOpen.Confidence}`)
                    //data_response.MouthOpen = "True"
                    var it = {'MouthOpen': "True"}
                    vars.push(it)
                }
                else if (!data.MouthOpen.Value) {
                    //data_response.MouthOpen = "False"
                    var it = {'MouthOpen': "False"}
                    vars.push(it)
                }
                var Emotions = []
                for (var i = 0; i < data.Emotions.length; i++) {
                    if (data.Emotions[i].Confidence > 70) {
                        console.log(`  Emotions[${i}].Type:       ${data.Emotions[i].Type}`)
                        console.log(`  Emotions[${i}].Confidence: ${data.Emotions[i].Confidence}`)
                        var item = { "Type": data.Emotions[i].Type }
                        Emotions.push(item);
                    }
                }
                data_response.Vars = vars
                data_response.Emotions = Emotions
                console.log("------------")
                console.log("")
                console.log(data_response)
            })
            res.status(200).json(data_response);
        } // if
    });
});


//----------------------------------------------------- TRANSLATE -------------------------------------------------
app.post('/translate', function (req, res) {
    //Los lenguajes que podes tener en tu combo-box son estos 5 amigo:
    //es ->español, en ->inglés, fr ->francés, it ->italiano, zh ->chino
    let text = req.body.text
    let params = {
        SourceLanguageCode: 'auto',
        TargetLanguageCode: req.body.language || 'es',
        Text: text || 'Hello World'
    };
    translate.translateText(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            res.json({ mensaje: "Error, lenguaje no encontrado" });
        } else {
            res.json({ mensaje: data.TranslatedText });
        }
    });
});


// Analizar texto en imagen
app.post('/detectText', function (req, res) {
    var imagen = req.body.imagen;
    var params = {
        Image: {
            Bytes: Buffer.from(imagen, 'base64')
        }
    };
    client.detectText(params, function (err, data) {
        if (err) { res.json({ mensaje: "Error" }) }
        else {
            console.log(data);
            var data_response = {}
            var Texts = []
            data.TextDetections.forEach(response => {
                var data = { "Text": response.DetectedText }
                Texts.push(data);
                console.log(response.DetectedText);
            });
            data_response.Texts = Texts;
            console.log(data_response)
            res.json({ Texts });
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