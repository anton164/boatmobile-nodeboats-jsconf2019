const {Board, ESC, Fn, Led} = require('johnny-five');
const keypress = require('keypress');

// HTTP Server and Sockets
const os = require("os");
const path = require("path");
const Socket = require("socket.io");
const Server = require("http").Server;
const express = require("express");
const app = express();
const server = new Server(app);
const socket = new Socket(server);

// Configure express application server:
app.use(express.static(path.join(__dirname, "app")));

// Start the HTTP Server
const port = process.env.PORT || 81;
const listen = new Promise(resolve => {
  server.listen(port, resolve);
});

const board = new Board({
  port: '/dev/tty.orca-DevB', // path to bluetooth connection, i.e. /dev/tty.ROBOT_NAME-SPPDev or COMX
});

const STEP = 5;
const MAX_FORCE = 5;
const MAX_SPEED = 250;

board.on('ready', () => {
  const led = new Led(13);
  const leftESC = new ESC({
    device: 'FORWARD_REVERSE',
    pin: 10,
  });
  const rightESC = new ESC({
    device: 'FORWARD_REVERSE',
    pin: 11,
  });
  let speed = 0;
  let last = null;

  function throttle (leftChange, rightChange) {
    console.log('Throttling ESCs');
    console.log(`Speed: ${speed}`);
    console.log(`Left change: ${leftChange}`);
    console.log(`Right change: ${rightChange}`);
    leftESC.throttle(leftChange);
    rightESC.throttle(rightChange);
  }
  
  function stop () {
    throttle(ESCNeutral, ESCNeutral);
  }

  function moveForward () {
    throttle(ESCNeutral + 50, ESCNeutral + 50);
  }

  function forceToSpeed (force) {
    return (force / MAX_FORCE) * (MAX_SPEED);
  }

  function throttleFromJoystick ({event, data}) {
    if (event.type === 'end') {
      stop();
    } else {
      moveForward(forceToSpeed(force));
    }
  }

  // just to make sure the program is running
  led.blink(500);

  function controller(_, key) {
    let leftChange = 0;
    let rightChange = 0;
    ESCNeutral = leftESC.neutral;
    if (key) {
      if (!key.shift) {
        leftChange = ESCNeutral;
        rightChange = ESCNeutral;
        speed = 0;
      } else {
        if (key.name === 'up' || key.name === 'down') {
          if (last !== key.name) {
            leftChange = ESCNeutral;
            rightChange = ESCNeutral;
            speed = 0;
          } else {
            speed += STEP;
            change =
              key.name === 'up' ? ESCNeutral + speed : ESCNeutral - speed;
            leftChange = change;
            rightChange = change;
          }
          last = key.name;
        }
        if (key.name === 'left' || key.name === 'right') {
          if (last !== key.name) {
            leftChange = ESCNeutral;
            rightChange = ESCNeutral;
            speed = 0;
          } else {
            speed += STEP;
            if (key.name === 'left') {
              // Moving left, power the right ESC
              rightChange = ESCNeutral + speed;
              leftChange = ESCNeutral;
            } else {
              // Moving rightt, power the left ESC
              leftChange = ESCNeutral + speed;
              rightChange = ESCNeutral;
            }
          }
          last = key.name;
        }
      }
      throttle(leftChange, rightChange);
    }
  }

  keypress(process.stdin);

  process.stdin.on('keypress', controller);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  socket.on("connection", connection => {
    console.log("ORCA: Controller Connected");
    connection.on("remote-control", data => {
      throttleFromJoystick(data);
    });
  });

  listen.then(() => {
    console.log(`http://${os.hostname()}.local`);
    try {
      console.log(`http://${os.networkInterfaces().wlan0[0].address}`);
    } catch (e) {
      console.log(e);
    }
    process.on("SIGINT", () => {
      server.close();
      process.exit();
    });
  });
});

board.on('error', error => {
  console.error(error);
  process.exit(1);
  server.close();
});
