/*global define */
/**
 * @module Car
 */
define(['./mathUtil', './consts'], function (mathUtil, consts) {
    "use strict";

    /**
     * @param {string} filename
     * @returns {Image}
     */
    function loadCar(filename) {
        var carImage = new Image();
        carImage.src = filename;
        return carImage;
    }

    var carImages = [
        loadCar('img/car_yellow.png'),
        loadCar('img/car_green.png'),
        loadCar('img/car_red.png'),
        loadCar('img/car_purple.png'),
        loadCar('img/car.png')
    ];

                    /**
     * @param {number} length
     * @param {number} position
     * @param {number} lane
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, lane: number, maxSpeed: number, accel: number, maxAcceleration:number, color:string, minKeepingTime: number, image: Image}}
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
        this.image = carImages[~~(this.maxSpeed / consts.MAX_SPEED * carImages.length)];
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
    Car.prototype.draw = function (context) {
        var style = this.color; //this.accel > 0 ? 'green' : 'red'; //this.color;
        if (this.wrecked) {
            style = consts.WRECKED_CAR_STYLE;
        }
        //context.fillStyle = style;
        // This really slows things down:
//            if (Math.abs(car.accel) < DELTA) {
//                context.shadowColor = 'black';
//            } else if (car.accel < 0) {
//                context.shadowColor = 'red';
//            } else {
//                context.shadowColor = 'green';
//            }
//            context.shadowBlur = 4;
//        context.fillRect(this.length*3/4, 0, this.length/4, this.length / 2);

//        context.strokeStyle= '#eeeeee';
//        context.strokeRect(-this.length/2, 0, this.length, this.length/2);
        context.drawImage(this.image, -this.length/2, 0);

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
