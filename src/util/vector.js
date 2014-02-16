/*global define */
define(['./mathUtil'], function (mathUtil) {
    "use strict";

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
    Vector.forEachSegment = function (points, f) {
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
    };

    /**
     * @param {Array.<Vector>} points
     * @returns {number}
     */
    Vector.getLength = function (points) {
        var length = 0;
        Vector.forEachSegment(points, function (prevPoint, point) {
            length += point.minus(prevPoint).getSize();
        });
        return length;
    };


    /**
     * @param {number} maxX
     * @param {number} maxY
     * @returns {Vector}
     */
    Vector.random = function(maxX, maxY) {
        return new Vector(mathUtil.randomInt(maxX), mathUtil.randomInt(maxY));
    };

    return Vector;
});

