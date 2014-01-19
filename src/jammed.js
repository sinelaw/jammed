var jammed = (function () {
    'use strict';

    var intervalId;
    var world;
    var maxVelSqrt = 10;

    function Vector(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    function Car(size, position, velocity) {
        this.size = size;
        this.position = position;
        this.velocity = velocity;
    }

    function createWorld(width, height) {
        return {
            width: width,
            height: height,
            cars: []
        };
    }

    function getCanvas() {
        return document.getElementById('canvas');
    }

    function getContext(canvas) {
        return canvas.getContext('2d');
    }

    function forEachCar(world, f) {
        var i;
        var car;
        for (i = 0; i < world.cars.length; i += 1) {
            f(world.cars[i]);
        }
    }

    function drawWorld(world) {
        var canvas = getCanvas();
        var context = getContext(canvas);
        resetCanvas();
        forEachCar(world, function (car) {
            context.fillRect(car.position.x, car.position.y, car.size.x, car.size.y);
        });
    }

    function simulateStep(world) {
        forEachCar(world, function (car) {
            car.position.x += car.velocity.x;
            car.position.y += car.velocity.y;
            if ((car.position.x > world.width) || (car.position.x < 0) || (car.position.y > world.height) || (car.position.y < 0)) {
                car.position = new Vector(randomInt(world.width), randomInt(world.height));
                car.velocity = new Vector(randomInt(maxVelSqrt, true, 1), randomInt(maxVelSqrt, true, 1));
            }
        });
    }

    function randomInt(max, allowNegative, min) {
        var sign = (allowNegative && (Math.random() > 0.5)) ? -1 : 1;
        return sign * ((min || 0) + Math.floor(Math.random() * max));
    }

    function addRandomCar(world) {

        world.cars.push(new Car(new Vector(2, 4),
            new Vector(randomInt(world.width), randomInt(world.height)),
            new Vector(randomInt(maxVelSqrt, true, 1), randomInt(maxVelSqrt, true, 1))));
    }

    function stop() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
    }

    function initCanvas() {
        var canvas = getCanvas();
        var context = getContext(canvas);

        context.fillStyle = "#ffffff";
//        canvas.width = 600;
//        canvas.height = 300;
    }

    function resetCanvas() {
        var canvas = getCanvas();
        var context = getContext(canvas);


        // Store the current transformation matrix
        context.save();

        // Use the identity matrix while clearing the canvas
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Restore the transform
        context.restore();
    }

    function init() {
        var i;
        var canvas = getCanvas();
        initCanvas();
        world = createWorld(canvas.width, canvas.height);

        for (i = 0; i < 100; i += 1) {
            addRandomCar(world);
        }
    }

    return {
        init: init,

        start: function () {
            stop();
            intervalId = window.setInterval(function () {
                drawWorld(world);
                simulateStep(world);
            }, 100);
        },

        stop: stop,

        clear: function () {
            resetCanvas();
            init();
        }
    };


}());