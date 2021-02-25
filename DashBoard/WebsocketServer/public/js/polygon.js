(function connect() {

    let socket = io.connect('https://localhost:3001')
    
    let left = document.querySelector('#left')
    let right = document.querySelector('#right')
    let top = document.querySelector('#top')
    let bottom = document.querySelector('#bottom')
    let step = document.querySelector('#step')
    let selectionBtn = document.querySelector('#selectionBtnCoordinates')
    let selectionFile = document.querySelector("#filePolygon")

    socket.on('polygon', data => {
        if (data.update) {
            console.log('mise à jour du polygone');
            console.log('emit polygonUpdate');
            socket.emit('polygonUpdate', { update: true });
        } else {
            console.log('polygon ' + data.update + '/');
        }
    }).on("error", (err) => { console.log("Error polygon: " + err.message); });


    selectionBtn.addEventListener('click', e => {
        console.log('emit coordinates');
        socket.emit('coordinates', { left: left.value, right: right.value, top: top.value, bottom: bottom.value, step: step.value });
    });

    selectionFile.addEventListener('change', () => {
        console.log('File : ', selectionFile.files[0]);
        if (selectionFile.files[0]) {
            console.log('save and emit for polygon update');
            fileUpload = selectionFile.files[0];
            var reader = new FileReader();
            reader.readAsText(fileUpload, 'UTF-8');
            reader.onload = function (evt) {
                var fileString = evt.target.result;
                socket.emit('polygonLoad', { json: fileString });
            }
        }
    });


})()