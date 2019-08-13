"use strict";

// Built-in Dependencies
const cp = require("child_process");
const Server = require("http").Server;
const os = require("os");
const path = require("path");

// Third Party Dependencies
const express = require("express");
const { Board } = require("johnny-five");
const Socket = require("socket.io");

// Application, Server, Socket and video
const app = express();
const server = new Server(app);
const socket = new Socket(server);

// Configure express application server:
app.use(express.static(path.join(__dirname, "app")));

// Start the HTTP Server
const port = process.env.PORT || 80;
const listen = new Promise(resolve => {
  server.listen(port, resolve);
});


// Initialize the Board
const board = new Board({
    port: '/dev/tty.orca-DevB',
});

board.on("ready", () => {

  console.log("ORCA: Initialized");
  socket.on("connection", connection => {
    console.log("ORCA: Controller Connected");
    
  });

  listen.then(() => {
    console.log(`http://${os.hostname()}.local`);
    console.log(`http://${os.networkInterfaces().wlan0[0].address}`);

    process.on("SIGINT", () => {
      server.close();
      process.exit();
    });
  });
});
