# Chat-Group-Websocket

## Running Locally

```sh
git clone -b serverless --single-branch https://github.com/tomchou-tp/Chat-Group-Websocket.git
cd Chat-Group-Websocket
(Add redis information which includes host, port and password in handler.js)
npm install
npm install -g serverless
serverless offline
```

If get the following error when running command "serverless offline" on Windows 10 <br />
serverless : File ...\serverless.ps1 cannot be loaded because running scripts is disabled on this system. <br />
You can run PowerShell as administrator, then input "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" <br />
Ref: https://stackoverflow.com/questions/63423584/how-to-fix-error-nodemon-ps1-cannot-be-loaded-because-running-scripts-is-disabl <br />

Host(房間主持人): http://localhost:3000/dev/host.html <br />
User(房間成員): http://localhost:3000/dev/user.html <br />