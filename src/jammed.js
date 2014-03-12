/*global $, define, console */
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

        var backgroundPos = 0;

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
             * @param {number} carIndex
             */
            function drawCar(road, car, carIndex) {
                var transform = road.roadToWorldPosition(car.position, car.lane);
                context.save();
                context.translate(transform.translate.x, transform.translate.y);
                context.rotate(Math.PI/2 - Math.atan2(transform.tangent.x, transform.tangent.y));
                car.draw(context);
                context.restore();
                //context.fillText(carIndex, drawPosition.x + 10, drawPosition.y + 10);
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
         * @returns {{car:Car,index:number}}
         */
        function getNextCarInLane(road, lane, carIndex) {
            /** @type {number} */
            var i;
            /** @type {number} */
            var index;
            /** @type {Car} */
            var car;

            for (i = 0; i < road.cars.length - 1; i += 1) {
                index = (i + carIndex + 1) % road.cars.length;
                car = road.cars[index];
                if (car.lane === lane) {
                    return {
                        index: index,
                        car: car
                    };
                }
            }
            return null;
        }

        /**
         * @param {Road} road
         * @param {number} lane
         * @param {number} carIndex
         * @returns {{car:Car,index:number}}
         */
        function getPrevCarInLane(road, lane, carIndex) {
            /** @type {number} */
            var i;
            /** @type {number} */
            var index;
            /** @type {Car} */
            var car;

            for (i = 0; i < road.cars.length - 1; i += 1) {
                index = (carIndex - 1 - i + road.cars.length) % road.cars.length;
                car = road.cars[index];
                if (car.lane === lane) {
                    return {
                        index: index,
                        car: car
                    };
                }
            }
            return null;
        }

        /**
         * @param {number} roadLength
         * @param {number} carPos1
         * @param {number} carPos2
         * @returns {number}
         */
        function carsDistance(roadLength, carPos1, carPos2) {
            var dist = Math.abs(carPos2 - carPos1);
            return Math.min(dist, roadLength - dist);
        }

        /**
         * @param {Road} road
         * @param {number} laneNum
         * @param {number} carIndex
         * @returns {number}
         */
        function spaceAvailableInLane(road, laneNum, carIndex) {
            /** @type {Car} */
            var car = road.cars[carIndex];
            var minSwitchSpace = car.length * 2;//(2 + 1.0 * (Math.min(1, car.speed)));
            var nextCarInfo = getNextCarInLane(road, laneNum, carIndex);
            var prevCarInfo = getPrevCarInLane(road, laneNum, carIndex);
            /** @type {number} */
            var forwardSpace;
            /** @type {number} */
            var backwardSpace;

            if (!nextCarInfo || !prevCarInfo) {
                if (!nextCarInfo && !prevCarInfo) {
                    return road.length - car.length;
                }
                return 0;
            }
            forwardSpace = carsDistance(road.length, nextCarInfo.car.position, car.position + car.length);
            backwardSpace = carsDistance(road.length, car.position, prevCarInfo.car.position + prevCarInfo.car.length);

            if ((forwardSpace < minSwitchSpace) || (backwardSpace < minSwitchSpace)) {
                return 0;
            }
            return forwardSpace;
        }

        /**
         * @param {Road} road
         * @param {Car} car
         * @param {number} carIndex
         * @returns {number}
         */
        function decideAcceleration(road, car, carIndex) {
            var distanceToNextCarBackside;
            var closingSpeed;
            var nextCarRelativePosition;
            var impactTime;
            var keepingTime;
            var nextAccel;
            var nextCar;
            if (car.wrecked) {
                return 0;
            }
            nextCar = getNextCarInLane(road, car.lane, carIndex).car;
            if (!nextCar) {
                return car.maxAcceleration;
            }
            nextAccel = car.maxAcceleration;
            nextCarRelativePosition = nextCar.position + (nextCar.position < car.position ? road.length : 0);
            closingSpeed = car.speed - nextCar.speed;
            distanceToNextCarBackside = nextCarRelativePosition - car.position - car.length;
            if (distanceToNextCarBackside < 0) {
                // Wreck!
                console.log('Collision!', car.color, nextCar.color);
                car.wreck();
                car.wreckTTL = 10;
                nextCar.wreck();
                nextCar.wreckTTL = 10;
                //debugger;
                return 0;
            }
            if (closingSpeed > 0) {
                impactTime = distanceToNextCarBackside / closingSpeed;
                if (impactTime < consts.MIN_IMPACT_TIME) {
                    nextAccel = -closingSpeed / (impactTime / 2.0);
                }
            }
            //else {
            // never going to impact, closing speed is negative (actually gaining distance) or very, very small.
            //}

            keepingTime = distanceToNextCarBackside / car.speed;
            if (keepingTime < car.minKeepingTime) {
                // too close for comfort
                nextAccel = Math.min(nextAccel, -car.speed / keepingTime);
            }

            if (distanceToNextCarBackside < consts.MIN_KEEPING_DISTANCE) {
                nextAccel = Math.min(nextAccel, distanceToNextCarBackside - consts.MIN_KEEPING_DISTANCE);
            }

            //console.log('Car:', car.color, 'Distance:', distanceToNextCarBackside, 'Closing speed:', closingSpeed, 'Impact time:', impactTime, 'Accel: ', car.accel);
            if (nextAccel > 0) {
                nextAccel = Math.min(nextAccel, car.maxAcceleration);
            }
            return nextAccel;
        }

        /**
         * @param {Road} road
         * @param {Car} car
         * @param {number} carIndex
         * @returns {number}
         */
        function decideNextLane(road, car, carIndex) {
            var spaceInCurrentLane;
            var spaceInOtherLane;
            if (car.wrecked) {
                return car.lane;
            }
            spaceInCurrentLane = spaceAvailableInLane(road, car.lane, carIndex);
            if (spaceInCurrentLane > car.length * 10) {
                return car.lane; // plenty of space in current lane.
            }
            if (car.lane < road.numLanes - 1) {
                spaceInOtherLane = spaceAvailableInLane(road, car.lane + 1, carIndex);
                if (spaceInOtherLane > spaceInCurrentLane) {
                    return car.lane + 1;
                }
            }
            if (car.lane > 0) {
                spaceInOtherLane = spaceAvailableInLane(road, car.lane - 1, carIndex);
                if (spaceInOtherLane > spaceInCurrentLane) {
                    return car.lane - 1;
                }
            }
            return car.lane;
        }

        /**
         * @param {Road} road
         * @param {Car} car
         */
        function simulateNewtonMechanics(road, car) {
            car.speed = Math.min(car.maxSpeed, Math.max(0, car.speed + car.accel * deltaT));
            car.position += car.speed * deltaT + 0.5 * car.accel * deltaTSquared;

            while (car.position > road.length) {
                car.position -= road.length;
            }
            while (car.position < 0) {
                car.position += road.length;
            }
        }

        /**
         * @param {Road} road
         * @param {Car} car
         * @param {number} carIndex
         * @returns {Function|null}
         */
        function simulateCar(road, car, carIndex) {
            car.lane = decideNextLane(road, car, carIndex);
            var nextAccel = decideAcceleration(road, car, carIndex);
            if (car.wrecked) {
                car.wreckTTL -= deltaT;
                if (0 >= car.wreckTTL) {
                    road.cars.splice(carIndex, 1);
                }
                return null;
            }
            //= nextLane;
            car.accel = nextAccel;
            simulateNewtonMechanics(road, car);

        }

        function simulateStep(world) {
            var i, j;
            var carUpdater;
            var carUpdaters;
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
            initElems();
            // Store the current transformation matrix
            _context.save();

            // Use the identity matrix while clearing the canvas
            _context.setTransform(1, 0, 0, 1, 0, 0);
            _context.clearRect(0, 0, width, height);
            _context.putImageData(_backgroundImage, 0, 0);

            // Restore the transform
            _context.restore();
        }


        function initElems() {
            if (_canvas) {
                return;
            }
            _canvas = /** @type {HTMLCanvasElement} */ document.getElementById('canvas');
            _context = _canvas.getContext('2d');
            _fpsElem = document.getElementById('fps');
        }

        function init() {
            var margin = 20 * consts.LANES_PER_ROAD;
            initElems();
            width = _canvas.width;
            height = _canvas.height;
            world = new World(_canvas.width, _canvas.height);
            world.roads.push(Road.random([
                new Vector(margin, margin),
                new Vector(width - margin, margin),
                new Vector(width - margin, height - margin),
                new Vector(margin, height - margin),
                new Vector(margin, margin)
            ]));
            _context.setTransform(1, 0, 0, 1, 0, 0);
            _context.clearRect(0, 0, width, height);
            _backgroundImage = drawBackground(_canvas, _context, world);
            //resetCanvas();
            stop();
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
                }

                function updateDeltaT() {
                    /** @type {number} */
                    var now = Date.now();
                    /** @type {number} */
                    var elapsed = now - (lastRedrawTime ? lastRedrawTime : now);
                    /** @type {number} */
                    var averageElapsed = elapsedQueue.getResult();
                    /** @type {number} */
                    var fps = Math.floor(1000.0 / averageElapsed);
                    lastRedrawTime = Date.now();
                    elapsedQueue.add(elapsed);
                    deltaT = Math.min(elapsed / 1000.0, 1.0 / consts.TARGET_FPS);
                    deltaTSquared = deltaT * deltaT;
                    drawFPS(fps);
                }

                function loop() {
                    updateDeltaT();
                    resetCanvas();
                    drawWorld(context, world);
                    simulateStep(world);

                    window.setTimeout(function () {
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
            },

            getWorld: function () { return world; }
        };


    });
