/*global define */
/**
 * @module Road
 */
define(['./mathUtil', './vector', './car', './consts'], function (mathUtil, Vector, Car, consts) {
    "use strict";

    var laneWidth = 6;

    /**
     * @param {Road} road
     * @param {number} lane
     * @returns {Car}
     */
    function getLastCarInLane(road, lane) {
        var i;
        var car;
        if (road.cars.length > 0) {
            for (i = road.cars.length - 1; i >= 0; i -= 1) {
                car = road.cars[i];
                if (car.lane === lane) {
                    return car;
                }
            }
        }
        return null;
    }

    /**
     * @param {Road} road
     * @param {number} lane
     */
    function addRandomCar(road, lane) {
        var lastCar = getLastCarInLane(road, lane);
        var lastCarPos = lastCar ? lastCar.position : 0;
        var lastCarLength = lastCar ? lastCar.length : 0;
        var car = Car.random();
        car.position = lastCarPos + lastCarLength + 1 + mathUtil.randomInt(consts.MIN_KEEPING_DISTANCE);
        road.addCar(car, lane);
    }

    /**
     * @param {Array.<Vector>} points
     * @param {Array.<Car>} cars
     * @param {number} numLanes
     * @constructor
     * @returns {{ points: Array.<Vector>, cars: Array.<Car>, numLanes: number, length: number, color: string }}
     */
    function Road(points, cars, numLanes) {
        this.points = points;
        this.cars = cars;
        this.numLanes = numLanes;
        this.length = Vector.getLength(points);
        this.color = 'rgba(' + [mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), 1].join(',') + ')';
    }

    /**
     * @param {function(Road, Car, number)} f
     */
    Road.prototype.forEachCar = function (f) {
        /** @type {number} */
        var i;
        if (this.cars.length < 1) {
            return;
        }
        for (i = 0; i < this.cars.length; i += 1) {
            f(this, this.cars[i], i);
        }
    };

    /**
     * @param {CanvasRenderingContext2D} context
     */
    Road.prototype.draw = function (context) {
        var laneNum, laneOffset;
        var i;
        /** @type {Vector} */
        var point;
        /** @type {Vector} */
        var prevPoint;
        var segment;
        if (!this.points.length) {
            return;
        }
        context.fillStyle = this.color;
//        context.shadowColor = "#ffffff";
//        context.shadowBlur = -width / 2;
        for (i = 1; i < this.points.length; i += 1) {
            prevPoint = this.points[i - 1].min(this.points[i]);
            point = this.points[i].max(this.points[i - 1]);
            segment = point.minus(prevPoint);
            for (laneNum = 0; laneNum < this.numLanes; laneNum += 1) {
                laneOffset = calcLaneOffset(segment, laneNum * laneWidth);
                context.fillRect(prevPoint.x + laneOffset.x,
                    prevPoint.y + laneOffset.y,
                    segment.x + laneWidth,
                    segment.y + laneWidth);
            }
        }
    };

    Road.prototype.sortCars = function () {
        this.cars = this.cars.sort(function (a, b) {
            return a.position - b.position;
        });
    };

    function calcLaneOffset(unitSegment, laneStart) {
        return new Vector(Math.abs(unitSegment.x) < consts.DELTA ? laneStart : 0,
            Math.abs(unitSegment.y) < consts.DELTA ? laneStart : 0);
    }

    /** @param {number} roadPosition
     *  @param {number} laneNum
     *  @returns {Vector}
     */
    Road.prototype.roadToWorldPosition = function (roadPosition, laneNum) {
        /** @type {Vector} */
        var targetSegmentStart;
        /** @type {Vector} */
        var segment;
        var unitSegment;
        var pos = roadPosition;
        var laneStart;
        Vector.forEachSegment(this.points, function (prevPoint, point) {
            var segmentSize;
            segment = point.minus(prevPoint);
            segmentSize = segment.getSize();
            targetSegmentStart = prevPoint;
            if (segmentSize > pos) {
                return true;
            }
            pos -= segmentSize;
        });
        if (targetSegmentStart && segment) {
            laneStart = laneNum * laneWidth;
            unitSegment = segment.toUnit();
            return targetSegmentStart.plus(unitSegment.mul(pos)).plus(
                calcLaneOffset(unitSegment, laneStart));
        }
        return null;
    };

    /**
     * @param {Car} car
     * @param {number} lane
     */
    Road.prototype.addCar = function (car, lane) {
        car.lane = lane;
        this.cars.push(car);
    };

    Road.random = function (width, height) {
        var i, j, numSegments = mathUtil.randomInt(consts.MAX_RANDOM_ROAD_POINTS) + 2;
        /** @type {Array.<Vector>} */
        var points = [Vector.random(width, height)];
        var prevPoint = points[0];
        /** @type {Vector} */
        var point;
        var road;
        for (i = 0; i < numSegments; i += 1) {
            do {
                point = Vector.random(width, height).minus(prevPoint);
            } while (point.getSize() < 15);
            point = prevPoint.plus(new Vector(point.x * (i % 2), point.y * ((i + 1) % 2)));
            points.push(point);
            prevPoint = point;
        }
        //points.push(points[0]); // close the loop
        road = new Road(points, [], consts.LANES_PER_ROAD);

        for (j = 0; j < road.numLanes; j += 1) {
            for (i = 0; i < consts.NUM_RANDOM_CARS_PER_ROAD; i += 1) {
                addRandomCar(road, j);
            }
        }
        road.sortCars();
        return road;
    };

    return Road;
});
