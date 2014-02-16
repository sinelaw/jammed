/*global define */
define(['./mathUtil', './vector', './car', './consts'], function(mathUtil, Vector, Car, consts) {
    "use strict";

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
        this.length = Vector.getLength(points);
        this.color = 'rgba(' + [mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), mathUtil.randomInt(255, 200), 1].join(',') + ')';
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
        var i, point, prevPoint;
        if (!this.points.length) {
            return;
        }
        context.fillStyle = this.color;
//        context.shadowColor = "#ffffff";
//        context.shadowBlur = -width / 2;
        for (i = 1; i < this.points.length; i += 1) {
            prevPoint = this.points[i - 1].min(this.points[i]);
            point = this.points[i].max(this.points[i - 1]);
            context.fillRect(prevPoint.x, prevPoint.y, point.x - prevPoint.x + this.width, point.y - prevPoint.y + this.width);
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
        Vector.forEachSegment(this.points, function (prevPoint, point) {
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
     * @param {Road} road
     */
    function addRandomCar(road) {
        var lastCar = road.cars.length ? road.cars[road.cars.length - 1] : null;
        var lastCarPos = lastCar ? lastCar.position : 0;
        var lastCarLength = lastCar ? lastCar.length : 0;
        var car = Car.random();
        car.position = lastCarPos + lastCarLength + 1 + mathUtil.randomInt(consts.MIN_KEEPING_DISTANCE);
        road.cars.push(car);
    }

    Road.random = function (width, height) {
        var i, numSegments = mathUtil.randomInt(consts.MAX_RANDOM_ROAD_POINTS) + 2;
        /** @type {Array.<Vector>} */
        var points = [Vector.random(width, height)];
        var prevPoint = points[0];
        /** @type {Vector} */
        var point;
        var road;
        for (i = 0; i < numSegments; i += 1) {
            point = Vector.random(width, height).minus(prevPoint);
            point = prevPoint.plus(new Vector(point.x * (i % 2), point.y * ((i + 1) % 2)));
            points.push(point);
            prevPoint = point;
        }
        //points.push(points[0]); // close the loop
        road = new Road(points, [], consts.ROAD_WIDTH);

        for (i = 0; i < consts.NUM_RANDOM_CARS_PER_ROAD; i += 1) {
            addRandomCar(road);
        }
        road.sortCars();
        return road;
    };

    return Road;
});
