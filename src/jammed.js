var jammed = (function () {
    'use strict';

    /** @type {number}
     * @const */
    var TARGET_FPS = 30;

    /** @type {number}
     * @const */
    var NUM_RANDOM_ROADS = 1;
    /** @type {number}
     * @const */
    var maxRandomRoadPoints = 10;
    /** @type {number}
     * @const */
    var NUM_RANDOM_CARS_PER_ROAD = 10;

    /** @type {number} */
    var deltaT = (1 / TARGET_FPS);
    /** @type {number} */
    var deltaTSquared = deltaT * deltaT;

    /** @type {number}
     * @const */
    var MAX_ACCELERATION = 5;

    /** @type {number}
     * @const */
    var MIN_MAX_ACCELERATION = 2;


    /** @type {number}
     * @const */
    var MAX_SPEED = 100;

    /** @type {number}
     * @const */
    var MIN_MAX_SPEED = 70;

    /**
     * Minimum time-to-impact, under which cars start braking.
     * @type {number}
     * @const */
    var MIN_IMPACT_TIME = 10;

    /**
     * Minimum travel time to next car's rear, that cars keep while in motion.
     * @type {number}
     * @const */
    var MAX_KEEPING_TIME = 3;
    /** @type {number}
     * @const */
    var MIN_KEEPING_TIME = 0.25;

    /** @type {number}
     * @const */
    var MIN_KEEPING_DISTANCE = 1;

    /** @type {number}
     * @const */
    var MIN_CAR_LENGTH = 5;

    /** @type {number}
     * @const */
    var MAX_CAR_LENGTH = 8;

    /**
     * Overlap allowed for collision detection (required due to numerical calculation's not be accurate)
     * @type {number}
     */
    var COLLISION_DISTANCE_DELTA = 5;

    /**
     * General delta for floating-point comparisons
     * @type {number}
     * @const
     * */
    var DELTA = 0.001;

    /** @type {string}
     * @const */
    var WRECKED_CAR_STYLE = 'black';

    /** @type {World} */
    var world;

    /** @type {number} */
    var width;
    /** @type {number} */
    var height;
    /** @type {number} */
    var runCount = 0;

    /** @type {Array.<boolean>} */
    var shouldStop = [];

    /** @type {HTMLCanvasElement} */
    var _canvas;
    /** @type {CanvasRenderingContext2D} */
    var _context;
    /** @type {ImageData} */
    var _backgroundImage;

    /** @type {HTMLElement} */
    var _fpsElem;

    /**
     * @param {number} x
     * @param {number} y
     * @constructor
     * @returns {{ x:number, y:number }}
     */
    function Vector(x, y) {
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
     * @param {number} size
     * @returns {{clear: function(), add: function(number), getResult: function():number}}
     */
    function movingAverage(size) {
        var data = [];
        function clear() {
            var i;
            for (i = 0; i < size; i += 1) {
                data[i] = 0;
            }
        }
        clear();
        return {
            clear: clear,
            add: function (value) {
                data.push(value);
                data.shift();
            },
            getResult: function () {
                var i, result = data[0];
                for (i = 1; i < size; i += 1) {
                    result += data[i];
                }
                return result / size;
            }
        };
    }

    /**
     * @param {number} length
     * @param {number} position
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, maxSpeed: number, accel: number, maxAcceleration:number, color:string, minKeepingTime: number}}
     */
    function Car(length, position, speed) {
        this.length = length;
        this.position = position;
        this.speed = speed;
        this.accel = 0;
        this.maxSpeed = randomInt(MAX_SPEED, MIN_MAX_SPEED);
        this.maxAcceleration = randomInt(MAX_ACCELERATION, MIN_MAX_ACCELERATION);
        this.color = randomColor();
        this.wrecked = false;
        this.minKeepingTime = MIN_KEEPING_TIME + Math.random() * (MAX_KEEPING_TIME - MIN_KEEPING_TIME);
    }

    Car.prototype.wreck = function () {
        this.accel = 0;
        this.speed = 0;
        this.wrecked = true;
    };

    /**
     * @param {Array.<Vector>} points
     * @param {Array.<Car>} cars
     * @param {number} width
     * @constructor
     * @returns {{ points: Array.<Vector>, cars: Array.<Car>, width: number, length: number, color: string }}
     */
    function Road(points, cars, width) {
        this.points = points;
        this.cars = cars;
        this.width = width;
        this.length = getLength(points);
        this.color = 'rgba(' + [randomInt(255, 200), randomInt(255, 200), randomInt(255, 200), 1].join(',') + ')';
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
        if (!this.points.length) {
            return;
        }
        context.fillStyle = this.color;
//        context.shadowColor = "#ffffff";
//        context.shadowBlur = -width / 2;
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
            return targetSegmentStart.plus(segment.toUnit().mul(pos));
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
     * @param {CanvasRenderingContext2D} context
     * @param {World} world
     */
    function drawWorld(context, world) {
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
            // This really slows things down:
//            if (Math.abs(car.accel) < DELTA) {
//                context.shadowColor = 'black';
//            } else if (car.accel < 0) {
//                context.shadowColor = 'red';
//            } else {
//                context.shadowColor = 'green';
//            }
//            context.shadowBlur = 4;
            context.fillRect(position.x, position.y, car.length, car.length);
        }

        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.forEachCar(drawCar);
        }
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} context
     * @param {World} world
     * @returns {ImageData}
     */
    function drawBackground(canvas, context, world)
    {
        /** @type {Road} */
        var road;
        /** @type {number} */
        var i;
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.draw(context);
        }
        return context.getImageData(0, 0, canvas.width, canvas.height);
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
        car.accel = car.maxAcceleration;
        if (nextCar) {
            closingSpeed = car.speed - nextCar.speed;
            distanceToNextCarBackside = nextCar.position - car.position;
            while (distanceToNextCarBackside < 0) {
                distanceToNextCarBackside += road.length;
            }
            if (Math.abs(closingSpeed) > DELTA) {
                impactTime = distanceToNextCarBackside / closingSpeed;
            } else {
                impactTime = -1;
            }
            if (impactTime < 0) {
                // never going to impact, closing speed is negative (actually gaining distance) or very, very small.
                car.accel = car.maxAcceleration;
            } else if (impactTime <= MIN_IMPACT_TIME) {
                car.accel = -car.maxAcceleration;
            }

            if ((car.speed > DELTA) && (distanceToNextCarBackside / car.speed < car.minKeepingTime)) {
                car.accel = -car.maxAcceleration;
            }
            if (distanceToNextCarBackside < MIN_KEEPING_DISTANCE) {
                car.accel = -car.maxAcceleration;
            }
        }
        car.speed = Math.min(car.maxSpeed, Math.max(0, car.speed + car.accel * deltaT));
        car.position += car.speed * deltaT + 0.5 * car.accel * deltaTSquared;
        if ((null !== distanceToNextCarBackside) && (distanceToNextCarBackside - closingSpeed + COLLISION_DISTANCE_DELTA < car.length)) {
            // Wreck!
            car.position = nextCar.position - car.length;
            car.wreck();
            nextCar.wreck();
        }
        while (car.position > road.length) {
            car.position -= road.length;
        }
        while (car.position < 0) {
            car.position += road.length;
        }
    }

    function simulateStep(world) {
        var i;
        /** @type {Road} */
        var road;
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.forEachCar(simulateCar);
            road.sortCars();
        }
    }

    /**
     * @param {number} max
     * @param {number=} min
     * @param {boolean=} allowNegative
     * @returns {number}
     */
    function randomInt(max, min, allowNegative) {
        var sign = (allowNegative && (Math.random() > 0.5)) ? -1 : 1;
        min = (min || 0);
        return sign * (min + Math.floor(Math.random() * (max - min)));
    }

    /**
     * @param {Road} road
     */
    function addRandomCar(road) {
        var lastCar = road.cars.length ? road.cars[road.cars.length - 1] : null;
        var lastCarPos = lastCar ? lastCar.position : 0;
        var lastCarLength = lastCar ? lastCar.length : 0;
        road.cars.push(new Car(randomInt(MAX_CAR_LENGTH, MIN_CAR_LENGTH),
            lastCarPos + lastCarLength + 1 + randomInt(MIN_KEEPING_DISTANCE), 0));
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

    function resetCanvas() {
        // Store the current transformation matrix
        _context.save();

        // Use the identity matrix while clearing the canvas
        _context.setTransform(1, 0, 0, 1, 0, 0);
        _context.clearRect(0, 0, width, height);
        _context.putImageData(_backgroundImage, 0, 0);

        // Restore the transform
        _context.restore();
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
        _canvas = getCanvas();
        _context = getContext(_canvas);
        _fpsElem = document.getElementById('fps');

        width = _canvas.width;
        height = _canvas.height;
        world = new World(_canvas.width, _canvas.height);
        for (i = 0; i < NUM_RANDOM_ROADS; i += 1) {
            world.roads.push(randomRoad());
        }
        _context.setTransform(1, 0, 0, 1, 0, 0);
        _context.clearRect(0, 0, width, height);
        _backgroundImage = drawBackground(_canvas, _context, world);
        resetCanvas();
    }

    return {
        init: init,

        start: function () {
            var currentRunCount;
            var lastRedrawTime;
            var elapsedQueue = movingAverage(4);
            var context = _context;

            function drawFPS(fps) {
                _fpsElem.innerHTML = '' + fps + ' fps';
//                context.fillStyle = 'black';
//                context.shadowBlur = 0;
//                context.fillText('' + fps + ' fps', 10, 10);
            }

            function updateFPS() {
                var now = Date.now();
                var elapsed = now - lastRedrawTime;
                var averageElapsed = elapsedQueue.getResult();
                var fps = Math.floor(1000.0 / averageElapsed);
                lastRedrawTime = Date.now();
                elapsedQueue.add(elapsed);
                deltaT = elapsed / 1000.0;
                /** @type {number} */
                deltaTSquared = deltaT * deltaT;
                drawFPS(fps);
            }

            function loop() {
                updateFPS();
                window.setTimeout(function () {
                    resetCanvas();
                    drawWorld(context, world);
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
