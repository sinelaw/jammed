/*global define */
define(['./mathUtil', './consts'], function (mathUtil, consts) {
    "use strict";


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

    Car.random = function () {
        return new Car(mathUtil.randomInt(consts.MAX_CAR_LENGTH, consts.MIN_CAR_LENGTH), 0, 0);
    };

    return Car;
});
