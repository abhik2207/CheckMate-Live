const express = require('express');
const chalk = require('chalk');
const path = require('path');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = 'w';

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    console.log(chalk.hex('#03befc').bold('~ Homepage fetched!'));
    res.render('index.ejs', { title: 'CheckMate Live' });
});

io.on("connection", (uniqueSocket) => {
    console.log(chalk.hex('#03befc').bold(`~ ${uniqueSocket.id} connected!`));

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit('playerRole', 'w');
    }
    else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit('playerRole', 'b');
    }
    else {
        uniqueSocket.emit('spectatorRole');
    }

    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        }
        else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
        console.log(chalk.hex('#f23224').bold(`~ ${uniqueSocket.id} disconnected!`));
    });
    
    uniqueSocket.on("move", (move) => {
        try {
            if(chess.turn() === 'w' && uniqueSocket.id !== players.white) return;
            if(chess.turn() === 'b' && uniqueSocket.id !== players.black) return;
            
            const result = chess.move(move);

            if(result) {
                currentPlayer = chess.turn();

                console.log(chalk.hex('#03befc').bold(`~ ${uniqueSocket.id} moved a piece!`));
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            }
            else {
                console.log(chalk.hex('#f23224').bold({'~ Invalid move': move}));
                uniqueSocket.emit("invalidMove", move);
            }
        }
        catch (err) {
            console.log(err);
            console.log(chalk.hex('#f23224').bold({'~ Invalid move': move}));
            uniqueSocket.emit("invalidMove", move);
        }
    });
});

server.listen(8080, () => {
    console.log(chalk.hex('#ffd000').underline.bold("--- SERVER RUNNING AT PORT 8080 ---"));
});