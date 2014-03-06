/*global require */
require(['./jammed'], function (jammed) {
    'use strict';
    window.jammed = jammed;
    window.setTimeout(function () {
        jammed.init();
        jammed.start();
    }, 100);
});
