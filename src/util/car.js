/*global define */
/**
 * @module Car
 */
define(['./mathUtil', './consts'], function (mathUtil, consts) {
    "use strict";

    /**
     * @param {number} length
     * @param {number} position
     * @param {number} lane
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, lane: number, maxSpeed: number, accel: number, maxAcceleration:number, color:string, minKeepingTime: number}}
     */
    function Car(length, position, lane, speed) {
        this.length = length;
        this.position = position;
        this.speed = speed;
        this.lane = lane;
        this.accel = 0;
        this.maxSpeed = mathUtil.randomInt(consts.MAX_SPEED, consts.MIN_MAX_SPEED);
        this.maxAcceleration = mathUtil.randomInt(consts.MAX_ACCELERATION, consts.MIN_MAX_ACCELERATION);
        this.color = mathUtil.randomColor();
        this.wrecked = false;
        this.minKeepingTime = mathUtil.randomInt(consts.MAX_KEEPING_TIME, consts.MIN_KEEPING_TIME);
    }

    Car.prototype.wreck = function () {
        this.accel = 0;
        this.speed = 0;
        this.wrecked = true;
    };

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {Vector} position
     */
    Car.prototype.draw = function (context, position) {
        var style = this.accel > 0 ? 'green' : 'red'; //this.color;
        if (this.wrecked) {
            style = consts.WRECKED_CAR_STYLE;
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
        context.fillRect(position.x, position.y, this.length, this.length);
        //context.fillRect(position.x, position.y, 2 + this.speed, 2);
    };

    /**
     * @returns {Car}
     */
    Car.random = function () {
        return new Car(mathUtil.randomInt(consts.MAX_CAR_LENGTH, consts.MIN_CAR_LENGTH), 0, 0, 0);
    };

    return Car;
});
