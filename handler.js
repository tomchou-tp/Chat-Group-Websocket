const serverless = require("serverless-http");
const express = require("express");
const axios = require('axios')
const app = express();
const redis = require("redis");
const redis_client = redis.createClient({
    host: "",
    port: 15533,
    password: ""
});

function usr_info(usr_id, ws_conn_id, cordn_sync_ctl) {
    this.usr_id = usr_id;
    this.ws_conn_id = ws_conn_id;
    this.cordn_sync_ctl = cordn_sync_ctl;
}

function ws_send(ws_conn_id, data) {
    axios
        .post("http://localhost:3001/@connections/" + ws_conn_id, data)
        .then(res => {
        })
        .catch(error => {
            // console.error(error)
        })
}

function redis_get(key) {
    return new Promise((resolve, reject) => {
        redis_client.get(key, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    })
}

function redis_set(key, val) {
    return new Promise((resolve, reject) => {
        redis_client.set(key, val, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    })
}

function rcv_msg(msg, ws_conn_id) {
    let out_msg;
    msg = JSON.parse(msg);
    switch (msg.func_id) {
        case "create":
            let room_info = [new usr_info(msg.usr_id, ws_conn_id, false)];
            redis_client.set(msg.room_id, JSON.stringify(room_info), (err, res) => {
                if (!err) {
                    out_msg = {
                        func_id: "create_res",
                        code: 0
                    };
                    ws_send(ws_conn_id, JSON.stringify(out_msg));
                }
            });
            break;
        case "join":
            redis_client.get(msg.room_id, (err, res) => {
                if (!err) {
                    if (res != null) {
                        let room_info = JSON.parse(res);
                        let is_new_user = true;
                        for (let i = 0; i < room_info.length; i++) {
                            if (msg.usr_id == room_info[i]["usr_id"]) {
                                if (room_info[i].ws_conn_id != ws_conn_id) {
                                    ws_send(room_info[i].ws_conn_id, JSON.stringify({func_id: "close"}));
                                    room_info[i].ws_conn_id = ws_conn_id;
                                }
                                is_new_user = false;
                                break;
                            }
                        }
                        if (is_new_user)
                            room_info.push(
                                new usr_info(msg.usr_id, ws_conn_id, true)
                            );
                        redis_client.set(msg.room_id, JSON.stringify(room_info), (err, res) => {
                            if (!err) {                                
                                out_msg = {
                                    func_id: "join_res",
                                    code: 0
                                };
                                ws_send(ws_conn_id, JSON.stringify(out_msg));
                            }
                        });
                    } else {
                        out_msg = {
                            func_id: "join_res",
                            code: 1
                        };
                        ws_send(ws_conn_id, JSON.stringify(out_msg));
                    }
                }
            });
            break;
        case "msg":
            redis_get(msg.room_id).then((res) => {
                if (res != null) {
                    let room_info = JSON.parse(res);
                    msg.func_id = "msg_res";
                    msg.code = 0;
                    let out_msg = JSON.stringify(msg);
                    for (let i = 0; i < room_info.length; i++) {
                        ws_send(room_info[i]["ws_conn_id"], out_msg);
                    }
                } else {
                    let out_msg = {
                        func_id: "msg_res",
                        code: 1
                    };
                    ws_send(ws_conn_id, JSON.stringify(out_msg));
                }
            });
            break;
        case "cordn":
            redis_get(msg.room_id).then((res) => {
                if (res != null) {
                    let room_info = JSON.parse(res);
                    if (msg["usr_id"] == room_info[0]["usr_id"]) {
                        delete msg.usr_id;
                        msg.func_id = "cordn_res";
                        msg.code = 0;
                        let out_msg = JSON.stringify(msg);
                        for (let i = 1; i < room_info.length; i++) {
                            if (room_info[i]["cordn_sync_ctl"]) {
                                ws_send(room_info[i]["ws_conn_id"], out_msg);
                            }
                        }
                    }
                } else {
                    let out_msg = {
                        func_id: "cordn_res",
                        code: 1
                    };
                    ws_send(ws_conn_id, JSON.stringify(out_msg));
                }
            });          
            break;
        default:
            break;
    }
}

exports.connectHandler = async function connect(event, context, callback) {
}

exports.disconnectHandler = async function disconnect(event, context, callback) {
}

exports.defaultHandler = async function disconnect(event, context, callback) {
    rcv_msg(event.body, event.requestContext.connectionId);
}

exports.expressHandler = serverless(app);

app.use(express.json());
app.use(express.static("public"));

app.post("/cordn_sync_ctl", function(req, res) {
    redis_get(req.body.room_id)
    .then((res) => {
        if (res != null) {
            let room_info = JSON.parse(res);
            if (room_info[0]["usr_id"] != req.body.usr_id) {
                for (let i = 0; i < room_info.length; i++) {
                    if (req.body.usr_id == room_info[i]["usr_id"]) {
                        room_info[i]["cordn_sync_ctl"] = req.body.cordn_sync_ctl;
                        return redis_set(req.body.room_id, JSON.stringify(room_info));
                    }
                }
            }
        }
    })
    res.send();
});

app.post("/reset", function(req, http_post_res) {
    redis_client.scan(
        0,
        "MATCH", "*",
        "COUNT", '10',
        function (err, redis_scan_res) {
            if (err) throw err;
            var cursor = redis_scan_res[0];
            var keys = redis_scan_res[1];

            if (keys.length > 0) {
                for (let i = 0; i < keys.length; i++) {
                    redis_get(keys[i]).then((redis_get_res) => {
                        let cur_room_info = JSON.parse(redis_get_res);
                        let usr_keys = Object.keys(cur_room_info);
                        for (let j = 0; j < usr_keys.length; j++) {
                            let out_msg = {
                                func_id: "close"
                            };
                            ws_send(cur_room_info[usr_keys[j]].ws_conn_id, JSON.stringify(out_msg));
                        }
                    })                    
                }
            }
            if (cursor === '0') {                
                redis_client.flushdb();
                http_post_res.send();
                return;
            }
            return scan();
        }
    );
});