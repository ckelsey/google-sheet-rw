"use strict";
var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var path = require("path")
var exec = require('child_process').exec
const { spawn } = require('child_process');

var paths = {
    watch: ["./*.ts", "./src/*.*"],
}

const getThis = (el, path, emptyVal) => {
    if (path && path.toString().split) {
        path = [el].concat(path.toString().split(`.`))
    } else {
        path = [el]
    }

    let result = path.reduce(function (accumulator, currentValue) {
        if (accumulator === undefined) {
            return emptyVal
        }

        if (currentValue.indexOf(`.`) === -1 && currentValue.indexOf(`(`) > -1) {
            let argsString = ''

            let argsObj = /\((.*?)\)/g.exec(currentValue)

            if (argsObj) {
                argsString = argsObj[1] || ``
            }

            let args = argsString.split(`,`).map((arg) => { return arg.trim() })
            let functionName = currentValue.split(`(`)[0]

            if (typeof accumulator[functionName] === `function`) {
                let result = accumulator[functionName].apply(accumulator, args)
                return result
            }
        }

        if (currentValue) {
            return accumulator[currentValue]
        } else {
            return accumulator
        }

    })

    if (result === undefined) {
        return emptyVal
    }

    return result
}

gulp.task('server', function () {
    browserSync.init({
        server: {
            baseDir: "./demo"
        },
        https: true,
        single: true
    });
})

function pack() {
    console.log(__dirname)
    return new Promise(resolve => {

        const child = spawn(`webpack`, [`--config`, path.join(__dirname, 'webpack.config.js'), `--progress`]);

        child.stdout.on('data', (data) => {
            console.log(`${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        child.on('exit', function (code, signal) {
            exec(`osascript -e 'display notification "Complete" with title "WEBPACK"'`)
            exec(`cp ./dist/google-sheets-rw.min.js ./demo`)
            resolve()
        });
    })
}

gulp.task('set-dev-env', function () {
    return process.env.NODE_ENV = 'development';
});

gulp.task('set-prod-env', function () {
    return process.env.NODE_ENV = 'production';
});

gulp.task('publish', () => {
    console.log(`START WEBPACK`)

    return pack()
})

gulp.task("dev", [`set-dev-env`, `publish`], function () {
    gulp.watch(paths.watch, [`set-dev-env`, `publish`]);
});

gulp.task("build", function (cb) {
    gulpSequence(`set-prod-env`, `publish`)(cb)
});

gulp.task("default", [
    "server",
    "dev"
], function () { });