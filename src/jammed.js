var jammed = (function () {
    'use strict';

    var intervalId;
    var world;

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
        forEachCar(world, function (car) {
            context.fillRect(car.position.x, car.position.y, car.size.x, car.size.y);
        });
    }

    function simulateStep(world) {
        forEachCar(world, function (car) {
            car.position.x += car.velocity.x;
            car.position.y += car.velocity.y;
        });
    }

    function addRandomCar(world) {
        var maxVelSqrt = 10;
        world.cars.push(new Car(new Vector(1, 2),
            new Vector(Math.random() * world.width, Math.random() * world.height),
            new Vector(Math.random() * maxVelSqrt, Math.random() * maxVelSqrt)));
    }

    function stop() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
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
        resetCanvas();
        world = createWorld(canvas.width, canvas.height);

        for (i = 0; i < 100; i += 1) {
            addRandomCar(world);
        }
    }

    return {
        init: init,

        start: function () {
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
