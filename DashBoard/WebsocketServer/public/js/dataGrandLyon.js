(function getData() {

    let socket = io.connect('https://localhost:3001')

    let file = document.querySelector('#file')
    let url = document.querySelector('#url')
    let loadBtn = document.querySelector('#loadBtn')

    loadBtn.addEventListener('click', e => {
        console.log('click on button')
        socket.emit('dataGrandLyon', { url: url.value, file:file.value });
    })

})()