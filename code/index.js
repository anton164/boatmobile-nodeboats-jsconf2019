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
const port = process.env.PORT || 80;
const listen = new Promise(resolve => {
  server.listen(port, resolve);
});

const board = new Board({
  port: '/dev/tty.clownfish-DevB', // path to bluetooth connection, i.e. /dev/tty.ROBOT_NAME-SPPDev or COMX
});

const STEP = 5;
const MAX_SPEED = 500;

function powerToSpeed (power) {
  return power * (MAX_SPEED);
}

function speedFromJoystick (data) {

  const degree = data.angle.degree;
  let force = data.force;
  if (force > 1) force = 1;
  if (force < -1) force = -1;
  let leftPower, rightPower;

  if (degree < 90) {
    leftPower = force;
    rightPower = degree / 90 * force;
  } else if (degree > 270) {
    leftPower = -force;
    rightPower = - ((1 - ((degree-270) / 90)) * force);
  } else if (degree === 90) {
    rightPower = force;
    leftPower = force;
  } else if (degree > 90) {
    // rightPower 100%
    rightPower = (degree > 180) ? -force : force;
    leftPower = (1 - ((degree - 90) / 90)) * force;
  }

  return {
    leftSpeed: powerToSpeed(leftPower),
    rightSpeed: powerToSpeed(rightPower)
  };
}


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
  ESCNeutral = leftESC.neutral;

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

  // Code for controlling the two motors using the joystick web app
  function throttleFromJoystick({data, event}) {
    if (event.type === 'end') {
      stop();
    } else {
      const { leftSpeed, rightSpeed } = speedFromJoystick(data);
      throttle(ESCNeutral + leftSpeed, ESCNeutral + rightSpeed);
    }
  }

  socket.on("connection", connection => {
    console.log("ORCA: Controller Connected");
    connection.on("remote-control", data => {
      throttleFromJoystick(data);
    });
  });

  // just to make sure the program is running
  led.blink(500);

  // Code for controlling the two motors using the arrow keys
  function controller(_, key) {
    let leftChange = 0;
    let rightChange = 0;
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

  listen.then(() => {
    console.log(`http://${os.hostname()}.local`);
    process.on("SIGINT", () => {
      server.close();
      process.exit();
    });
  });
});

board.on('error', error => {
  console.error(error);
});
