const express = require('express');
const { exec } = require('child_process');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

var process = 0;

io.on('connection', (socket) => {

    socket.on('checkProcess', () => {
        checkProcessStatus(socket);
    });

    socket.on('killProcess', () => {
        exec('pkill -f PalServer', (error, stdout, stderr) => {
            if (error) {
                socket.emit('message', `Error: ${error.message}`);
                return;
            }
            if (stderr) {
                socket.emit('message', `stderr: ${stderr}`);
                return;
            }
            socket.emit('message', `서버 종료됨`);

        });

        setTimeout(() => {
            checkProcessStatus(socket);
        }, 4000);
    });

    socket.on('startProcess', () => {
        if (process >= 2) {
            socket.emit('message', `서버가 이미 실행 중입니다.`);
            checkProcessStatus(socket);
            return;
        }
        process = 2;
        socket.emit('message', `서버 실행 중..`);
        exec('nohup /home/steam/.steam/steam/steamapps/common/PalServer/PalServer.sh &', (error, stdout, stderr) => {
            if (error) {
                socket.emit('message', `Error: ${error.message}`);
                return;
            }
            if (stderr) {
                socket.emit('message', `stderr: ${stderr}`);
                return;
            }
            socket.emit('message', `Process started: ${stdout}`);

        });

        setTimeout(() => {
            checkProcessStatus(socket);
            socket.emit('message', ` `);
        }, 2000);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });

    setInterval(() => {
        exec('free -h', (error, stdout, stderr) => {
            socket.emit('memory', stdout);
        });
        exec('mpstat', (error, stdout, stderr) => {
            socket.emit('cpu', stdout);
        });
    }, 1000);



});

function checkProcessStatus(socket) {
    exec("pgrep -c PalServer", (error, stdout, stderr) => {
        console.log(stdout);
        process = stdout;
        socket.emit('processStatus', process);
    });
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});