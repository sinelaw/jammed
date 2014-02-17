/*global define */
define(['util/mathUtil', 'util/vector', 'util/car', 'util/road', 'util/consts'],
    function (mathUtil, Vector, Car, Road, consts) {
        'use strict';

        /** @type {number} */
        var deltaT = (1 / consts.TARGET_FPS);
        /** @type {number} */
        var deltaTSquared = deltaT * deltaT;

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
         * @param {CanvasRenderingContext2D} context
         * @param {World} world
         */
        function drawWorld(context, world) {
            var i;

            /**
             * @param {Road} road
             * @param {Car} car
             */
            function drawCar(road, car) {
                car.draw(context, road.roadToWorldPosition(car.position, car.lane));
            }

            for (i = 0; i < world.roads.length; i += 1) {
                world.roads[i].forEachCar(drawCar);
            }
        }

        /**
         * @param {HTMLCanvasElement} canvas
         * @param {CanvasRenderingContext2D} context
         * @param {World} world
         * @returns {ImageData}
         */
        function drawBackground(canvas, context, world) {
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
         * @param {number} lane
         * @param {number} carIndex
         * @returns {Car}
         */
        function getNextCarInLane(road, lane, carIndex) {
            var i;
            var car;

            for (i = carIndex + 1; i < road.cars.length - 1; i += 1) {
                car = road.cars[i % road.cars.length];
                if (car.lane === lane) {
                    return car;
                }
            }
            return null;
        }

        /**
         * @param {Road} road
         * @param {Car} car
         * @param {number} carIndex
         */
        function simulateCar(road, car, carIndex) {
            var distanceToNextCarBackside = null;
            var closingSpeed;
            var nextCarAbsolutePosition;
            var impactTime;
            var keepingTime;
            var nextAccel;
            var nextCar = getNextCarInLane(road, car.lane, carIndex);
            if (car.wrecked) {
                return;
            }
            nextAccel = car.maxAcceleration;
            if (nextCar) {
                nextCarAbsolutePosition = nextCar.position < car.position ? nextCar.position + road.length : nextCar.position;
                closingSpeed = car.speed - nextCar.speed;
                distanceToNextCarBackside = nextCarAbsolutePosition - car.position - car.length;
                if (distanceToNextCarBackside < 0) {
                    // Wreck!
                    car.wreck();
                    nextCar.wreck();
                    //debugger;
                    return;
                }

                if (closingSpeed > 0) {
                    impactTime = distanceToNextCarBackside / closingSpeed;
                    if (impactTime < consts.MIN_IMPACT_TIME) {
                        nextAccel = - closingSpeed / (impactTime / 2);
                    }
                }
                //else {
                    // never going to impact, closing speed is negative (actually gaining distance) or very, very small.
                //}

                keepingTime = distanceToNextCarBackside / car.speed;
                if (keepingTime < car.minKeepingTime) {
                    // too close for comfort
                    nextAccel = Math.min(nextAccel, - car.speed / keepingTime);
                }

                //console.log('Car:', car.color, 'Distance:', distanceToNextCarBackside, 'Closing speed:', closingSpeed, 'Impact time:', impactTime, 'Accel: ', car.accel);
                if (nextAccel > 0) {
                    nextAccel = Math.min(nextAccel, car.maxAcceleration);
                }
            }
            car.accel = nextAccel;
            car.speed = Math.min(car.maxSpeed, Math.max(0, car.speed + car.accel * deltaT));
            car.position += car.speed * deltaT + 0.5 * car.accel * deltaTSquared;

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


        function stop() {
            shouldStop[runCount] = true;
            runCount += 1;
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


        function init() {
            var i;
            _canvas = /** @type {HTMLCanvasElement} */ document.getElementById('canvas');
            _context = _canvas.getContext('2d');
            _fpsElem = document.getElementById('fps');

            width = _canvas.width;
            height = _canvas.height;
            world = new World(_canvas.width, _canvas.height);
            for (i = 0; i < consts.NUM_RANDOM_ROADS; i += 1) {
                world.roads.push(Road.random(width, height));
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
                var elapsedQueue = mathUtil.movingAverage(4);
                var context = _context;

                function drawFPS(fps) {
                    _fpsElem.innerHTML = '' + fps + ' fps';
//                context.fillStyle = 'black';
//                context.shadowBlur = 0;
//                context.fillText('' + fps + ' fps', 10, 10);
                }

                function updateDeltaT() {
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
                    updateDeltaT();
                    window.setTimeout(function () {
                        resetCanvas();
                        drawWorld(context, world);
                        simulateStep(world);
                        if (shouldStop[currentRunCount]) {
                            return;
                        }
                        loop();
                    }, (1000.0 / consts.TARGET_FPS));
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


    });
