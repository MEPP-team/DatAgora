const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const socketio = require('socket.io');
const url = require('url');
const express = require('express');
const favicon = require('serve-favicon');
const utils = require('./utils/utils.js');

const { table } = require('console');

var tabUsersId = [];
var privateKey = fs.readFileSync('./ssl/key.pem', 'utf-8');
var certificate = fs.readFileSync('./ssl/cert.pem', 'utf8');

var credentials = { key: privateKey, cert: certificate };

const appWS = express();
const appSite = express();

// routes of the websocket server
const listeRoutesWebsocket = ['/dataPolygon', '/dataVegetal', '/dataAlignements', '/dataParcsJardins', '/dataGeoLyon', '/dataEspacesVegetalisesPourcentageLyon'];

// for CORS
appSite.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

appSite.set('view engine', 'ejs');
appSite.use(express.static('public'));
appSite.use(favicon(__dirname + '/public/images/favicon.ico'));

// routes of the web site
appSite.get('/', (req, res) => {
    res.render('index');
})

appSite.get('/polygon', (req, res) => {
    res.render('polygon');
})

appSite.get('/dataGrandLyon', (req, res) => {
    res.render('dataGrandLyon');
})

appSite.get('/dashboard', (req, res) => {
    res.render('dashboard');;
})

// websocket server
const serverWS = https.createServer(credentials, appWS);
const wss_data = new WebSocket.Server({ server: serverWS, clientTracking: true });

// on connection dealing with the route to send data depending on pathname
wss_data.on('connection', (ws, request) => {
    const pathname = url.parse(request.url).pathname;
    // add an id to the websocket client to identify his path so we can adapt sending update data
    ws.id = tabUsersId.length;
    tabUsersId.push([tabUsersId.length, pathname]);
    // send the data corresponding to the path
    if (pathname === '/dataEspacesVegetalisesPourcentageLyon') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            if (fs.existsSync('./assets/data/espacesVegetalisesPourcentageLyon.json')) {
                const dataEspacesVegetalisesPourcentageLyon = JSON.parse(fs.readFileSync('./assets/data/espacesVegetalisesPourcentageLyon.json'));
                console.log("sending dataEspacesVegetalisesPourcentageLyon");
                ws.send(JSON.stringify({ type: "dataEspacesVegetalisesPourcentageLyon", value: dataEspacesVegetalisesPourcentageLyon }));
            } else {
                // créer le fichier à partir de dataEspacesVegetalisesLyon.json
                if (fs.existsSync('./assets/data/espacesVegetalisesLyon.json')) {
                    console.log('Création du fichier de données dataEspacesVegetalisesLyon');
                    console.log('lecture dataEspacesVegetalisesLyon.json');
                    const espacesVegetalisesLyon = JSON.parse(fs.readFileSync('./assets/data/espacesVegetalisesLyon.json'));
                    const dataEspacesVegetalisesPourcentageLyon = utils.espacesVegetalisesAvecPourcentageLyon(espacesVegetalisesLyon);
                    fs.writeFile('./assets/data/espacesVegetalisesPourcentageLyon.json', JSON.stringify(dataEspacesVegetalisesPourcentageLyon), function (err) {
                        if (err) {
                            throw err;
                            console.log("Erreur d'écriture des data Espaces Vegetalises avec pourcentage Lyon")
                        }
                        else {
                            console.log('Ecriture des data Espaces Vegetalises avec pourcentage Lyon');
                            console.log("sending dataEspacesVegetalisesPourcentageLyon");
                            ws.send(JSON.stringify({ type: "dataEspacesVegetalisesPourcentageLyon", value: dataEspacesVegetalisesPourcentageLyon }));
                        }
                    });
                } else {
                    // dataEspacesVegetalisesLyon.json absent
                    // créer le fichier à partie de communesLyonEPSG3946, parcsJardinsGdLyon, espacesVegetalises
                    if (fs.existsSync('./assets/data/communesLyonEPSG3946.json') && fs.existsSync('./assets/data/espacesVegetalises.json') && fs.existsSync('./assets/data/parcsJardins.json')) {
                        console.log('lectures communesLyonEPSG3946 parcsJardinsGdLyon espacesVegetalises')
                        const communesLyonEPSG3946 = JSON.parse(fs.readFileSync('./assets/data/communesLyonEPSG3946.json'));
                        const parcsJardinsGdLyon = JSON.parse(fs.readFileSync('./assets/data/parcsJardins.json'));
                        const espacesVegetalises = JSON.parse(fs.readFileSync('./assets/data/espacesVegetalises.json'));
                        console.log('appel espacesVegetalisesLyon');
                        const espacesVegetalisesLyon = utils.espacesVegetalisesLyon(communesLyonEPSG3946, parcsJardinsGdLyon, espacesVegetalises);
                        console.log('appel espacesVegetalisesAvecPourcentageLyon');
                        const dataEspacesVegetalisesPourcentageLyon = utils.espacesVegetalisesAvecPourcentageLyon(espacesVegetalisesLyon);
                        fs.writeFile('./assets/data/espacesVegetalisesLyon.json', JSON.stringify(espacesVegetalisesLyon), function (err) {
                            if (err) {
                                throw err;
                                console.log("Erreur d'écriture de espacesVegetalisesLyon")
                            }
                            else {
                                console.log('Ecriture de espacesVegetalisesLyon');
                                console.log('Création du fichier de données dataEspacesVegetalisesLyon');
                                fs.writeFile('./assets/data/espacesVegetalisesPourcentageLyon.json', JSON.stringify(dataEspacesVegetalisesPourcentageLyon), function (err) {
                                    if (err) {
                                        throw err;
                                        console.log("Erreur d'écriture des data Espaces Vegetalises avec pourcentage Lyon")
                                    }
                                    else {
                                        console.log('Ecriture des data Espaces Vegetalises avec pourcentage Lyon');
                                        console.log("sending dataEspacesVegetalisesPourcentageLyon");
                                        ws.send(JSON.stringify({ type: "dataEspacesVegetalisesPourcentageLyon", value: dataEspacesVegetalisesPourcentageLyon }));
                                    }
                                });
                            }
                        });
                    }
                    else {
                        console.log('Lecture de parcsJardinsGdLyon');
                        const parcsJardinsGdLyon = JSON.parse(fs.readFileSync('./assets/data/parcsJardins.json'));
                        var communesLyonEPSG3946 = "";
                        var espacesVegetalises = "";
                        if (!fs.existsSync('./assets/data/communesLyonEPSG3946.json')) {
                            console.log('communesLyonEPSG3946 inexistant')
                            const communesEPSG3946 = JSON.parse(fs.readFileSync('./assets/data/communesEPSG3946.json'));
                            communesLyonEPSG3946 = utils.communesLyonSysteme(communesEPSG3946);
                            fs.writeFile('./assets/data/communesLyonEPSG3946.json', JSON.stringify(communesLyonEPSG3946), function (err) {
                                if (err) {
                                    throw err;
                                    console.log("Erreur d'écriture de communesLyonEPSG3946")
                                }
                                else {
                                    console.log('Ecriture de communesLyonEPSG3946');
                                }
                            });
                        } else {
                            console.log('Lecture de communesLyonEPSG3946');
                            communesLyonEPSG3946 = JSON.parse(fs.readFileSync('./assets/data/communesLyonEPSG3946.json'));
                        }
                        if (!fs.existsSync('./assets/data/espacesVegetalises.json')) {
                            console.log('espacesVegetalises inexistant')
                            const espacesVegetalisesArtificialises = JSON.parse(fs.readFileSync('./assets/data/espacesVegetalisesArtificialises.json'));
                            espacesVegetalises = utils.espacesVegetalises(espacesVegetalisesArtificialises);
                            fs.writeFile('./assets/data/espacesVegetalises.json', JSON.stringify(espacesVegetalises), function (err) {
                                if (err) {
                                    throw err;
                                    console.log("Erreur d'écriture de espacesVegetalises")
                                }
                                else {
                                    console.log('Ecriture de espacesVegetalises');
                                }
                            });
                        } else {
                            console.log('Lecture de espacesVegetalises');
                            espacesVegetalises = JSON.parse(fs.readFileSync('./assets/data/espacesVegetalises.json'));
                        }
                        console.log('appel fonction espacesVegetalisesLyon');
                        const espacesVegetalisesLyon = utils.espacesVegetalisesLyon(communesLyonEPSG3946, parcsJardinsGdLyon, espacesVegetalises);
                        console.log('appel fonction espacesVegetalisesAvecPourcentageLyon');
                        const dataEspacesVegetalisesPourcentageLyon = utils.espacesVegetalisesAvecPourcentageLyon(espacesVegetalisesLyon);
                        fs.writeFile('./assets/data/espacesVegetalisesLyon.json', JSON.stringify(espacesVegetalisesLyon), function (err) {
                            if (err) {
                                throw err;
                                console.log("Erreur d'écriture de espacesVegetalisesLyon")
                            }
                            else {
                                console.log('Ecriture de espacesVegetalisesLyon');
                                console.log('Création du fichier de données dataEspacesVegetalisesLyon');
                                fs.writeFile('./assets/data/espacesVegetalisesPourcentageLyon.json', JSON.stringify(dataEspacesVegetalisesPourcentageLyon), function (err) {
                                    if (err) {
                                        throw err;
                                        console.log("Erreur d'écriture des data Espaces Vegetalises avec pourcentage Lyon")
                                    }
                                    else {
                                        console.log('Ecriture des data Espaces Vegetalises avec pourcentage Lyon');
                                        console.log("sending dataEspacesVegetalisesPourcentageLyon");
                                        ws.send(JSON.stringify({ type: "dataEspacesVegetalisesPourcentageLyon", value: dataEspacesVegetalisesPourcentageLyon }));
                                    }
                                });
                            }
                        });

                    }
                }
            }
        }
        catch (error) {
            console.log("Erreur. Aucun fichier dataEspacesVegetalisesPourcentageLyon n'existe ==> pas d'envoi");
        }
    }
    if (pathname === '/dataGeoLyon') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            if (fs.existsSync('./assets/data/communesLyonWFS84.json')) {
                const communesLyonWFS84 = JSON.parse(fs.readFileSync('./assets/data/communesLyonWFS84.json'));
                console.log("sending dataGeoLyon");
                ws.send(JSON.stringify({ type: "dataGeoLyon", value: communesLyonWFS84 }));
            } else {
                // créer le fichier à partir de communesWFS84.json
                if (fs.existsSync('./assets/data/communesWFS84.json')) {
                    console.log('Création du fichier de données communesLyonWFS84');
                    console.log('Lecture communesWFS84.json');
                    const communesWFS84 = JSON.parse(fs.readFileSync('./assets/data/communesWFS84.json'));
                    const communesLyonWFS84 = utils.communesLyonSysteme(communesWFS84);
                    fs.writeFile('./assets/data/communesLyonWFS84.json', JSON.stringify(communesLyonWFS84), function (err) {
                        if (err) {
                            throw err;
                            console.log("erreur d'écriture des data communes Lyon WFS84")
                        }
                        else {
                            console.log('Ecriture des data communes Lyon WFS84');
                            console.log("Sending dataGeoLyon");
                            ws.send(JSON.stringify({ type: "dataGeoLyon", value: communesLyonWFS84 }));
                        }
                    });
                } else {
                    // communesWFS84.json absent
                    console.log("Missing communesWFS84 to deliver dataGeoLyon. You must use API Lyon on URL https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=adr_voie_lieu.adrcommune&outputFormat=application/json; subtype=geojson&SRSNAME=EPSG:4326&startIndex=0")
                }
            }
        }
        catch (error) {
            console.log("Erreur. Aucun fichier dataGeoLyon n'existe ==> pas d'envoi");
        }
    }
    if (pathname === '/dataVegetal') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            const dataVegetal = JSON.parse(fs.readFileSync('./assets/data/dataVegetal.json'));
            ws.send(JSON.stringify({ type: "dataVegetal", value: dataVegetal }));
        }
        catch (error) {
            console.log("Aucun fichier dataVegetal n'existe ==> pas d'envoi");
        }
    }
    if (pathname === '/dataPolygon') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            const dataPolygon = JSON.parse(fs.readFileSync('./assets/data/polygon.json'));
            ws.send(JSON.stringify({ type: "dataPolygon", value: dataPolygon }));
        }
        catch (error) {
            console.log("Aucun fichier dataPolygon n'existe ==> pas d'envoi");
        }
    }
    if (pathname === '/dataParcsJardins') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            const dataParcsJardins = JSON.parse(fs.readFileSync('./assets/data/dataParcsJardins.json'));
            ws.send(JSON.stringify({ type: "dataParcsJardins", value: dataParcsJardins }));
        }
        catch (error) {
            console.log("Aucun fichier dataParcsJardins n'existe ==> pas d'envoi");
        }
    }
    if (pathname === '/dataAlignements') {
        console.log('new connection on websocket from "' + pathname + '"');
        try {
            const dataAlignements = JSON.parse(fs.readFileSync('./assets/data/dataAlignements.json'));
            ws.send(JSON.stringify({ type: "dataAlignements", value: dataAlignements }));
        }
        catch (error) {
            console.log("Aucun fichier dataAlignements n'existe ==> pas d'envoi");
        }
    }
    //we don't need to send other message than those from the server : at connection and when updating data
    /*ws.on('message', (data) => {
        wss_data.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN ) {
                client.send(data);
            }
        });
    });*/
});

// when upgrade the websocket 
serverWS.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    console.log('|' + pathname + '|');
    if (socket.connecting) {
        // look if pathname is a existing route to make connection or not
        if (listeRoutesWebsocket.indexOf(pathname) !== -1) {
            console.log('connect to websocket');
            wss_data.handleUpgrade(request, socket, head, function done(ws) {
                wss_data.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
            }
    }
});

// the websocketserver listen on port 8080
serverWS.listen(8080, () => {
    console.log("websocket server is running");
});


// web site part listening on port 3001
const serverSite = https.createServer(credentials, appSite);

serverSite.listen(process.env.PORT || 3001, () => {
    console.log("server is running");
});

//initialize socket for the website
const io = socketio(serverSite)

io.on('connection', (socket) => {
    console.log("New user connected");
    // if coordinates are changed, update the polygon and emit the message "polygon" to tell polygon is updated
    socket.on('coordinates', data => {
        console.log('left: ' + data.left + ' - right: ' + data.right + ' - top: ' + data.top + ' - bottom: ' + data.bottom + ' - step: ' + data.step);
        utils.createPolygoneFromRectPoints(parseFloat(data.left), parseFloat(data.right), parseFloat(data.top), parseFloat(data.bottom), parseFloat(data.step)).then(function () { socket.emit('polygon', { update: true }) }, function () { console.log("Echec") });
    }).on("error", (err) => {
        console.log("Error coordinates: " + err.message);
    });
    // if a new polygon is load emit message "polygon" to update to tell polygon is updated
    socket.on('polygonLoad', data => {
        console.log('data polygon loaded : ', data.json);
        utils.createPolygoneFromFile(JSON.parse(data.json)).then(function () { socket.emit('polygon', { update: true }) }, function () { console.log("Echec") });
    }).on("error", (err) => {
        console.log("Error coordinates: " + err.message);
    });
    // when polygon is updated, update the data and send message to websocket clients
    socket.on('polygonUpdate', data => {
        console.log('on polygonUpdate');
        if (data.update) {
            const parcsJardinsRef = JSON.parse(fs.readFileSync('./assets/data/parcsJardins.json'));
            const alignementsRef = JSON.parse(fs.readFileSync('./assets/data/alignements.json'));
            const polygonSecteur = JSON.parse(fs.readFileSync('./assets/data/polygon.json'));
            // for dataParcsJardins
            const dataParcsJardins = utils.parcsJardinsSecteur(parcsJardinsRef, polygonSecteur, 'nom');
            fs.writeFile('./assets/data/dataParcsJardins.json', JSON.stringify(dataParcsJardins), function (err) {
                if (err) {
                    throw err;
                    console.log("erreur d'écriture des data Parcs et Jardins")
                }
                else {
                    console.log('Ecriture des dataParcsJardins');
                    console.log("sending dataParcsJardins to ws client dataParcsJardins");
                    wss_data.clients.forEach(function each(ws) {
                        if (tabUsersId[ws.id][1] === '/dataParcsJardins') {
                            ws.send(JSON.stringify({ type: "dataParcsJardins", value: dataParcsJardins }));
                        }
                    });
                }
            });
            // for dataAlignements
            console.log('calcul alignements');
            const dataAlignements = utils.alignementSecteur(alignementsRef, polygonSecteur, 'genre');
            fs.writeFile('./assets/data/dataAlignements.json', JSON.stringify(dataAlignements), function (err) {
                if (err) {
                    throw err;
                    console.log("erreur d'écriture des data Alignements")
                }
                else {
                    console.log('Ecriture des dataAlignements');
                    console.log("sending dataAlignements to ws client dataAlignements");
                    wss_data.clients.forEach(function each(ws) {
                        if (tabUsersId[ws.id][1] === '/dataAlignements') {
                            ws.send(JSON.stringify({ type: "dataAlignements", value: dataAlignements }));
                        }
                    });
                }
            });
            // for dataVegetal
            const dataVegetal = utils.dataVegetal(alignementsRef, polygonSecteur, 'genre', 'nombre');
            fs.writeFile('./assets/data/dataVegetal.json', JSON.stringify(dataVegetal), function (err) {
                if (err) {
                    throw err;
                    console.log("erreur d'écriture des data Vegetal")
                }
                else {
                    console.log('Ecriture des dataVegetal');
                    console.log("sending dataVegetal to ws client dataVegetal");
                    wss_data.clients.forEach(function each(ws) {
                        if (tabUsersId[ws.id][1] === '/dataVegetal') {
                            ws.send(JSON.stringify({ type: "dataVegetal", value: dataVegetal }));
                        }
                    });
                }
            });
            // for dataPolygon
            console.log("sending dataPolygon to ws client dataPolygon");
            wss_data.clients.forEach(function each(ws) {
                if (tabUsersId[ws.id][1] === '/dataPolygon') {
                    ws.send(JSON.stringify({ type: "dataPolygon", value: polygonSecteur }));
                }
            });
            
        };
        }).on("error", (err) => {
            console.log("Error polygonUpdate: " + err.message);
    });
    // when data are to be loaded from API dataGrandLyon
    socket.on('dataGrandLyon', data => {
        const urlGranlyon = data.url;
        const file = data.file;
        console.log(urlGranlyon);
        utils.loadURL(urlGranlyon, file)
        }).on("error", (err) => {
            console.log("Error dataGrandLyon: " + err.message);
    });
})
