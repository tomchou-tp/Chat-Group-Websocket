const webSocket = require('ws');
const express = require('express');
const https = require('https');
const fs = require('fs');
var room_info = {};

function usr_info(usr_id, ws, cordn_sync_ctl) {
    this.usr_id = usr_id;
    this.ws = ws;
    this.cordn_sync_ctl = cordn_sync_ctl;
}

function rcv_msg(msg, ws) {
    msg = JSON.parse(msg);
    switch (msg.func_id) {
        case "conn":
            if (room_info[msg.room_id] === undefined) {
                room_info[msg.room_id] = [
                    new usr_info(msg.usr_id, ws, false)
                ];
            } else {
                for (let i = 0; i < room_info[msg.room_id].length; i++) {
                    if (msg.usr_id == room_info[msg.room_id][i]['usr_id']) {
                        if (room_info[msg.room_id][i].ws != ws) {
                            room_info[msg.room_id][i].ws.close();
                            room_info[msg.room_id][i].ws = ws;
                        }
                        return;
                    }
                }
                room_info[msg.room_id].push(
                    new usr_info(msg.usr_id, ws, true)
                );
            }
            break;
        case "msg":
            if (room_info[msg.room_id] === undefined) break;
            out_msg = JSON.stringify(msg);
            for (let i = 0; i < room_info[msg.room_id].length; i++) {
                room_info[msg.room_id][i]["ws"].send(out_msg);
            }
            break;
        case "cordn":
            if (room_info[msg.room_id] === undefined) break;
            if (msg["usr_id"] == room_info[msg.room_id][0]["usr_id"]) {
                delete msg.usr_id;
                out_msg = JSON.stringify(msg);
                for (let i = 1; i < room_info[msg.room_id].length; i++) {
                    if (room_info[msg.room_id][i]["cordn_sync_ctl"]) {
                        room_info[msg.room_id][i]["ws"].send(out_msg);
                    }
                }
            }
            break;
        default:
            break;
    }
}

const wss = new webSocket.Server({ noServer: true });
wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        rcv_msg(msg, ws);
    }); 
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

const serv = https.createServer({
	key: fs.readFileSync("./cert/key"),
    cert: fs.readFileSync("./cert/cert")
}, app);

serv.listen(8443, function() {
    console.log('runing Web Server in ' + 8443 + ' port...');
});

serv.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit('connection', socket, request);
    });
  }
);

app.post('/cordn_sync_ctl', function(req, res) {
    if (room_info[req.body.room_id] !== undefined &&
        room_info[req.body.room_id][0]['usr_id'] != req.body.usr_id
    ) {
        for (let i = 0; i < room_info[req.body.room_id].length; i++) {
            if (req.body.usr_id == room_info[req.body.room_id][i]['usr_id']) {
                room_info[req.body.room_id][i]['cordn_sync_ctl'] = req.body.cordn_sync_ctl;
                break;
            }
        }
    }
    res.send();
});

app.post('/reset', function(req, res) {
    for (let i = 0; i < Object.keys(room_info); i++) {
        for (let j = 0; i < room_info[i].length; i++) {
            room_info[i][j]['ws'].close();
        }
    }
    room_info = {};
    res.send();
});