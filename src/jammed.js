var jammed = (function () {
    'use strict';

    var intervalId;
    var world;

    /** @type {number} */
    var maxVelSqrt = 10;
    /** @type {number} */
    var maxCarLength = 8;

    /**
     * @param {number} x
     * @param {number} y
     * @constructor
     * @returns {{ x:number, y:number }}
     */
    function Vector(x, y) {
        var vector = this;
        this.x = x || 0;
        this.y = y || 0;
    }

    /** @returns {number} */
    Vector.prototype.getMagnitude = function () {
        return this.x * this.x + this.y * this.y;
    };

    /** @returns {number} */
    Vector.prototype.getSize = function () {
        return Math.sqrt(this.getMagnitude());
    };

    /**
     * @param {Vector} otherVector
     * @returns {Vector}
     */
    Vector.prototype.minus = function (otherVector) {
        return new Vector(this.x - otherVector.x, this.y - otherVector.y);
    };

    /**
     * @param {Vector} otherVector
     * @returns {Vector}
     */
    Vector.prototype.plus = function (otherVector) {
        return new Vector(this.x + otherVector.x, this.y + otherVector.y);
    };

    /**
     * @param {number} scalar
     * @returns {Vector}
     */
    Vector.prototype.mul = function (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    };

    /** @returns {Vector} */
    Vector.prototype.toUnit = function () {
        var size = this.getSize();
        return new Vector(this.x / size, this.y / size);
    };

    /**
     * @param {number} length
     * @param {number} position
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, color:string}}
     */
    function Car(length, position, speed) {
        this.length = length;
        this.position = position;
        this.speed = speed;
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
    }


    /**
     * @param {function(Car)} f
     */
    Road.prototype.forEachCar = function (f) {
        /** @type {number} */
        var i;
        for (i = 0; i < this.cars.length; i += 1) {
            f(this.cars[i]);
        }
    };

    /**
     * @param {CanvasRenderingContext2D} context
     */
    Road.prototype.draw = function (context) {
        var i, point;
        if (!this.points.length) {
            return;
        }
        context.strokeStyle = "red";
        context.beginPath();
        context.moveTo(this.points[0].x, this.points[0].y);
        for (i = 1; i < this.points.length; i += 1) {
            point = this.points[i];
            context.lineTo(point.x, point.y);
        }
        context.stroke();
    };

    /**
     * @param {function(Vector,Vector):(undefined|boolean)} f
     */
    Road.prototype.forEachSegment = function (f) {
        var i;
        /** @type {Vector} */
        var point;
        /** @type {Vector} */
        var prevPoint;

        for (i = 1; i < this.points.length; i += 1) {
            point = this.points[i];
            prevPoint = this.points[i - 1];
            if (f(prevPoint, point)) {
                return;
            }
        }
    };

    /** @returns {number} */
    Road.prototype.getLength = function () {
        var length = 0;
        this.forEachSegment(function (prevPoint, point) {
            length +=  point.minus(prevPoint).getSize();
        });
        return length;
    };

    /** @param {number} roadPosition
     *  @returns {Vector}
     */
    Road.prototype.roadToWorldPosition = function (roadPosition) {
        /** @type {Vector} */
        var targetSegmentStart;
        /** @type {Vector} */
        var targetSegmentDirection;
        var pos = roadPosition;
        var totalSize = 0;
        this.forEachSegment(function (prevPoint, point) {
            var segment = point.minus(prevPoint);
            var segmentSize = segment.getSize();
            targetSegmentStart = prevPoint;
            if (segmentSize > pos) {
                targetSegmentDirection = segment.toUnit();
                return true;
            }
            pos -= segmentSize;
        });
        if (!targetSegmentStart) {
            return null;
        }
        return new Vector(targetSegmentStart.x + pos * targetSegmentDirection.x, targetSegmentStart.y + pos * targetSegmentDirection.y);
    };


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
        var i;
        /** @type {Road} */
        var road;
        function drawCar(road) {
            return function (car) {
                var position = road.roadToWorldPosition(car.position);
                context.fillStyle = car.color;
                context.shadowColor = car.color;
                context.shadowBlur = 2;
                context.fillRect(position.x, position.y, 4, car.length);
            };
        }
        resetCanvas();
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.draw(context);
            road.forEachCar(drawCar(road));
        }
    }

    function simulateStep(world) {
        var i;
        /** @type {Road} */
        var road;
        var roadLength;
        function simulateCar(car) {
            car.position += car.speed;
            if (car.position > roadLength) {
                car.position = 0;
            }
        }
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            roadLength = road.getLength();
            road.forEachCar(simulateCar);
        }
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
        road.cars.push(new Car(randomInt(maxCarLength) + 1, randomInt(road.getLength()), randomInt(maxVelSqrt) + 1));
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
        world.roads.push(new Road([new Vector(0, 0), new Vector(100, 100), new Vector(200, 0), new Vector(300, 200), new Vector(400, 0), new Vector(600, 300)], []));

        for (i = 0; i < 2; i += 1) {
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
