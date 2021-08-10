const webSocket = require("ws");
const express = require("express");
const http = require("http");
var room_info = {};

function usr_info(usr_id, ws, cordn_sync_ctl) {
    this.usr_id = usr_id;
    this.ws = ws;
    this.cordn_sync_ctl = cordn_sync_ctl;
}

function rcv_msg(msg, ws) {
    let out_msg;
    msg = JSON.parse(msg);
    switch (msg.func_id) {
        case "create":
            room_info[msg.room_id] = [
                new usr_info(msg.usr_id, ws, false)
            ];
            out_msg = {
                func_id: "create_res",
                code: 0
            };
            ws.send(JSON.stringify(out_msg));
            break;
        case "join":
            if (room_info[msg.room_id] !== undefined) {
                let is_new_user = true;
                for (let i = 0; i < room_info[msg.room_id].length; i++) {
                    if (msg.usr_id == room_info[msg.room_id][i]["usr_id"]) {
                        if (room_info[msg.room_id][i].ws != ws) {
                            room_info[msg.room_id][i].ws.close(4000);
                            room_info[msg.room_id][i].ws = ws;
                        }
                        is_new_user = false;
                        break;
                    }
                }
                if (is_new_user)
                    room_info[msg.room_id].push(
                        new usr_info(msg.usr_id, ws, true)
                    );
                out_msg = {
                    func_id: "join_res",
                    code: 0
                };
                ws.send(JSON.stringify(out_msg));
            } else {
                out_msg = {
                    func_id: "join_res",
                    code: 1
                };
                ws.send(JSON.stringify(out_msg));
            }
            break;
        case "msg":
            out_msg = {};
            if (room_info[msg.room_id] === undefined) {
                out_msg = {
                    func_id: "msg_res",
                    code: 1
                };
                ws.send(JSON.stringify(out_msg));
                break;
            }
            msg.func_id = "msg_res";
            msg.code = 0;
            out_msg = JSON.stringify(msg);
            for (let i = 0; i < room_info[msg.room_id].length; i++) {
                room_info[msg.room_id][i]["ws"].send(out_msg);
            }
            break;
        case "cordn":
            if (room_info[msg.room_id] === undefined) {                
                out_msg = {
                    func_id: "cordn_res",
                    code: 1
                };
                ws.send(JSON.stringify(out_msg));
            };
            if (msg["usr_id"] == room_info[msg.room_id][0]["usr_id"]) {
                delete msg.usr_id;
                msg.func_id = "cordn_res";
                msg.code = 0;
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

const ws_serv = new webSocket.Server({ noServer: true });
ws_serv.on("connection", (ws) => {
    ws.on("message", (msg) => {
        rcv_msg(msg, ws);
    }); 
});

const app = express();
app.use(express.json());
app.use(express.static("public"));

const serv = http.createServer(app);

serv.listen(process.env.PORT || 8443, function() {
    console.log("Web server is running.");
});

serv.on("upgrade", (request, socket, head) => {
    ws_serv.handleUpgrade(request, socket, head, socket => {
        ws_serv.emit("connection", socket, request);
    });
  }
);

app.post("/cordn_sync_ctl", function(req, res) {
    if (room_info[req.body.room_id] !== undefined &&
        room_info[req.body.room_id][0]["usr_id"] != req.body.usr_id
    ) {
        for (let i = 0; i < room_info[req.body.room_id].length; i++) {
            if (req.body.usr_id == room_info[req.body.room_id][i]["usr_id"]) {
                room_info[req.body.room_id][i]["cordn_sync_ctl"] = req.body.cordn_sync_ctl;
                break;
            }
        }
    }
    res.send();
});

app.post("/reset", function(req, res) {
    for (let i = 0; i < Object.keys(room_info).length; i++) {
        for (let j = 0; j < room_info[Object.keys(room_info)[i]].length; j++) {
            room_info[Object.keys(room_info)[i]][j]["ws"].close(4000);
        }
    }
    room_info = {};
    res.send();
});