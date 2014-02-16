/*global define */
define([], function () {
    'use strict';

    var me = {
        /**
         * @param {number} max
         * @param {number=} min
         * @param {boolean=} allowNegative
         * @returns {number}
         */
        randomInt: function (max, min, allowNegative) {
            var sign = (allowNegative && (Math.random() > 0.5)) ? -1 : 1;
            min = (min || 0);
            return sign * (min + Math.floor(Math.random() * (max - min)));
        },

        /**
         * @returns {string}
         */
        randomHexDigit: function () {
            var digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
            return digits[me.randomInt(digits.length)];
        },
        /**
         * @returns {string}
         */
        randomColor: function () {
            return '#' + me.randomHexDigit() + me.randomHexDigit() + me.randomHexDigit() + me.randomHexDigit() + me.randomHexDigit() + me.randomHexDigit();
        }

    };
    return me;
});