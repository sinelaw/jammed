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
     * @returns {{size:Vector, position:Vector, velocity:Vector, color:string}}
     */
    function Car(size, position, velocity) {
        this.size = size;
        this.position = position;
        this.velocity = velocity;
        this.color = randomColor();
    }

    /**
     * @param {Array.<Vector>} points
     * @param {Array.<Car>} cars
     * @constructor
     * @returns {{ points: Array.<Vector>, cars: Array.<Car> }}
     */
    function Road(points, cars) {
        var road = this;
        this.points = points;
        this.cars = cars;

        /**
         * @param {function(Car)} f
         */
        this.forEachCar = function (f) {
            /** @type {number} */
            var i;
            for (i = 0; i < road.cars.length; i += 1) {
                f(road.cars[i]);
            }
        }
    }

    /**
     * @param {number} width
     * @param {number} height
     * @constructor
     * @returns {{width:number, height:number, roads:Array.<Road>}}
     */
    function World(width, height) {
        this.width = width;
        this.height = height;
        this.roads = [];
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
     * @param {World} world
     */
    function drawWorld(world) {
        var canvas = getCanvas();
        var context = getContext(canvas);
        resetCanvas();
        world.roads[0].forEachCar(function (car) {
            context.fillStyle = car.color;
            context.shadowColor = car.color;
            context.shadowBlur = 2;
            context.fillRect(car.position.x, car.position.y, car.size.x, car.size.y);
        });
    }

    function simulateStep(world) {
        world.roads[0].forEachCar(function (car) {
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
     * @param {boolean=} allowNegative
     * @param {number=} min
     * @returns {number}
     */
    function randomInt(max, allowNegative, min) {
        var sign = (allowNegative && (Math.random() > 0.5)) ? -1 : 1;
        return sign * ((min || 0) + Math.floor(Math.random() * max));
    }

    /**
     * @param {Road} road
     */
    function addRandomCar(road) {
        road.cars.push(new Car(new Vector(2, 4),
            new Vector(randomInt(world.width), randomInt(world.height)),
            new Vector(randomInt(maxVelSqrt, true, 1), randomInt(maxVelSqrt, true, 1))));
    }

    function stop() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
    }

    function randomHexDigit() {
        var digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        return digits[randomInt(digits.length)];
    }

    function randomColor() {
        return '#' + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit();
    }

    function initCanvas() {
        var canvas = getCanvas();
        var context = getContext(canvas);

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
        world = new World(canvas.width, canvas.height);
        world.roads.push(new Road([new Vector(0, 0), new Vector(100, 100)], []));

        for (i = 0; i < 100; i += 1) {
            addRandomCar(world.roads[0]);
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
