
var five = require("johnny-five");
var keypress = require("keypress");

var options = {
    // TODO: YOU SHOULD PUT THIS IN HERE
    // TODO: we can make cute names for this?
    'port' : '/dev/tty.GoldsamBot-SPPDev'
}
var board = new five.Board(options);

const NEUTRAL = 50;

// The board's pins will not be accessible until
// the board has reported that it is ready
board.on("ready", function() {
    console.log("Ready!");
    var esc = new five.ESC({
        pin: 11,
        device: "FORWARD_REVERSE",
        neutral: NEUTRAL,
    });

    this.repl.inject({
        esc : esc
    });

    var servo = new five.Servo(10);
    servo.center();
    this.repl.inject({
        servo: servo
    });


    function controller(ch, key) {
        var isThrottle = false;
        // TODO: note changed `.value` from `.speed`
        var speed = esc.last ? esc.value : NEUTRAL;

        if (key && key.shift) {
            if (key.name === "up") {
                speed += 1; // note change from .01 -> 1
                isThrottle = true;
            }

            if (key.name === "down") {
                speed -= 1;
                isThrottle = true;
            }

            if (isThrottle) {
                console.log("speed: " , speed);
                esc.speed(speed);
            }

            if (key.name === "left") {
                // TODO: modulo 360
                var new_speed = servo.position + 45;
                new_speed = five.Fn.constrain(new_speed, 0, 180);
                servo.to(new_speed);
                console.log("left: ", new_speed);
            }

            if (key.name === "right") {
                var new_speed = servo.position - 45;
                new_speed = five.Fn.constrain(new_speed, 0, 180);
                servo.to(new_speed);
                console.log("right: ", new_speed);

            }
        }
    }

    keypress(process.stdin);

    process.stdin.on("keypress", controller);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    var led = new five.Led(13);
    led.blink(1000);
});