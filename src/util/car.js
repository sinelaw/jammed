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
        loadCar('img/van.png'),
        loadCar('img/jeep.png'),
        loadCar('img/car1.png'),
        loadCar('img/car2.png'),
        loadCar('img/lorry.png'),
        loadCar('img/car3.png')
    ];

    /**
     * @param {number} position
     * @param {number} lane
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, lane: number, maxSpeed: number, accel: number, maxAcceleration:number, color:string, minKeepingTime: number, image: Image}}
     */
    function Car(position, lane, speed) {
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
        this.length = this.image.width / 3;//length;
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
        var widthHeightRatio = this.image.height / this.image.width;
        var style = this.color; //this.accel > 0 ? 'green' : 'red'; //this.color;
        if (this.wrecked) {
            style = consts.WRECKED_CAR_STYLE;
        }
        context.translate(this.length, 0);
        context.scale(-1, 1);
        context.drawImage(this.image, this.length/2.0, 0, this.length, this.length * widthHeightRatio);
    };

    /**
     * @returns {Car}
     */
    Car.random = function () {
        return new Car(0, 0, 0);
    };

    return Car;
});
