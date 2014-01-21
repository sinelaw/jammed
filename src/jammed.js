var jammed = (function () {
    'use strict';

    var intervalId;
    var world;

    /** @type {number} */
    var maxVelSqrt = 10;

    /**
     * @param {number} x
     * @param {number} y
     * @constructor
     */
    function Vector(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    /**
     * @param {Vector} size
     * @param {Vector} position
     * @param {Vector} velocity
     * @constructor
     */
    function Car(size, position, velocity) {
        this.size = size;
        this.position = position;
        this.velocity = velocity;
    }

    /**
     * @param {number} width
     * @param {number} height
     * @returns {{width: number, height: number, cars: Array.<Car>}}
     */
    function createWorld(width, height) {
        return {
            width: width,
            height: height,
            cars: []
        };
    }

    /**
     * @returns {HTMLCanvasElement}
     */
    function getCanvas() {
        return /** @type {HTMLCanvasElement} */ document.getElementById('canvas');
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @returns {CanvasRenderingContext2D}
     */
    function getContext(canvas) {
        return canvas.getContext('2d');
    }

    /**
     * @param {{cars:Array.<Car>}} world
     * @param {function(Car)} f
     */
    function forEachCar(world, f) {
        /** @type {number} */
        var i;
        for (i = 0; i < world.cars.length; i += 1) {
            f(world.cars[i]);
        }
    }

    function drawWorld(world) {
        var canvas = getCanvas();
        var context = getContext(canvas);
        resetCanvas();
        forEachCar(world, /** @param {Car} car */ function (car) {
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

    /**
     * @param {number} max
     * @param {boolean} allowNegative
     * @param {number} min
     * @returns {number}
     */
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