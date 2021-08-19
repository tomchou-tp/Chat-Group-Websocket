const redis = require("redis");
const client = redis.createClient({
    host: "redis-15533.c52.us-east-1-4.ec2.cloud.redislabs.com",
    port: 15533,
    password: "WJ5kWmzLar8dhHYSFlaGLINrX6MWwSlo"
});

function redis_get(key) {
    return new Promise((resolve, reject) => {
        client.get(key, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    })
}

function redis_set(key, val) {
    return new Promise((resolve, reject) => {
        client.set(key, val, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    })
}

function redis_del(key) {
    return new Promise((resolve, reject) => {
        client.del(key, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    })
}

// for (let i = 0; i < 20; i++) {
//     redis_set("key:" + i, i)
//     .then((reply) => {
//         console.log(reply);
//     })
// }

redis_set("key1", 123)
.then((res) => {
    return redis_get("key1");
})
.then((res) => {
    console.log(res)
    return redis_del("key1");
})
.then((res) => {
    return redis_get("key1");
})
.then((res) => {
    console.log(res);
})
.catch((err) => {
    console.log(err);
})

// console.log(client.scanIterator({
//     TYPE: 'string', // `SCAN` only
//     MATCH: 'key:*',
//     COUNT: 100
// }));

// var cursor = '0';

// function scan () {
//     client.scan(
//         cursor,
//         'MATCH', 'key:*',
//         'COUNT', '10',
//         function (err, res) {
//             if (err) throw err;

//             // Update the cursor position for the next scan
//             cursor = res[0];
//             // get the SCAN result for this iteration
//             var keys = res[1];

//             // Remember: more or less than COUNT or no keys may be returned
//             // See http://redis.io/commands/scan#the-count-option
//             // Also, SCAN may return the same key multiple times
//             // See http://redis.io/commands/scan#scan-guarantees
//             // Additionally, you should always have the code that uses the keys
//             // before the code checking the cursor.
//             if (keys.length > 0) {
//                 console.log('Array of matching keys', keys);
//             }

//             // It's important to note that the cursor and returned keys
//             // vary independently. The scan is never complete until redis
//             // returns a non-zero cursor. However, with MATCH and large
//             // collections, most iterations will return an empty keys array.

//             // Still, a cursor of zero DOES NOT mean that there are no keys.
//             // A zero cursor just means that the SCAN is complete, but there
//             // might be one last batch of results to process.

//             // From <http://redis.io/commands/scan>:
//             // 'An iteration starts when the cursor is set to 0,
//             // and terminates when the cursor returned by the server is 0.'
//             if (cursor === '0') {
//                 return console.log('Iteration complete');
//             }

//             return scan();
//         }
//     );
// }
// scan();



// redis_set("key", "love")
// .then((reply) => {
//     console.log(reply);
//     return redis_get("key");
// })
// .then((reply) => {
//     console.log(reply);
//     return redis_del("key");
// })
// .then((reply) => {
//     console.log(reply);
//     return redis_get("key");
// })
// .then((reply) => {
//     console.log(reply);
// })
// .catch((err) => {
//     console.log(err);
// })