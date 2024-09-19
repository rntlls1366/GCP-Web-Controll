const express = require('express');
const { exec } = require('child_process');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const dotenv = require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PROCESS_NAME = process.env.PROCESS_NAME;
const SCRIPT_URL = "/home/steam/.steam/steam/steamapps/common/PalServer/PalServer.sh";

app.use(express.static('public'));

var process_num = 0;

io.on('connection', (socket) => {

    socket.on('checkProcess', () => {
        checkProcessStatus(socket);
    });

    socket.on('killProcess', () => {
        exec(`pkill -f ${PROCESS_NAME}`, (error, stdout, stderr) => {
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
        if (process_num >= 2) {
            socket.emit('message', `서버가 이미 실행 중입니다.`);
            checkProcessStatus(socket);
            return;
        }
        process_num = 2;
        socket.emit('message', `서버 실행 중..`);
        exec(`nohup ${SCRIPT_URL} &`, (error, stdout, stderr) => {
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
    exec(`pgrep -c ${PROCESS_NAME}`, (error, stdout, stderr) => {
        console.log(stdout);
        process_num = stdout;
        socket.emit('processStatus', process_num);
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view/index.html'));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});