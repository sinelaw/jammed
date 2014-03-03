/*global define */
/**
 * @module Road
 */
define(['./mathUtil', './vector', './car', './consts'], function (mathUtil, Vector, Car, consts) {
    "use strict";

    var CENTER = new Vector(consts.WIDTH, consts.HEIGHT).mul(0.5);
    var MIN_LANE_RADIUS = + 3 * CENTER.getSize() / 5;

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
        this.length = getLaneRadius(0) * 2 * consts.PI;// //Vector.getLength(points);
        this.color = 'rgba(' + [mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), 1].join(',') + ')';
    }

    /**
     * @param {function(Road, Car, number):T} f
     * @returns {Array.<T>}
     * @template T
     */
    Road.prototype.forEachCar = function (f) {
        /** @type {number} */
        var i;
        var result = [];
        if (this.cars.length < 1) {
            return result;
        }
        for (i = 0; i < this.cars.length; i += 1) {
            result.push(f(this, this.cars[i], i));
        }
        return result;
    };

    function getLaneRadius(laneNum) {
        return laneNum * consts.LANE_WIDTH + MIN_LANE_RADIUS;
    }

    /**
     * @param {CanvasRenderingContext2D} context
     */
    Road.prototype.draw = function (context) {
        var laneNum, laneOffset;
        context.strokeStyle = this.color;
        for (laneNum = 0; laneNum < this.numLanes; laneNum += 1) {
            context.arc(CENTER.x, CENTER.y, getLaneRadius(laneNum), 0, consts.PI * 2);
            context.stroke();
        }
//        var laneNum, laneOffset;
//        var i;
//        /** @type {Vector} */
//        var point;
//        /** @type {Vector} */
//        var prevPoint;
//        /** @type {Vector} */
//        var segment;
//        if (!this.points.length) {
//            return;
//        }
//        context.fillStyle = this.color;
//        context.strokeStyle = this.color;
////        context.shadowColor = "#ffffff";
////        context.shadowBlur = -width / 2;
//        for (i = 1; i < this.points.length; i += 1) {
//            prevPoint = this.points[i - 1];
//            point = this.points[i];
//            segment = point.minus(prevPoint);
//            for (laneNum = 0; laneNum < this.numLanes; laneNum += 1) {
//                laneOffset = calcLaneOffset(segment, 1 + laneNum * consts.LANE_WIDTH);
////                context.fillRect(prevPoint.x + laneOffset.x,
////                    prevPoint.y + laneOffset.y,
////                    segment.x + laneWidth,
////                    segment.y + laneWidth);
//                context.beginPath();
//                context.moveTo(prevPoint.x + laneOffset.x, prevPoint.y + laneOffset.y);
//                context.lineTo(point.x + laneOffset.x, point.y + laneOffset.y);
//                context.stroke();
//            }
//        }
    };

    Road.prototype.sortCars = function () {
        this.cars = this.cars.sort(function (a, b) {
            return a.position - b.position;
        });
    };

    /**
     * @param {Vector} segment
     * @param {number} laneStart
     * @returns {Vector}
     */
    function calcLaneOffset(segment, laneStart) {
        return segment.normal().mul(laneStart);
    }

    /** @param {number} roadPosition
     *  @param {number} laneNum
     *  @returns {translate: Vector, tangent: Vector}
     */
    Road.prototype.roadToWorldPosition = function (roadPosition, laneNum) {
        var angle = ((roadPosition / this.length) * 2 * consts.PI);
        var pos = (new Vector(Math.cos(angle), Math.sin(angle))).mul(getLaneRadius(laneNum + 1)).plus(CENTER);
        return {
            translate: pos,
            tangent: pos.minus(CENTER).normal().mul(-1)
        };
//        var unitSegment;
//        /** @type {Vector} */
//        var targetSegmentStart;
//        /** @type {Vector} */
//        var segment;
//        var pos = roadPosition;
//        Vector.forEachSegment(this.points, function (prevPoint, point) {
//            var segmentSize;
//            segment = point.minus(prevPoint);
//            segmentSize = segment.getSize();
//            targetSegmentStart = prevPoint;
//            if (segmentSize > pos) {
//                return true;
//            }
//            pos -= segmentSize;
//        });
//        if (segment) {
//            unitSegment = segment.unit();
//            return {
//                translate: targetSegmentStart.plus(unitSegment.mul(pos)).plus(
//                    calcLaneOffset(unitSegment, 1 + (laneNum * consts.LANE_WIDTH))),
//                tangent: unitSegment
//            };
//        }
//        return null;
    };

    /**
     * @param {Car} car
     * @param {number} lane
     */
    Road.prototype.addCar = function (car, lane) {
        car.lane = lane;
        this.cars.push(car);
    };

    /**
     * @param {number} width
     * @param {number} height
     * @returns {Array.<Vector>}
     */
    Road.getRandomRoadPoints = function(width, height) {
        var i;
        var numSegments = mathUtil.randomInt(consts.MAX_RANDOM_ROAD_POINTS) + 2;
        /** @type {Array.<Vector>} */
        var points = [Vector.random(width, height)];
        var prevPoint = points[0];
        /** @type {Vector} */
        var point;
        for (i = 0; i < numSegments; i += 1) {
            do {
                point = Vector.random(width, height).minus(prevPoint);
            } while (point.getSize() < 15);
            point = prevPoint.plus(new Vector(point.x * (i % 2), point.y * ((i + 1) % 2)));
            points.push(point);
            prevPoint = point;
        }
        return points;
    };

    /**
     * @param {Array.<Vector>} points
     * @returns {Road}
     */
    Road.random = function(points) {
        var i, laneNum;
        var road = new Road(points, [], consts.LANES_PER_ROAD);
        //var points = getRandomRoadPoints(width, height);
        //points.push(points[0]); // close the loop

        for (laneNum = 0; laneNum < road.numLanes; laneNum += 1) {
            for (i = 0; i < consts.NUM_RANDOM_CARS_PER_ROAD; i += 1) {
                addRandomCar(road, laneNum);
            }
        }
        road.sortCars();
        return road;
    };

    return Road;
});
