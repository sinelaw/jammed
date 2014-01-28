var jammed = (function () {
    'use strict';

    /** @type {number} */
    var NUM_RANDOM_ROADS = 1;
    /** @type {number} */
    var maxRandomRoadPoints = 10;
    /** @type {number} */
    var NUM_RANDOM_CARS_PER_ROAD = 10;

    /** @type {number} */
    var TARGET_FPS = 20;
    /** @type {number} */
    var DELTA_T = (1 / TARGET_FPS);
    /** @type {number} */
    var DELTA_T_SQUARED = DELTA_T * DELTA_T;

    /** @type {number} */
    var ACCELERATION = 10;

    /** @type {number} */
    var MAX_SPEED = 40;
    /** @type {number} */
    var MIN_MAX_SPEED = 10;
    /** @type {number} */
    var MIN_IMPACT_TIME = 10;
    /** @type {number} */
    var MIN_KEEPING_DISTANCE = 15;

    /**
     * Overlap allowed for collision detection (required due to numerical calculation's not be accurate)
     * @type {number}
     */
    var COLLISION_DISTANCE_DELTA = 5;

    /**
     * General delta for floating-point comparisons
     * @type {number}
     * */
    var DELTA = 0.001;

    /** @type {string} */
    var WRECKED_CAR_STYLE = 'black';

    var world;

    /** @type {number} */
    var maxCarLength = 8;

    /** @type {number} */
    var width;
    /** @type {number} */
    var height;
    /** @type {number} */
    var runCount = 0;

    /** @type {Array.<boolean>} */
    var shouldStop = [];

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
    Vector.prototype.min = function (otherVector) {
        return new Vector(Math.min(this.x, otherVector.x), Math.min(this.y, otherVector.y));
    };

    /**
     * @param {Vector} otherVector
     * @returns {Vector}
     */
    Vector.prototype.max = function (otherVector) {
        return new Vector(Math.max(this.x, otherVector.x), Math.max(this.y, otherVector.y));
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
     * @param {Array.<Vector>} points
     * @param {function(Vector,Vector):(undefined|boolean)} f
     */
    function forEachSegment(points, f) {
        var i;
        /** @type {Vector} */
        var point;
        /** @type {Vector} */
        var prevPoint;

        for (i = 1; i < points.length; i += 1) {
            point = points[i];
            prevPoint = points[i - 1];
            if (f(prevPoint, point)) {
                return;
            }
        }
    }

    /**
     * @param {Array.<Vector>} points
     * @returns {number}
     */
    function getLength(points) {
        var length = 0;
        forEachSegment(points, function (prevPoint, point) {
            length += point.minus(prevPoint).getSize();
        });
        return length;
    }

    /**
     * @param {number} length
     * @param {number} position
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, maxSpeed: number, accel: number, color:string}}
     */
    function Car(length, position, speed) {
        this.length = length;
        this.position = position;
        this.speed = speed;
        this.accel = 0;
        this.maxSpeed = randomInt(MAX_SPEED - MIN_MAX_SPEED) + MIN_MAX_SPEED;
        this.color = randomColor();
        this.wrecked = false;
    }

    Car.prototype.wreck = function () {
        this.accel = 0;
        this.speed = 0;
        this.wrecked = true;
    };

    /**
     * @param {Array.<Vector>} points
     * @param {Array.<Car>} cars
     * @constructor
     * @returns {{ points: Array.<Vector>, cars: Array.<Car>, length: number, color: string }}
     */
    function Road(points, cars) {
        this.points = points;
        this.cars = [];
        this.length = getLength(points);
        this.color = 'rgba(' + [randomInt(255), randomInt(255), randomInt(255), 0.1].join(',') + ')';
    }

    /**
     * @param {function(Road, Car,?Car)} f
     */
    Road.prototype.forEachCar = function (f) {
        /** @type {number} */
        var i;
        for (i = 0; i < this.cars.length; i += 1) {
            f(this, this.cars[i], (i + 1 < this.cars.length) ? this.cars[i + 1] : this.cars[0]);
        }
    };

    /**
     * @param {CanvasRenderingContext2D} context
     */
    Road.prototype.draw = function (context) {
        var i, point, prevPoint, width = 6;
        return;
        if (!this.points.length) {
            return;
        }
        context.fillStyle = this.color;
        context.shadowColor = "#ffffff";
        context.shadowBlur = -width / 2;
        for (i = 1; i < this.points.length; i += 1) {
            prevPoint = this.points[i - 1].min(this.points[i]);
            point = this.points[i].max(this.points[i - 1]);
            context.fillRect(prevPoint.x, prevPoint.y, point.x - prevPoint.x + width, point.y - prevPoint.y + width);
        }
    };

    Road.prototype.sortCars = function () {
        this.cars = this.cars.sort(function (a, b) {
            return a.position - b.position;
        });
    };

    /** @param {number} roadPosition
     *  @returns {Vector}
     */
    Road.prototype.roadToWorldPosition = function (roadPosition) {
        /** @type {Vector} */
        var targetSegmentStart;
        /** @type {Vector} */
        var targetSegmentDirection;
        var segment;
        var pos = roadPosition;
        forEachSegment(this.points, function (prevPoint, point) {
            segment = point.minus(prevPoint);
            var segmentSize = segment.getSize();
            targetSegmentStart = prevPoint;
            if (segmentSize > pos) {
                return true;
            }
            pos -= segmentSize;
        });
        if (targetSegmentStart && segment) {
            targetSegmentDirection = segment.toUnit();
            return new Vector(targetSegmentStart.x + pos * targetSegmentDirection.x, targetSegmentStart.y + pos * targetSegmentDirection.y);
        }
        return null;
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

        function drawCar(road, car, nextCar) {
            var position = road.roadToWorldPosition(car.position);
            var style = car.color;
            if (car.wrecked) {
                style = WRECKED_CAR_STYLE;
            }
            context.fillStyle = style;
            if (Math.abs(car.accel) < DELTA) {
                context.shadowColor = 'black';
            } else if (car.accel < 0) {
                context.shadowColor = 'red';
            } else {
                context.shadowColor = 'green';
            }
            context.shadowBlur = 4;
            context.fillRect(position.x, position.y, car.length, car.length);
//            if (!nextCar) {
//            context.fillText(JSON.stringify(car), position.x + 1, position.y + 1);
//            }
//
        }

        resetCanvas();
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.draw(context);
        }
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.forEachCar(drawCar);
        }
    }


    /**
     * @param {Road} road
     * @param {Car} car
     * @param {?Car} nextCar
     */
    function simulateCar(road, car, nextCar) {
        var distanceToNextCarBackside = null;
        var closingSpeed;
        var impactTime;
        if (car.wrecked) {
            return;
        }
        car.accel = ACCELERATION;
        if (nextCar) {
            closingSpeed = car.speed - nextCar.speed;
            distanceToNextCarBackside = nextCar.position - car.position;
            if (distanceToNextCarBackside < 0) {
                distanceToNextCarBackside += road.length;
            }
            if (Math.abs(closingSpeed) > DELTA) {
                impactTime = distanceToNextCarBackside / closingSpeed;
            } else {
                impactTime = -1;
            }
            if (impactTime < 0) {
                // never going to impact, closing speed is negative (actually gaining distance) or very, very small.
                car.accel = ACCELERATION;
            } else if (impactTime <= MIN_IMPACT_TIME) {
                car.accel = -(impactTime / 2);
            }

            if (distanceToNextCarBackside < MIN_KEEPING_DISTANCE) {
                car.accel = -ACCELERATION;
            }
        }
        car.speed = Math.min(car.maxSpeed, Math.max(0, car.speed + car.accel * DELTA_T));
        car.position += car.speed * DELTA_T + 0.5 * car.accel * DELTA_T_SQUARED;
        if ((null !== distanceToNextCarBackside) && (distanceToNextCarBackside - closingSpeed + COLLISION_DISTANCE_DELTA < car.length)) {
            // Wreck!
            car.position = nextCar.position - car.length;
            car.wreck();
            nextCar.wreck();
        }
        if (car.position > road.length) {
            car.position -= road.length;
        }
        if (car.position < 0) {
            car.position += road.length;
        }
    }

    function simulateStep(world) {
        var i;
        /** @type {Road} */
        var road;
        var newCars;
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.forEachCar(simulateCar);
            road.sortCars();
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
        var lastCar = road.cars.length ? road.cars[road.cars.length - 1].position : 0;
        road.cars.push(new Car(randomInt(maxCarLength - 5) + 5, lastCar + MIN_KEEPING_DISTANCE + randomInt(5), 0));
    }

    function stop() {
        shouldStop[runCount] = true;
        runCount += 1;
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

    /**
     * @param {number} maxX
     * @param {number} maxY
     * @returns {Vector}
     */
    function randomVector(maxX, maxY) {
        return new Vector(randomInt(maxX), randomInt(maxY));
    }

    function randomRoad() {
        var i, numSegments = randomInt(maxRandomRoadPoints) + 2;
        var points = [randomVector(width, height)];
        var prevPoint = points[0];
        var point;
        var road;
        for (i = 0; i < numSegments; i += 1) {
            point = randomVector(width, height).minus(prevPoint);
            point = prevPoint.plus(new Vector(point.x * (i % 2), point.y * ((i + 1) % 2)));
            points.push(point);
            prevPoint = point;
        }
        //points.push(points[0]); // close the loop
        road = new Road(points, []);

        for (i = 0; i < NUM_RANDOM_CARS_PER_ROAD; i += 1) {
            addRandomCar(road);
        }
        road.sortCars();
        return road;
    }

    function init() {
        var i;
        var canvas = getCanvas();
        width = canvas.width;
        height = canvas.height;
        initCanvas();
        world = new World(canvas.width, canvas.height);
        for (i = 0; i < NUM_RANDOM_ROADS; i += 1) {
            world.roads.push(randomRoad());
        }
    }

    return {
        init: init,

        start: function () {
            var currentRunCount;
            var lastRedrawTime = Date.now();

            function drawFPS(fps) {
                var context = getContext(getCanvas());
                context.fillStyle = 'black';
                context.fillText('' + fps + ' fps', 10, 10);
            }

            function updateFPS() {
                var now = Date.now();
                var elapsed = now - lastRedrawTime;
                var fps = Math.floor(1000.0 / elapsed);
                lastRedrawTime = now;
                DELTA_T = elapsed / 1000.0;
                /** @type {number} */
                DELTA_T_SQUARED = DELTA_T * DELTA_T;
                drawFPS(fps);
            }

            function loop() {
                updateFPS();
                window.setTimeout(function () {
                    drawWorld(world);
                    simulateStep(world);
                    if (shouldStop[currentRunCount]) {
                        return;
                    }
                    loop();
                }, (1000.0 / TARGET_FPS));
            }

            stop();
            currentRunCount = runCount;
            loop();
        },

        stop: stop,

        clear: function () {
            resetCanvas();
            init();
        }
    };


}());
