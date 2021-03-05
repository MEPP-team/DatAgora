const https = require('https');
const fs = require('fs');

const inseeLyon = ["69381", "69382", "69383", "69384", "69385", "69386", "69387", "69388", "69389"];
const typoEspaceVegetal = [
    "Espaces verts urbains",
    "Terres arables hors perimetres d irrigation",
    "Forets de feuillus",
    "Prairies et autres surfaces toujours en herbe a usage agricole",
    "Landes et broussailles",
    "Vergers et petits fruits",
    "Pelouses naturelles",
    "Vignobles",
    "Foret et vegetation arbustive en mutation",
    "Surfaces essentiellement agricoles interrompues par des espaces naturels importants",
    "Forets de coniferes",
    "Zones humides",
    "Forets mélangees"
]

// to create a polygon with a rectangle define by left, right, top and bottom coordinates
function createPolygoneFromRectPoints(left, right, top, bottom, step) {

    return new Promise(function (resolve, reject) {
        var tab = [];
        for (var i = left; i <= right; i += step) {
            tab.push([i, top]);
        }
        for (var i = top - step; i >= bottom; i -= step) {
            tab.push([right, i]);
        }
        for (var i = right - step; i >= left; i -= step) {
            tab.push([i, bottom]);
        }
        for (var i = bottom + step; i <= top; i += step) {
            tab.push([left, i]);
        }

        fs.writeFile('./assets/data/polygon.json', JSON.stringify(tab), function (err) {
            if (err) reject(err);
            else {
                console.log('Ecriture du fichier');
                resolve(tab);
            }
        });
    });
};

// to create a polygon with a json file uploaded
function createPolygoneFromFile(jsonData) {

    return new Promise(function (resolve, reject) {
        fs.writeFile('./assets/data/polygon.json', JSON.stringify(jsonData), function (err) {
            if (err) reject(err);
            else {
                console.log('Ecriture du fichier');
                resolve(jsonData);
            }
        });
    });
};

// to calculate the surface of a polygon
function surface(polygon) {
    var sum = 0;
    var nbPoints = polygon.length;
    for (var i = 0; i < nbPoints - 1; i++) {
        var j = (i + 1 + nbPoints) % nbPoints;
        sum += polygon[i][1] * polygon[j][0] - polygon[j][1] * polygon[i][0];
    }
    sum = sum / 2;
    return Math.abs(sum);
}

// return true if a point (x,y) is in the polygon
function pointDansPolygone(x, y, polygon) {
    var nb = polygon.length;

    var inside = false;
    for (var i = 0, j = nb - 1; i < nb; j = i++) {
        var xi = polygon[i][0],
            yi = polygon[i][1];
        var xj = polygon[j][0],
            yj = polygon[j][1];

        var intersect =
            yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }

    return inside;
}

// take alignements and its property from data Grandlyon wich are in a given polygon
function alignementSecteur(alignementsRef, polygonSecteur,  properties) {
    var tab = [];
    alignementsRef.features.forEach(function (entry) {
        if (pointDansPolygone(entry.geometry.coordinates[0], entry.geometry.coordinates[1], polygonSecteur)) {
            tab.push({
                properties: entry.properties[properties],
                rayoncouronne_m: entry.properties.rayoncouronne_m,
                geometry: {
                    type: "Point",
                    coordinates: [
                        entry.geometry.coordinates[0],
                        entry.geometry.coordinates[1]
                    ]
                }                
            });
        }
    });
    return tab;
}

// take parcsJardins and its name (properties) which are in a given polygon
function parcsJardinsSecteur(parcsJardinsRef, polygonSecteur, properties) {
    var tab = [];
    parcsJardinsRef.features.forEach(function (entry) {
        var parcsJardins = [];
        entry.geometry.coordinates[0].forEach(function (point) {
            if (pointDansPolygone(point[0], point[1], polygonSecteur)) {
                parcsJardins.push([point[0], point[1]]);
            }
        });
        var nbPointsIn = parcsJardins.length;
        if (nbPointsIn > 0) {
            // add a point if first coordinates and last are different, could hapen if the polygon of parc is not totally inside the polygonSecteur
            if (parcsJardins[0][0] !== parcsJardins[nbPointsIn - 1][0] || parcsJardins[0][1] !== parcsJardins[nbPointsIn - 1][1]) {
                parcsJardins.push(parcsJardins[0]);
            }

            tab.push({ properties: entry.properties[properties], surface: surface(parcsJardins), geometry: { type: "Polygon", coordinates: [parcsJardins] } });
        }
    });
    return tab;
}

// create an array of the vegetal of a given polygon from alignement reference
function dataVegetal(alignementsRef, polygonSecteur, properties, value) {

    var tab = [];
    alignementsRef.features.forEach(function (entry, index) {
        if (
            pointDansPolygone(
                entry.geometry.coordinates[0],
                entry.geometry.coordinates[1],
                polygonSecteur
            )
        ) {
            tab.push(alignementsRef.features[index].properties[properties]);
        }
    });
    var tabVegetals = [...new Set(tab)];

    var listVegetals = [];
    tabVegetals.forEach(function (entry, index) {
        var vegetal = { type: "", nombre: 0, surface: 0 };
        vegetal['type'] = entry;
        var filtre = alignementSecteur(alignementsRef, polygonSecteur, properties).filter(
            d => d.properties === entry
        );
        console.log('alignement secteur ', filtre);
        vegetal['nombre'] = filtre.length;
        vegetal['surface'] = Array.from(
            filtre,
            x =>
                Math.pow(
                    isNaN(x.rayoncouronne_m)
                        ? 1
                        : x.rayoncouronne_m,
                    2
                ) * Math.PI
        ).reduce(reducer);
        listVegetals.push(vegetal);
    });
    return listVegetals.sort((a, b) => b[value] - a[value])
    .filter(d => d.type !== "Emplacement libre")

}
// use for dataVegetal
function reducer(accumulator, currentValue) { return accumulator + currentValue }


// function to get parcsJardins in a given polygon
function parcsJardinsPolygon(parcsJardins, polygon) {
    var tab = [];
    parcsJardins.features.forEach(function (entry) {
        var pJPolygon = [];
        entry.geometry.coordinates[0].forEach(function (pointParc) {
            if (pointDansPolygone(pointParc[0], pointParc[1], polygon)) {
                pJPolygon.push([pointParc[0], pointParc[1]]);
            }
        });
        var nbPointsIn = pJPolygon.length;

        if (nbPointsIn > 0) {
            // add a point if first coordinates and last are different, could hapen if the polygon of parc is not totally inside the polygonSecteur
            if (
                pJPolygon[0][0] !== pJPolygon[nbPointsIn - 1][0] ||
                pJPolygon[0][1] !== pJPolygon[nbPointsIn - 1][1]
            ) {
                pJPolygon.push(pJPolygon[0]);
            }
            tab.push({
                properties: entry.properties,
                geometry: { type: "Polygon", coordinates: [pJPolygon] }
            });
        }
    });
    return tab;
}

// function to get espacesVegetalises in a given polygon
function espaceVegetalePolygon(espaceVegetale, polygon) {
    var tab = [];
    espaceVegetale.forEach(function (entry) {
        var espaceVPolygon = [];
        entry.geometry.coordinates[0].forEach(function (pointParc) {
            if (pointDansPolygone(pointParc[0], pointParc[1], polygon)) {
                espaceVPolygon.push([pointParc[0], pointParc[1]]);
            }
        });
        var nbPointsIn = espaceVPolygon.length;

        if (nbPointsIn > 0) {
            // add a point if first coordinates and last are different, could hapen if the polygon of parc is not totally inside the polygonSecteur
            if (
                espaceVPolygon[0][0] !== espaceVPolygon[nbPointsIn - 1][0] ||
                espaceVPolygon[0][1] !== espaceVPolygon[nbPointsIn - 1][1]
            ) {
                espaceVPolygon.push(espaceVPolygon[0]);
            }
            tab.push({
                properties: entry.properties,
                geometry: { type: "Polygon", coordinates: [espaceVPolygon] }
            });
        }
    });
    return tab;
}

function communesLyonSysteme(communesGrandLyonSyteme) {
    var tab = [];
    for (var i = 0; i < communesGrandLyonSyteme.features.length; i++) {
        if (inseeLyon.indexOf(communesGrandLyonSyteme.features[i].properties.insee) !== -1) {
            tab.push(communesGrandLyonSyteme.features[i]);
        }
    }
    return tab;
}

function espacesVegetalises(espacesVegetalisesArtificialises) {
    var tab = [];
    for(var i = 0; i<espacesVegetalisesArtificialises.features.length; i++) {
        if (
            typoEspaceVegetal.indexOf(
                espacesVegetalisesArtificialises.features[i].properties.libelle
            ) !== -1
        ) {
            tab.push(espacesVegetalisesArtificialises.features[i]);
        }
    }
    return tab;
}

function espacesVegetalisesLyon(communesLyonEPSG3946, parcsJardinsGdLyon, espacesVegetalises) {
    var surfaceTab = [];
    for(var i = 0; i<communesLyonEPSG3946.length; i++) {
        var tabSurfacePJ = parcsJardinsPolygon(
            parcsJardinsGdLyon,
            communesLyonEPSG3946[i].geometry.coordinates[0]
        );
        var surfacePJ = 0;
        if (tabSurfacePJ.length > 0) {
            for (var j = 0; j < tabSurfacePJ.length; j++) {
                surfacePJ += surface(tabSurfacePJ[j].geometry.coordinates[0]);
            }
        }
        var tabSurfaceEV = espaceVegetalePolygon(
            espacesVegetalises,
            communesLyonEPSG3946[i].geometry.coordinates[0]
        );
        var surfaceEV = 0;
        if (tabSurfaceEV.length > 0) {
            for (var j = 0; j < tabSurfaceEV.length; j++) {
                surfaceEV += surface(tabSurfaceEV[j].geometry.coordinates[0]);
            }
        }
        surfaceTab.push({
            insee: communesLyonEPSG3946[i].properties.insee,
            surface: surface(communesLyonEPSG3946[i].geometry.coordinates[0]),
            surfacePJ: surfacePJ,
            surfaceEV: surfaceEV
        });
    }
    return surfaceTab;
}

function espacesVegetalisesAvecPourcentageLyon(espacesVegetalisesLyon) {
    var tab = [];
    for (var i = 0; i < espacesVegetalisesLyon.length; i++) {
        tab.push({
            insee: espacesVegetalisesLyon[i].insee,
            surface: espacesVegetalisesLyon[i].surface,
            surfacePJ: espacesVegetalisesLyon[i].surfacePJ,
            tauxPJ:
                Math.round(
                    (1000 * espacesVegetalisesLyon[i].surfacePJ) / espacesVegetalisesLyon[i].surface
                ) / 1000,
            surfaceEV: espacesVegetalisesLyon[i].surfaceEV,
            tauxEV:
                Math.round(
                    (1000 * espacesVegetalisesLyon[i].surfaceEV) / espacesVegetalisesLyon[i].surface
                ) / 1000
        });
    }
    return tab;
}

// load data from an url API (of data.grandlyon
// URL des parcs et jardins : "https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=com_donnees_communales.comparcjardin_1_0_0&outputFormat=application/json; subtype=geojson&SRSNAME=EPSG:3946&startIndex=0"
// URL des alignements : "https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=abr_arbres_alignement.abrarbre&outputFormat=application/json; subtype=geojson&SRSNAME=EPSG:3946&startIndex=0"
async function loadURL(url, file) {
    https.get(url, (resp) => {
        let data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            console.log("Data loaded!");
            fs.writeFile('./assets/data/' + file + '.json', data, function (err) {

                if (err) throw err;

                console.log('Fichier créé !');
            });
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}


exports.createPolygoneFromRectPoints = createPolygoneFromRectPoints;
exports.createPolygoneFromFile = createPolygoneFromFile;
exports.surface = surface;
exports.pointDansPolygone = pointDansPolygone;
exports.alignementSecteur = alignementSecteur;
exports.parcsJardinsSecteur = parcsJardinsSecteur;
exports.dataVegetal = dataVegetal;
exports.loadURL = loadURL;
exports.communesLyonSysteme = communesLyonSysteme;
exports.espacesVegetalises = espacesVegetalises;
exports.espacesVegetalisesLyon = espacesVegetalisesLyon;
exports.espacesVegetalisesAvecPourcentageLyon = espacesVegetalisesAvecPourcentageLyon;